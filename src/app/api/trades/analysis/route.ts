import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 사용자의 모든 매매 기록 조회
  const trades = await prisma.tradeLog.findMany({
    where: { account: { userId: session.user.id } },
    orderBy: { date: "asc" },
  });

  const totalCount = trades.length;

  if (totalCount < 10) {
    return Response.json({
      locked: true,
      totalCount,
      remaining: 10 - totalCount,
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

  // ─── 이유별 평균 수익률 ───────────────────────────────

  const buyTrades = trades.filter((t) => t.type === "BUY");
  const sellTrades = trades.filter((t) => t.type === "SELL");

  const tagPnlMap: Record<string, { totalPnl: number; count: number }> = {};

  buyTrades.forEach((buy) => {
    const matchingSell = sellTrades.find(
      (s) => s.ticker === buy.ticker && new Date(s.date) > new Date(buy.date)
    );
    if (!matchingSell) return;

    const pnlRate = ((matchingSell.price - buy.price) / buy.price) * 100;
    (buy.reasonTags ?? []).forEach((tag: string) => {
      if (!tagPnlMap[tag]) tagPnlMap[tag] = { totalPnl: 0, count: 0 };
      tagPnlMap[tag].totalPnl += pnlRate;
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

  buyTrades.forEach((buy) => {
    if (!buy.emotion) return;
    const matchingSell = sellTrades.find(
      (s) => s.ticker === buy.ticker && new Date(s.date) > new Date(buy.date)
    );
    if (!matchingSell) return;

    const pnlRate = ((matchingSell.price - buy.price) / buy.price) * 100;
    if (!emotionPnlMap[buy.emotion]) emotionPnlMap[buy.emotion] = { totalPnl: 0, count: 0 };
    emotionPnlMap[buy.emotion].totalPnl += pnlRate;
    emotionPnlMap[buy.emotion].count++;
  });

  const emotionPnl = Object.entries(emotionPnlMap)
    .map(([emotion, data]) => ({
      emotion,
      avgPnl: Math.round((data.totalPnl / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.avgPnl - a.avgPnl);

  // ─── 보유 기간 패턴 ───────────────────────────────────

  const holdingDays: number[] = [];

  buyTrades.forEach((buy) => {
    const matchingSell = sellTrades.find(
      (s) => s.ticker === buy.ticker && new Date(s.date) > new Date(buy.date)
    );
    if (!matchingSell) return;

    const days = Math.round(
      (new Date(matchingSell.date).getTime() - new Date(buy.date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    holdingDays.push(days);
  });

  const avgHoldingDays = holdingDays.length > 0
    ? Math.round(holdingDays.reduce((a, b) => a + b, 0) / holdingDays.length)
    : 0;

  const holdingRanges = [
    { label: "1일 이내", count: holdingDays.filter((d) => d <= 1).length },
    { label: "2~7일", count: holdingDays.filter((d) => d >= 2 && d <= 7).length },
    { label: "1~4주", count: holdingDays.filter((d) => d >= 8 && d <= 28).length },
    { label: "1~3개월", count: holdingDays.filter((d) => d >= 29 && d <= 90).length },
    { label: "3개월+", count: holdingDays.filter((d) => d > 90).length },
  ].filter((r) => r.count > 0);

  return Response.json({
    locked: false,
    totalCount,
    tagDistribution,
    tagPnl,
    emotionPnl,
    avgHoldingDays,
    holdingRanges,
  });
}
