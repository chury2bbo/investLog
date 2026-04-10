import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const minTrades = Number(searchParams.get("min") ?? "3");

  // 사용자의 모든 매매 기록 조회
  const trades = await prisma.tradeLog.findMany({
    where: { account: { userId: session.user.id } },
    orderBy: { date: "asc" },
  });

  const totalCount = trades.length;

  if (totalCount < minTrades) {
    const holdingCount = await prisma.holding.count({
      where: { account: { userId: session.user.id } },
    });
    return Response.json({
      locked: true,
      totalCount,
      remaining: minTrades - totalCount,
      holdingCount,
    });
  }

  // ─── 이유 태그 분포 ───────────────────────────────────

  const tagCountMap: Record<string, { buy: number; sell: number }> = {};
  trades.forEach((t) => {
    (t.reasonTags ?? []).forEach((tag: string) => {
      if (!tagCountMap[tag]) tagCountMap[tag] = { buy: 0, sell: 0 };
      if (t.type === "BUY") tagCountMap[tag].buy++;
      else tagCountMap[tag].sell++;
    });
  });

  const tagDistribution = Object.entries(tagCountMap)
    .map(([tag, counts]) => ({
      tag,
      buy: counts.buy,
      sell: counts.sell,
      total: counts.buy + counts.sell,
    }))
    .sort((a, b) => b.total - a.total);

  // ─── 매수→매도 매칭 ───────────────────────────────────

  const buyTrades = trades.filter((t) => t.type === "BUY");
  const sellTrades = trades.filter((t) => t.type === "SELL");
  const usedSellIds = new Set<number>();

  interface MatchedTrade {
    pnlRate: number;
    holdingDays: number;
    reasonTags: string[];
    emotion: string | null;
  }

  const matchedTrades: MatchedTrade[] = [];

  buyTrades.forEach((buy) => {
    const matchingSell = sellTrades.find(
      (s) => s.ticker === buy.ticker && new Date(s.date) > new Date(buy.date) && !usedSellIds.has(s.id)
    );
    if (!matchingSell) return;
    usedSellIds.add(matchingSell.id);

    const pnlRate = ((matchingSell.price - buy.price) / buy.price) * 100;
    const holdingDays = Math.round(
      (new Date(matchingSell.date).getTime() - new Date(buy.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    matchedTrades.push({
      pnlRate: Math.round(pnlRate * 100) / 100,
      holdingDays,
      reasonTags: buy.reasonTags as string[],
      emotion: buy.emotion,
    });
  });

  // ─── 이유별 평균 수익률 ───────────────────────────────

  const tagPnlMap: Record<string, { totalPnl: number; count: number }> = {};
  matchedTrades.forEach((t) => {
    (t.reasonTags ?? []).forEach((tag) => {
      if (!tagPnlMap[tag]) tagPnlMap[tag] = { totalPnl: 0, count: 0 };
      tagPnlMap[tag].totalPnl += t.pnlRate;
      tagPnlMap[tag].count++;
    });
  });

  const tagPnl = Object.entries(tagPnlMap)
    .map(([tag, data]) => ({
      tag,
      avgPnl: Math.round((data.totalPnl / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.avgPnl - a.avgPnl);

  // ─── 감정별 수익률 ────────────────────────────────────

  const emotionPnlMap: Record<string, { totalPnl: number; count: number }> = {};
  matchedTrades.forEach((t) => {
    if (!t.emotion) return;
    if (!emotionPnlMap[t.emotion]) emotionPnlMap[t.emotion] = { totalPnl: 0, count: 0 };
    emotionPnlMap[t.emotion].totalPnl += t.pnlRate;
    emotionPnlMap[t.emotion].count++;
  });

  const emotionPnl = Object.entries(emotionPnlMap)
    .map(([emotion, data]) => ({
      emotion,
      avgPnl: Math.round((data.totalPnl / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.avgPnl - a.avgPnl);

  // ─── 보유 기간 패턴 + 기간별 PnL ─────────────────────

  const rangeConfig = [
    { label: "1주 이내", min: 0, max: 7 },
    { label: "1~4주", min: 8, max: 28 },
    { label: "1~3개월", min: 29, max: 90 },
    { label: "3개월+", min: 91, max: Infinity },
  ];

  const holdingRanges = rangeConfig
    .map((range) => {
      const inRange = matchedTrades.filter(
        (t) => t.holdingDays >= range.min && t.holdingDays <= range.max
      );
      const count = inRange.length;
      const avgPnl = count > 0
        ? Math.round((inRange.reduce((s, t) => s + t.pnlRate, 0) / count) * 100) / 100
        : 0;
      return { label: range.label, count, avgPnl };
    })
    .filter((r) => r.count > 0);

  const avgHoldingDays = matchedTrades.length > 0
    ? Math.round(matchedTrades.reduce((a, b) => a + b.holdingDays, 0) / matchedTrades.length)
    : 0;

  // ─── 섹터 집중도 ──────────────────────────────────────

  const holdings = await prisma.holding.findMany({
    where: { account: { userId: session.user.id } },
    select: {
      avgPrice: true,
      quantity: true,
      sectorAuto: true,
      sectorManual: true,
    },
  });

  // 자동 섹터 기준 집계
  const autoSectorMap: Record<string, number> = {};
  holdings.forEach((h) => {
    const sector = h.sectorAuto ?? "미분류";
    autoSectorMap[sector] = (autoSectorMap[sector] ?? 0) + h.avgPrice * h.quantity;
  });
  const totalValue = Object.values(autoSectorMap).reduce((s, v) => s + v, 0);
  const sectorConcentration = Object.entries(autoSectorMap)
    .sort(([, a], [, b]) => b - a)
    .map(([sector, value]) => ({
      sector,
      pct: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
    }));

  // 내 섹터(수동) 기준 집계
  const manualSectorMap: Record<string, number> = {};
  holdings.forEach((h) => {
    const sector = h.sectorManual ?? "미지정";
    manualSectorMap[sector] = (manualSectorMap[sector] ?? 0) + h.avgPrice * h.quantity;
  });
  const manualSectorConcentration = Object.entries(manualSectorMap)
    .sort(([, a], [, b]) => b - a)
    .map(([sector, value]) => ({
      sector,
      pct: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
    }));

  // ─── 이유 태그 미입력 건수 ────────────────────────────

  const noTagCount = trades.filter(
    (t) => !t.reasonTags || (t.reasonTags as string[]).length === 0
  ).length;

  return Response.json({
    locked: false,
    totalCount,
    tagDistribution,
    tagPnl,
    emotionPnl,
    avgHoldingDays,
    holdingRanges,
    sectorConcentration,
    manualSectorConcentration,
    noTagCount,
  });
}
