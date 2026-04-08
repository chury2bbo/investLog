import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

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

  // JSON 문자열 → 배열 파싱
  const parsed = history.map((h) => ({
    id: h.id,
    strengths: JSON.parse(h.strengths),
    mistakes: JSON.parse(h.mistakes),
    goals: JSON.parse(h.goals),
    createdAt: h.createdAt,
  }));

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

  // ─── 매매 데이터 조회 ─────────────────────────────────
  const trades = await prisma.tradeLog.findMany({
    where: { account: { userId: session.user.id } },
    orderBy: { date: "asc" },
  });

  if (trades.length < 10) {
    return Response.json({
      error: "매매 기록이 10건 이상 필요합니다.",
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
    .map(([tag, s]) => `${tag}: ${s.count}건, 평균 ${(s.totalPnl / s.count).toFixed(1)}%`)
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
    .map(([emotion, s]) => `${emotion}: ${s.count}건, 평균 ${(s.totalPnl / s.count).toFixed(1)}%`);

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

  // ─── Claude API 호출 ──────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const prompt = `당신은 개인 투자자의 매매 패턴을 분석하고 개선 방향을 제시하는 코치입니다.
반드시 아래 JSON 형식으로만 응답하세요. 진단 → 근거 → 액션 3단 구조를 지키세요.

═══ 투자자 데이터 ═══
- 총 매매: ${trades.length}건 (매수 ${buyTrades.length}, 매도 ${sellTrades.length})
- 매칭 완료: ${matchedTrades.length}건
- 승률: ${winRate}%
- 평균 보유: ${avgHoldingDays}일

═══ 이유 태그별 성과 ═══
${topTags.join("\n")}

═══ 감정별 성과 ═══
${emotionSummary.length > 0 ? emotionSummary.join("\n") : "감정 기록 없음"}

═══ 섹터 집중도 ═══
${sectorSummary.join("\n")}

═══ 보유기간 분포 ═══
${holdingSummary.join("\n")}

═══ 응답 형식 (JSON만 응답) ═══
{
  "strengths": ["잘하고 있는 것 1", "잘하고 있는 것 2"],
  "mistakes": ["반복 실수 1 (수치 포함)", "반복 실수 2 (수치 포함)"],
  "goals": ["구체적 개선 목표 1 (수치 포함)", "목표 2", "목표 3"]
}

규칙:
- 각 항목은 1~2문장, 반드시 수치 근거 포함
- 막연한 조언 금지 ("더 열심히" 같은 표현 사용 금지)
- 한국어로 응답`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);

    // ─── DB 저장 ────────────────────────────────────────
    const coaching = await prisma.coachingHistory.create({
      data: {
        userId: session.user.id,
        strengths: JSON.stringify(result.strengths),
        mistakes: JSON.stringify(result.mistakes),
        goals: JSON.stringify(result.goals),
      },
    });

    // ─── 사용 횟수 증가 ─────────────────────────────────
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
      },
      update: {
        count: { increment: 1 },
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
