import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, COACHING_SYSTEM, buildCoachingUserPrompt } from "@/lib/prompts";
import Anthropic from "@anthropic-ai/sdk";
import { parseAiJson } from "@/lib/parseAiJson";

// ─── GET: 코칭 히스토리 목록 조회 ───────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await prisma.coachingHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // JSON 문자열 → 배열 파싱 (깨진 레코드는 스킵)
  const parsed = history.flatMap((h) => {
    try {
      return [{
        id: h.id,
        strengths: JSON.parse(h.strengths),
        mistakes: JSON.parse(h.mistakes),
        goals: JSON.parse(h.goals),
        createdAt: h.createdAt,
      }];
    } catch {
      console.warn(`코칭 히스토리 파싱 실패 (id: ${h.id}) — 스킵`);
      return [];
    }
  });

  // 오늘 잔여 횟수
  const today = new Date().toISOString().slice(0, 10);
  const usageLog = await prisma.apiUsageLog.findUnique({
    where: {
      userId_type_date: {
        userId: session.user.id,
        type: "coaching",
        date: today,
      },
    },
  });
  const remaining = 3 - (usageLog?.count ?? 0);

  return Response.json({ history: parsed, remaining });
}

// ─── POST: AI 코칭 생성 + 저장 ─────────────────────────
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── 3회/일 제한 확인 ─────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const usageLog = await prisma.apiUsageLog.findUnique({
    where: {
      userId_type_date: {
        userId: session.user.id,
        type: "coaching",
        date: today,
      },
    },
  });

  if (usageLog && usageLog.count >= 3) {
    return Response.json({
      error: "오늘 AI 코칭 생성 횟수(3회)를 초과했습니다.",
      remaining: 0,
    }, { status: 429 });
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

  if (trades.length < 10) {
    return Response.json({
      error: "최근 6개월 매매 기록이 10건 이상 필요합니다.",
      totalCount: trades.length,
    }, { status: 400 });
  }

  // ─── 보유종목 조회 ────────────────────────────────────
  const holdings = await prisma.holding.findMany({
    where: { account: { userId: session.user.id } },
    select: {
      ticker: true,
      name: true,
      avgPrice: true,
      quantity: true,
      sectorAuto: true,
      sectorManual: true,
    },
  });

  // ─── 통계 계산 ────────────────────────────────────────
  const buyTrades = trades.filter((t) => t.type === "BUY");
  const sellTrades = trades.filter((t) => t.type === "SELL");

  const usedSellIds = new Set<number>();
  const matchedTrades: {
    pnlRate: number;
    holdingDays: number;
    reasonTags: string[];
    emotion: string | null;
  }[] = [];

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

  // 태그별 성과
  const tagStats: Record<string, { count: number; totalPnl: number }> = {};
  matchedTrades.forEach((t) => {
    (t.reasonTags ?? []).forEach((tag) => {
      if (!tagStats[tag]) tagStats[tag] = { count: 0, totalPnl: 0 };
      tagStats[tag].count++;
      tagStats[tag].totalPnl += t.pnlRate;
    });
  });
  const topTags = Object.entries(tagStats)
    .map(([tag, s]) => ({
      tag,
      count: s.count,
      avgPnl: Math.round((s.totalPnl / s.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // 감정별 성과
  const emotionStats: Record<string, { count: number; totalPnl: number }> = {};
  matchedTrades.forEach((t) => {
    if (!t.emotion) return;
    if (!emotionStats[t.emotion]) emotionStats[t.emotion] = { count: 0, totalPnl: 0 };
    emotionStats[t.emotion].count++;
    emotionStats[t.emotion].totalPnl += t.pnlRate;
  });
  const emotionSummary = Object.entries(emotionStats)
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

    const userPrompt = buildCoachingUserPrompt({
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
      max_tokens: 2048,
      system: COACHING_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const { input_tokens, output_tokens } = message.usage;

    const result = parseAiJson<{ strengths: string[]; mistakes: string[]; goals: string[] }>(text);
    if (!result) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    // ─── DB 저장 ────────────────────────────────────────
    const coaching = await prisma.coachingHistory.create({
      data: {
        userId: session.user.id,
        strengths: JSON.stringify(result.strengths),
        mistakes: JSON.stringify(result.mistakes),
        goals: JSON.stringify(result.goals),
      },
    });

    // ─── 사용 횟수 + 토큰 증가 ──────────────────────────
    await prisma.apiUsageLog.upsert({
      where: {
        userId_type_date: {
          userId: session.user.id,
          type: "coaching",
          date: today,
        },
      },
      create: {
        userId: session.user.id,
        type: "coaching",
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

    const remaining = 3 - ((usageLog?.count ?? 0) + 1);

    return Response.json({
      id: coaching.id,
      strengths: result.strengths,
      mistakes: result.mistakes,
      goals: result.goals,
      createdAt: coaching.createdAt,
      remaining,
    });
  } catch (err) {
    console.error("Coaching generation error:", err);
    return Response.json({ error: "AI 코칭 생성에 실패했습니다." }, { status: 500 });
  }
}
