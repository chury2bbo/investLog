import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // ─── 3회/일 제한 확인 ─────────────────────────────────

  const usageLog = await prisma.apiUsageLog.findUnique({
    where: {
      userId_type_date: {
        userId: session.user.id,
        type: "personality_report",
        date: today,
      },
    },
  });

  if (usageLog && usageLog.count >= 3) {
    return Response.json({
      error: "오늘 AI 성향 리포트 생성 횟수(3회)를 초과했습니다.",
      remaining: 0,
    }, { status: 429 });
  }

  // ─── 6개월치 매매 데이터 조회 ─────────────────────────

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const trades = await prisma.tradeLog.findMany({
    where: {
      account: { userId: session.user.id },
      date: { gte: sixMonthsAgo },
    },
    orderBy: { date: "asc" },
    include: { account: { select: { accountCode: true } } },
  });

  if (trades.length < 10) {
    return Response.json({
      error: "매매 기록이 10건 이상 필요합니다.",
      totalCount: trades.length,
    }, { status: 400 });
  }

  // ─── 보유종목 + 섹터 데이터 조회 ──────────────────────

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

  // ─── 통계 계산 ────────────────────────────────────────

  const buyTrades = trades.filter((t) => t.type === "BUY");
  const sellTrades = trades.filter((t) => t.type === "SELL");

  // 분석 기간
  const firstDate = new Date(trades[0].date);
  const lastDate = new Date(trades[trades.length - 1].date);
  const periodDays = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  const periodMonths = Math.max(1, Math.round(periodDays / 30));

  // ── 승률 계산 (매수→매도 매칭) ──
  interface MatchedTrade {
    ticker: string;
    name: string;
    buyPrice: number;
    sellPrice: number;
    pnlRate: number;
    holdingDays: number;
    reasonTags: string[];
    emotion: string | null;
    reasonMemo: string | null;
  }

  const matchedTrades: MatchedTrade[] = [];
  const usedSellIds = new Set<number>();

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
      ticker: buy.ticker,
      name: buy.name,
      buyPrice: buy.price,
      sellPrice: matchingSell.price,
      pnlRate: Math.round(pnlRate * 100) / 100,
      holdingDays,
      reasonTags: buy.reasonTags as string[],
      emotion: buy.emotion,
      reasonMemo: buy.reasonMemo,
    });
  });

  const winCount = matchedTrades.filter((t) => t.pnlRate > 0).length;
  const lossCount = matchedTrades.filter((t) => t.pnlRate < 0).length;
  const winRate = matchedTrades.length > 0
    ? Math.round((winCount / matchedTrades.length) * 100 * 10) / 10
    : 0;
  const avgPnl = matchedTrades.length > 0
    ? Math.round((matchedTrades.reduce((s, t) => s + t.pnlRate, 0) / matchedTrades.length) * 100) / 100
    : 0;
  const avgHoldingDays = matchedTrades.length > 0
    ? Math.round(matchedTrades.reduce((s, t) => s + t.holdingDays, 0) / matchedTrades.length)
    : 0;

  // ── 태그별 승률 ──
  const tagStats: Record<string, { win: number; loss: number; totalPnl: number }> = {};
  matchedTrades.forEach((t) => {
    (t.reasonTags ?? []).forEach((tag) => {
      if (!tagStats[tag]) tagStats[tag] = { win: 0, loss: 0, totalPnl: 0 };
      if (t.pnlRate > 0) tagStats[tag].win++;
      else tagStats[tag].loss++;
      tagStats[tag].totalPnl += t.pnlRate;
    });
  });
  const tagWinRates = Object.entries(tagStats)
    .map(([tag, s]) => ({
      tag,
      winRate: Math.round((s.win / (s.win + s.loss)) * 100),
      avgPnl: Math.round((s.totalPnl / (s.win + s.loss)) * 100) / 100,
      count: s.win + s.loss,
    }))
    .sort((a, b) => b.count - a.count);

  // ── 감정별 승률 ──
  const emotionStats: Record<string, { win: number; loss: number; totalPnl: number }> = {};
  matchedTrades.forEach((t) => {
    if (!t.emotion) return;
    if (!emotionStats[t.emotion]) emotionStats[t.emotion] = { win: 0, loss: 0, totalPnl: 0 };
    if (t.pnlRate > 0) emotionStats[t.emotion].win++;
    else emotionStats[t.emotion].loss++;
    emotionStats[t.emotion].totalPnl += t.pnlRate;
  });
  const emotionWinRates = Object.entries(emotionStats)
    .map(([emotion, s]) => ({
      emotion,
      winRate: Math.round((s.win / (s.win + s.loss)) * 100),
      avgPnl: Math.round((s.totalPnl / (s.win + s.loss)) * 100) / 100,
      count: s.win + s.loss,
    }))
    .sort((a, b) => b.count - a.count);

  // ── 섹터 집중도 ──
  const sectorMap: Record<string, { count: number; totalValue: number }> = {};
  holdings.forEach((h) => {
    const sector = h.sectorManual ?? h.sectorAuto ?? "기타";
    if (!sectorMap[sector]) sectorMap[sector] = { count: 0, totalValue: 0 };
    sectorMap[sector].count++;
    sectorMap[sector].totalValue += h.avgPrice * h.quantity;
  });
  const sectorConcentration = Object.entries(sectorMap)
    .map(([sector, s]) => ({ sector, count: s.count, totalValue: s.totalValue }))
    .sort((a, b) => b.totalValue - a.totalValue);
  const totalPortfolioValue = sectorConcentration.reduce((s, c) => s + c.totalValue, 0);
  const sectorSummary = sectorConcentration.map((s) => ({
    sector: s.sector,
    count: s.count,
    ratio: totalPortfolioValue > 0 ? Math.round((s.totalValue / totalPortfolioValue) * 100) : 0,
  }));

  // ── 포지션 사이징 ──
  const tradeAmounts = trades.map((t) => t.price * t.quantity);
  const avgTradeAmount = Math.round(tradeAmounts.reduce((s, a) => s + a, 0) / tradeAmounts.length);
  const maxTradeAmount = Math.max(...tradeAmounts);
  const minTradeAmount = Math.min(...tradeAmounts);

  // ── 거래 빈도 ──
  const tradesPerWeek = Math.round((trades.length / periodDays) * 7 * 10) / 10;

  // ── 이유 태그 분포 ──
  const tagCount: Record<string, number> = {};
  trades.forEach((t) => {
    (t.reasonTags as string[] ?? []).forEach((tag) => {
      tagCount[tag] = (tagCount[tag] ?? 0) + 1;
    });
  });
  const tagDistribution = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count, ratio: Math.round((count / trades.length) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── 최근 매매 메모 (정성적 데이터) ──
  const recentMemos = trades
    .filter((t) => t.reasonMemo)
    .slice(-10)
    .map((t) => ({
      date: new Date(t.date).toISOString().slice(0, 10),
      ticker: t.name,
      type: t.type,
      memo: t.reasonMemo,
    }));

  // ── 월별 매매 패턴 ──
  const monthlyPattern: Record<string, { buy: number; sell: number }> = {};
  trades.forEach((t) => {
    const month = new Date(t.date).toISOString().slice(0, 7);
    if (!monthlyPattern[month]) monthlyPattern[month] = { buy: 0, sell: 0 };
    if (t.type === "BUY") monthlyPattern[month].buy++;
    else monthlyPattern[month].sell++;
  });

  // ── 종목 반복 매매 패턴 ──
  const tickerFreq: Record<string, number> = {};
  trades.forEach((t) => {
    tickerFreq[t.ticker] = (tickerFreq[t.ticker] ?? 0) + 1;
  });
  const repeatTickers = Object.entries(tickerFreq)
    .filter(([, count]) => count >= 3)
    .map(([ticker, count]) => {
      const name = trades.find((t) => t.ticker === ticker)?.name ?? ticker;
      return { ticker, name, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ─── Claude API 호출 ──────────────────────────────────

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const prompt = `당신은 개인 투자자의 매매 패턴을 분석하는 전문 투자 코치입니다.
아래 투자자의 ${periodMonths}개월간 매매 데이터 통계를 분석하여 상세한 투자 성향 리포트를 작성해주세요.

═══ 기본 정보 ═══
- 분석 기간: ${new Date(firstDate).toISOString().slice(0, 10)} ~ ${new Date(lastDate).toISOString().slice(0, 10)} (${periodMonths}개월)
- 총 매매 건수: ${trades.length}건 (매수 ${buyTrades.length}건, 매도 ${sellTrades.length}건)
- 거래 빈도: 주 평균 ${tradesPerWeek}회
- 보유 종목 수: ${holdings.length}종목

═══ 수익률 & 승률 ═══
- 매수→매도 매칭 완료: ${matchedTrades.length}건
- 전체 승률: ${winRate}% (${winCount}승 ${lossCount}패)
- 평균 수익률: ${avgPnl >= 0 ? "+" : ""}${avgPnl}%
- 평균 보유 기간: ${avgHoldingDays}일

═══ 이유 태그별 승률 ═══
${tagWinRates.map((t) => `- ${t.tag}: 승률 ${t.winRate}%, 평균 수익률 ${t.avgPnl >= 0 ? "+" : ""}${t.avgPnl}% (${t.count}건)`).join("\n")}

═══ 감정별 승률 ═══
${emotionWinRates.length > 0
  ? emotionWinRates.map((e) => `- ${e.emotion}: 승률 ${e.winRate}%, 평균 수익률 ${e.avgPnl >= 0 ? "+" : ""}${e.avgPnl}% (${e.count}건)`).join("\n")
  : "- 감정 기록 없음"}

═══ 이유 태그 사용 분포 ═══
${tagDistribution.map((t) => `- ${t.tag}: ${t.count}회 (${t.ratio}%)`).join("\n")}

═══ 섹터 집중도 ═══
${sectorSummary.map((s) => `- ${s.sector}: ${s.count}종목 (${s.ratio}%)`).join("\n")}

═══ 포지션 사이징 ═══
- 1건당 평균 투자금: ${avgTradeAmount.toLocaleString()}
- 최대 투자금: ${maxTradeAmount.toLocaleString()}
- 최소 투자금: ${minTradeAmount.toLocaleString()}
- 최대/최소 비율: ${minTradeAmount > 0 ? Math.round(maxTradeAmount / minTradeAmount) : "-"}배

═══ 월별 매매 추이 ═══
${Object.entries(monthlyPattern).map(([month, p]) => `- ${month}: 매수 ${p.buy}건, 매도 ${p.sell}건`).join("\n")}

═══ 반복 매매 종목 (3회 이상) ═══
${repeatTickers.length > 0
  ? repeatTickers.map((t) => `- ${t.name}(${t.ticker}): ${t.count}회`).join("\n")
  : "- 없음"}

═══ 최근 매매 메모 (투자자의 생각) ═══
${recentMemos.length > 0
  ? recentMemos.map((m) => `- [${m.date}] ${m.ticker} ${m.type}: "${m.memo}"`).join("\n")
  : "- 메모 기록 없음"}

═══ 분석 요청 ═══
위 데이터를 종합적으로 분석하여 다음 JSON 형식으로 응답해주세요. 한국어로 작성하고, JSON만 응답하세요.

{
  "investorType": "투자 스타일 유형 한 줄 (예: 신중한 가치투자자, 감성적 모멘텀 트레이더 등)",
  "typeDescription": "유형에 대한 상세 설명 3~4줄. 데이터에서 드러나는 구체적 근거를 포함",
  "investorScore": {
    "profitability": 1~100 사이 숫자 (승률과 평균 수익률 기반),
    "discipline": 1~100 사이 숫자 (감정 통제, 일관된 전략 사용 여부),
    "riskManagement": 1~100 사이 숫자 (포지션 사이징, 섹터 분산, 손절 실행력),
    "consistency": 1~100 사이 숫자 (거래 빈도 안정성, 전략 유지력)
  },
  "goodPatterns": ["구체적 근거 포함 잘하는 패턴 1", "패턴 2", "패턴 3"],
  "badPatterns": ["구체적 근거 포함 반복 실수 1", "실수 2", "실수 3"],
  "dangerSignals": ["발견된 위험 신호. 없으면 빈 배열"],
  "sectorAnalysis": "섹터 집중도와 분산 상태에 대한 분석 2~3줄",
  "emotionAnalysis": "감정과 수익률의 관계, 어떤 감정일 때 성과가 좋고 나쁜지 구체적으로 2~3줄",
  "tradingStyleAnalysis": "거래 빈도, 보유 기간, 포지션 사이징 패턴으로 본 매매 스타일 분석 2~3줄",
  "recommendations": ["실행 가능한 구체적 개선 권고 1", "권고 2", "권고 3", "권고 4"],
  "monthlyTrend": "월별 매매 추이에서 발견되는 패턴 (과매매 시기, 매매 빈도 변화 등) 1~2줄",
  "summary": "이 투자자에게 가장 중요한 한줄 조언"
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    const report = JSON.parse(jsonMatch[0]);

    // 통계 메타 정보도 함께 반환
    const meta = {
      periodMonths,
      totalTrades: trades.length,
      buyCount: buyTrades.length,
      sellCount: sellTrades.length,
      matchedCount: matchedTrades.length,
      winRate,
      avgPnl,
      avgHoldingDays,
      tradesPerWeek,
      holdingCount: holdings.length,
    };

    // 사용 횟수 증가
    await prisma.apiUsageLog.upsert({
      where: {
        userId_type_date: {
          userId: session.user.id,
          type: "personality_report",
          date: today,
        },
      },
      create: {
        userId: session.user.id,
        type: "personality_report",
        date: today,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });

    const remaining = 3 - ((usageLog?.count ?? 0) + 1);

    return Response.json({ report, meta, remaining });
  } catch (err) {
    console.error("AI Report error:", err);
    return Response.json({ error: "AI 리포트 생성에 실패했습니다." }, { status: 500 });
  }
}
