import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

/** ISO 주차 키 생성: "2026-W15" 형식 */
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // ─── Claude API 호출 ──────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const prompt = `당신은 개인 투자자의 매매 데이터를 분석하는 전문 투자 코치입니다.
아래 데이터를 분석하여 JSON 형식으로만 응답하세요.

═══ 투자자 데이터 ═══
- 총 매매: ${trades.length}건 (매수 ${buyTrades.length}, 매도 ${sellTrades.length})
- 매칭 완료: ${matchedTrades.length}건
- 승률: ${winRate}%
- 평균 보유: ${avgHoldingDays}일
- 손절 비율: ${lossRatio}%

═══ 이유 태그별 성과 ═══
${topTags.map((t) => `- ${t.tag}: ${t.count}건, 평균 ${t.avgPnl >= 0 ? "+" : ""}${t.avgPnl}%`).join("\n")}

═══ 감정별 성과 ═══
${emotionSummary.length > 0
  ? emotionSummary.map((e) => `- ${e.emotion}: ${e.count}건, 평균 ${e.avgPnl >= 0 ? "+" : ""}${e.avgPnl}%`).join("\n")
  : "- 감정 기록 없음"}

═══ 응답 형식 (JSON만 응답) ═══
{
  "type": "투자자 유형명 (10자 이내, 예: 신중한 가치투자자)",
  "summary": "유형 설명 2문장 (강점 1문장 + 약점 1문장)"
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);

    // ─── API 사용 로그 ────────────────────────────────────
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
      },
      update: {
        count: { increment: 1 },
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
