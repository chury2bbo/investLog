import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  CLAUDE_MODEL,
  PERSONALITY_SUMMARY_SYSTEM,
  buildPersonalitySummaryUserPrompt,
  PERSONALITY_LEVEL1_SYSTEM,
  buildPersonalityLevel1Prompt,
} from "@/lib/prompts";
import Anthropic from "@anthropic-ai/sdk";
import { parseAiJson } from "@/lib/parseAiJson";
import { getUsdKrwRate } from "@/lib/yahoo";

const DAILY_LIMIT = 1;

/** 한국 시간(KST) 기준 YYYY-MM-DD 키 */
function getKstDateKey(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const lastOnly = searchParams.get("last") === "true";

  const today = getKstDateKey();

  // ─── 마지막 진단 결과 조회 (초기 로딩용) ─────────────────
  if (lastOnly) {
    const last = await prisma.personalityResult.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    if (last) {
      return Response.json({
        type: last.type,
        summary: last.summary,
        winRate: last.winRate,
        avgHoldingDays: last.avgHoldingDays,
        lossRatio: last.lossRatio,
        level: last.winRate == null ? 1 : 2,
        analyzedAt: last.dateKey,
      });
    }
    return Response.json({ empty: true });
  }

  // ─── 일일 호출 제한 확인 ──────────────────────────────
  const usage = await prisma.apiUsageLog.findUnique({
    where: {
      userId_type_date: {
        userId: session.user.id,
        type: "personality_summary",
        date: today,
      },
    },
  });

  if (usage && usage.count >= DAILY_LIMIT) {
    return Response.json(
      { error: "투자성향 진단은 하루 1회까지 가능합니다.", limitReached: true },
      { status: 429 }
    );
  }

  // ─── 매매 데이터 조회 (최근 6개월) ─────────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const trades = await prisma.tradeLog.findMany({
    where: {
      account: { userId: session.user.id },
      date: { gte: sixMonthsAgo },
    },
    orderBy: { date: "asc" },
  });

  // ─── 보유종목 조회 ────────────────────────────────────
  const holdings = await prisma.holding.findMany({
    where: { account: { userId: session.user.id } },
    select: {
      ticker: true,
      name: true,
      country: true,
      avgPrice: true,
      quantity: true,
      sectorAuto: true,
      sectorManual: true,
    },
  });

  // ─── Level 1: 매매 5건 미만 + 보유 종목 1개 이상 ─────
  if (trades.length < 5) {
    if (holdings.length === 0) {
      return Response.json({
        locked: true,
        totalCount: trades.length,
        remaining: 5 - trades.length,
      });
    }
    return await runLevel1Diagnosis({
      userId: session.user.id,
      today,
      holdings,
    });
  }

  // ─── 통계 계산 ────────────────────────────────────────
  const buyTrades = trades.filter((t) => t.type === "BUY");
  const sellTrades = trades.filter((t) => t.type === "SELL");

  const usedSellIds = new Set<number>();
  const matchedTrades: { pnlRate: number; holdingDays: number; reasonTags: string[]; emotion: string | null }[] = [];

  buyTrades.forEach((buy) => {
    const sell = sellTrades.find(
      (s) => s.ticker === buy.ticker && s.accountId === buy.accountId && new Date(s.date) > new Date(buy.date) && !usedSellIds.has(s.id)
    );
    if (!sell) return;
    usedSellIds.add(sell.id);

    const pnlRate = ((sell.price - buy.price) / buy.price) * 100;
    const holdingDays = Math.round(
      (new Date(sell.date).getTime() - new Date(buy.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    matchedTrades.push({
      pnlRate: Math.round(pnlRate * 100) / 100,
      holdingDays,
      reasonTags: buy.reasonTags as string[],
      emotion: buy.emotion,
    });
  });

  const winCount = matchedTrades.filter((t) => t.pnlRate > 0).length;
  const winRate = matchedTrades.length > 0
    ? Math.round((winCount / matchedTrades.length) * 100 * 10) / 10
    : 0;
  const avgHoldingDays = matchedTrades.length > 0
    ? Math.round(matchedTrades.reduce((s, t) => s + t.holdingDays, 0) / matchedTrades.length)
    : 0;
  const lossCount = matchedTrades.filter((t) => t.pnlRate < 0).length;
  const lossRatio = matchedTrades.length > 0
    ? Math.round((lossCount / matchedTrades.length) * 100 * 10) / 10
    : 0;

  // 태그 분포
  const tagCount: Record<string, { count: number; totalPnl: number }> = {};
  matchedTrades.forEach((t) => {
    (t.reasonTags ?? []).forEach((tag) => {
      if (!tagCount[tag]) tagCount[tag] = { count: 0, totalPnl: 0 };
      tagCount[tag].count++;
      tagCount[tag].totalPnl += t.pnlRate;
    });
  });
  const topTags = Object.entries(tagCount)
    .map(([tag, s]) => ({
      tag,
      count: s.count,
      avgPnl: Math.round((s.totalPnl / s.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 감정 분포
  const emotionCount: Record<string, { count: number; totalPnl: number }> = {};
  matchedTrades.forEach((t) => {
    if (!t.emotion) return;
    if (!emotionCount[t.emotion]) emotionCount[t.emotion] = { count: 0, totalPnl: 0 };
    emotionCount[t.emotion].count++;
    emotionCount[t.emotion].totalPnl += t.pnlRate;
  });
  const emotionSummary = Object.entries(emotionCount)
    .map(([emotion, s]) => ({
      emotion,
      count: s.count,
      avgPnl: Math.round((s.totalPnl / s.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  // 섹터 집중도
  const sectorMap: Record<string, number> = {};
  holdings.forEach((h) => {
    const sector = h.sectorManual ?? h.sectorAuto ?? "기타";
    sectorMap[sector] = (sectorMap[sector] ?? 0) + h.avgPrice * h.quantity;
  });
  const totalValue = Object.values(sectorMap).reduce((s, v) => s + v, 0);
  const sectorSummary = Object.entries(sectorMap)
    .sort(([, a], [, b]) => b - a)
    .map(([sector, val]) => `${sector}: ${totalValue > 0 ? Math.round((val / totalValue) * 100) : 0}%`);

  // 보유기간 분포
  const holdingRanges = [
    { label: "1주 이내", count: matchedTrades.filter((t) => t.holdingDays <= 7).length },
    { label: "1~4주", count: matchedTrades.filter((t) => t.holdingDays > 7 && t.holdingDays <= 28).length },
    { label: "1~3개월", count: matchedTrades.filter((t) => t.holdingDays > 28 && t.holdingDays <= 90).length },
    { label: "3개월+", count: matchedTrades.filter((t) => t.holdingDays > 90).length },
  ].filter((r) => r.count > 0);
  const holdingSummary = holdingRanges.map((r) => {
    const pct = Math.round((r.count / matchedTrades.length) * 100);
    return `${r.label}: ${pct}%`;
  });

  // 현재 보유종목 요약
  const holdingsList = holdings.map((h) => {
    const sector = h.sectorManual ?? h.sectorAuto ?? "기타";
    return `${h.name}(${h.ticker}) — ${sector}, ${h.quantity}주`;
  });

  // ─── Claude API 호출 ──────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const userPrompt = buildPersonalitySummaryUserPrompt({
      totalTrades: trades.length,
      buyCount: buyTrades.length,
      sellCount: sellTrades.length,
      matchedCount: matchedTrades.length,
      winRate,
      avgHoldingDays,
      lossRatio,
      topTags,
      emotionSummary,
      sectorSummary,
      holdingSummary,
      holdingsList,
    });

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: PERSONALITY_SUMMARY_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const { input_tokens, output_tokens } = message.usage;

    const result = parseAiJson<{ type: string; summary: string }>(text);
    if (!result) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    // ─── API 사용 로그 + 토큰 ────────────────────────────
    await prisma.apiUsageLog.upsert({
      where: {
        userId_type_date: {
          userId: session.user.id,
          type: "personality_summary",
          date: today,
        },
      },
      create: {
        userId: session.user.id,
        type: "personality_summary",
        date: today,
        count: 1,
        inputTokens: input_tokens,
        outputTokens: output_tokens,
      },
      update: {
        count: { increment: 1 },
        inputTokens: { increment: input_tokens },
        outputTokens: { increment: output_tokens },
      },
    });

    // ─── 마지막 결과 저장 ─────────────────────────────────
    await prisma.personalityResult.upsert({
      where: { userId_dateKey: { userId: session.user.id, dateKey: today } },
      create: {
        userId: session.user.id,
        dateKey: today,
        type: result.type,
        summary: result.summary,
        winRate,
        avgHoldingDays,
        lossRatio,
      },
      update: {
        type: result.type,
        summary: result.summary,
        winRate,
        avgHoldingDays,
        lossRatio,
      },
    });

    return Response.json({
      type: result.type,
      summary: result.summary,
      winRate,
      avgHoldingDays,
      lossRatio,
      level: 2,
      analyzedAt: today,
    });
  } catch (err) {
    console.error("Personality summary error:", err);
    return Response.json({ error: "유형 진단에 실패했습니다." }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════
// Level 1 — 보유 종목 기반 간이 진단
// ═══════════════════════════════════════════════════════════

interface Level1Holding {
  ticker: string;
  name: string;
  country: string;
  avgPrice: number;
  quantity: number;
  sectorAuto: string | null;
  sectorManual: string | null;
}

async function runLevel1Diagnosis({
  userId,
  today,
  holdings,
}: {
  userId: string;
  today: string;
  holdings: Level1Holding[];
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  // ─── 환율 조회 (실패 시 1400으로 폴백) ───────────────
  let usdRate = 1400;
  try {
    usdRate = await getUsdKrwRate();
  } catch {
    /* 폴백 유지 */
  }

  // ─── 예수금 잔고 조회 (KRW 환산은 단순 합산) ─────────
  const cashBalances = await prisma.cashBalance.findMany({
    where: { account: { userId } },
  });
  const cashKRW = cashBalances
    .filter((c) => c.currency === "KRW")
    .reduce((s, c) => s + c.amount, 0);
  const cashUSDinKRW = cashBalances
    .filter((c) => c.currency === "USD")
    .reduce((s, c) => s + c.amount * usdRate, 0);
  const totalCash = cashKRW + cashUSDinKRW;

  // ─── 보유 종목 평가금 (매수가 기준 단순 계산) ────────
  const holdingValueKRW = holdings.reduce((s, h) => {
    const v = h.avgPrice * h.quantity;
    return s + (h.country === "KR" ? v : v * usdRate);
  }, 0);
  const totalAsset = holdingValueKRW + totalCash;
  const cashRatio = totalAsset > 0 ? (totalCash / totalAsset) * 100 : 0;

  // ─── 섹터 분포 ────────────────────────────────────────
  const sectorMap: Record<string, number> = {};
  holdings.forEach((h) => {
    const sector = h.sectorManual ?? h.sectorAuto ?? "기타";
    const v = h.avgPrice * h.quantity * (h.country === "KR" ? 1 : usdRate);
    sectorMap[sector] = (sectorMap[sector] ?? 0) + v;
  });
  const topSectors = Object.entries(sectorMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([sector, val]) => ({
      sector,
      pct: holdingValueKRW > 0 ? (val / holdingValueKRW) * 100 : 0,
    }));

  const domesticCount = holdings.filter((h) => h.country === "KR").length;
  const foreignCount = holdings.filter((h) => h.country !== "KR").length;
  const holdingsList = holdings.slice(0, 15).map((h) => {
    const sector = h.sectorManual ?? h.sectorAuto ?? "기타";
    return `${h.name}(${h.ticker}) — ${sector}, ${h.quantity}주`;
  });

  try {
    const anthropic = new Anthropic({ apiKey });
    const userPrompt = buildPersonalityLevel1Prompt({
      totalHoldings: holdings.length,
      domesticCount,
      foreignCount,
      cashRatio,
      topSectors,
      holdingsList,
    });

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 384,
      system: PERSONALITY_LEVEL1_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const { input_tokens, output_tokens } = message.usage;

    const result = parseAiJson<{ type: string; summary: string }>(text);
    if (!result) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    // ─── 사용 로그 (Level 2와 같은 type 키 공유 — 1회/일 통합) ─
    await prisma.apiUsageLog.upsert({
      where: { userId_type_date: { userId, type: "personality_summary", date: today } },
      create: {
        userId,
        type: "personality_summary",
        date: today,
        count: 1,
        inputTokens: input_tokens,
        outputTokens: output_tokens,
      },
      update: {
        count: { increment: 1 },
        inputTokens: { increment: input_tokens },
        outputTokens: { increment: output_tokens },
      },
    });

    // ─── 결과 저장 ────────────────────────────────────────
    await prisma.personalityResult.upsert({
      where: { userId_dateKey: { userId, dateKey: today } },
      create: {
        userId,
        dateKey: today,
        type: result.type,
        summary: result.summary,
        winRate: null,
        avgHoldingDays: null,
        lossRatio: null,
      },
      update: {
        type: result.type,
        summary: result.summary,
        winRate: null,
        avgHoldingDays: null,
        lossRatio: null,
      },
    });

    return Response.json({
      type: result.type,
      summary: result.summary,
      winRate: null,
      avgHoldingDays: null,
      lossRatio: null,
      level: 1,
      analyzedAt: today,
    });
  } catch (err) {
    console.error("Level 1 personality error:", err);
    return Response.json({ error: "유형 진단에 실패했습니다." }, { status: 500 });
  }
}
