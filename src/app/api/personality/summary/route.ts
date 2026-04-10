import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, PERSONALITY_SUMMARY_SYSTEM, buildPersonalitySummaryUserPrompt } from "@/lib/prompts";
import Anthropic from "@anthropic-ai/sdk";

/** ISO 주차 키 생성: "2026-W15" 형식 */
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cacheOnly = searchParams.get("cacheOnly") === "true";

  const weekKey = getWeekKey(new Date());

  // ─── 캐시 확인 ────────────────────────────────────────
  const cached = await prisma.personalityCache.findUnique({
    where: {
      userId_weekKey: {
        userId: session.user.id,
        weekKey,
      },
    },
  });

  if (cached) {
    return Response.json({
      type: cached.type,
      summary: cached.summary,
      winRate: cached.winRate,
      avgHoldingDays: cached.avgHoldingDays,
      lossRatio: cached.lossRatio,
      cachedAt: cached.updatedAt.toISOString().slice(0, 10),
      weekKey,
    });
  }

  // 캐시만 조회 모드 — 캐시 없으면 빈 응답
  if (cacheOnly) {
    return Response.json({ empty: true, weekKey });
  }

  // ─── 매매 데이터 조회 ─────────────────────────────────
  const trades = await prisma.tradeLog.findMany({
    where: { account: { userId: session.user.id } },
    orderBy: { date: "asc" },
  });

  if (trades.length < 5) {
    return Response.json({
      locked: true,
      totalCount: trades.length,
      remaining: 5 - trades.length,
    });
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
  const matchedTrades: { pnlRate: number; holdingDays: number; reasonTags: string[]; emotion: string | null }[] = [];

  buyTrades.forEach((buy) => {
    const sell = sellTrades.find(
      (s) => s.ticker === buy.ticker && new Date(s.date) > new Date(buy.date) && !usedSellIds.has(s.id)
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

    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);

    // ─── API 사용 로그 + 토큰 ────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
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

    // ─── 캐시 저장 ──────────────────────────────────────
    await prisma.personalityCache.create({
      data: {
        userId: session.user.id,
        weekKey,
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
      cachedAt: new Date().toISOString().slice(0, 10),
      weekKey,
    });
  } catch (err) {
    console.error("Personality summary error:", err);
    return Response.json({ error: "유형 진단에 실패했습니다." }, { status: 500 });
  }
}
