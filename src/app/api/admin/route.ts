import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKisQuote } from "@/lib/kis";
import { getYahooQuote } from "@/lib/yahoo";

// 관리자 이메일 (필요 시 .env로 이동)
const ADMIN_EMAILS = ["bbbb@bbbb.com", "aaaa@aaaa.com"];

// Claude sonnet-4 요금 (USD per 1M tokens)
const PRICE_INPUT = 3; // $3 / 1M input tokens
const PRICE_OUTPUT = 15; // $15 / 1M output tokens

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 관리자 체크
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // ─── 1. API 사용량 + 토큰 통계 ────────────────────────
  const allLogs = await prisma.apiUsageLog.findMany({
    orderBy: { date: "desc" },
  });

  // 이번 달 사용량
  const currentMonth = today.slice(0, 7); // "2026-04"
  const monthLogs = allLogs.filter((l) => l.date.startsWith(currentMonth));
  const monthSummary = {
    totalCalls: monthLogs.reduce((s, l) => s + l.count, 0),
    inputTokens: monthLogs.reduce((s, l) => s + l.inputTokens, 0),
    outputTokens: monthLogs.reduce((s, l) => s + l.outputTokens, 0),
    byType: aggregateByType(monthLogs),
  };

  // 최근 7일 사용량
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekStr = sevenDaysAgo.toISOString().slice(0, 10);
  const weekLogs = allLogs.filter((l) => l.date >= weekStr);
  const weekSummary = {
    totalCalls: weekLogs.reduce((s, l) => s + l.count, 0),
    inputTokens: weekLogs.reduce((s, l) => s + l.inputTokens, 0),
    outputTokens: weekLogs.reduce((s, l) => s + l.outputTokens, 0),
    byType: aggregateByType(weekLogs),
  };

  // 전체 누적
  const totalSummary = {
    totalCalls: allLogs.reduce((s, l) => s + l.count, 0),
    inputTokens: allLogs.reduce((s, l) => s + l.inputTokens, 0),
    outputTokens: allLogs.reduce((s, l) => s + l.outputTokens, 0),
    byType: aggregateByType(allLogs),
  };

  // 예상 비용 계산
  function calcCost(input: number, output: number) {
    return Math.round(((input / 1_000_000) * PRICE_INPUT + (output / 1_000_000) * PRICE_OUTPUT) * 10000) / 10000;
  }

  // 일별 추이 (최근 7일)
  const dailyTrend = (() => {
    const map: Record<string, { calls: number; input: number; output: number }> = {};
    weekLogs.forEach((l) => {
      if (!map[l.date]) map[l.date] = { calls: 0, input: 0, output: 0 };
      map[l.date].calls += l.count;
      map[l.date].input += l.inputTokens;
      map[l.date].output += l.outputTokens;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, ...d, cost: calcCost(d.input, d.output) }));
  })();

  // ─── 2. API 상태 체크 ─────────────────────────────────
  const apiStatus = await checkApiStatus();

  // ─── 3. 시스템 통계 ───────────────────────────────────
  const [userCount, tradeCount, holdingCount] = await Promise.all([
    prisma.user.count(),
    prisma.tradeLog.count(),
    prisma.holding.count(),
  ]);

  return Response.json({
    currentMonth,
    month: { ...monthSummary, cost: calcCost(monthSummary.inputTokens, monthSummary.outputTokens) },
    week: { ...weekSummary, cost: calcCost(weekSummary.inputTokens, weekSummary.outputTokens) },
    total: { ...totalSummary, cost: calcCost(totalSummary.inputTokens, totalSummary.outputTokens) },
    dailyTrend,
    apiStatus,
    system: { userCount, tradeCount, holdingCount },
  });
}

function aggregateByType(logs: { type: string; count: number; inputTokens: number; outputTokens: number }[]) {
  const map: Record<string, { calls: number; input: number; output: number }> = {};
  logs.forEach((l) => {
    if (!map[l.type]) map[l.type] = { calls: 0, input: 0, output: 0 };
    map[l.type].calls += l.count;
    map[l.type].input += l.inputTokens;
    map[l.type].output += l.outputTokens;
  });
  return map;
}

async function checkApiStatus() {
  const results: { name: string; status: "ok" | "error"; latency: number; message?: string }[] = [];

  // KIS API
  const kisStart = Date.now();
  try {
    await getKisQuote("005930");
    results.push({ name: "KIS Open API", status: "ok", latency: Date.now() - kisStart });
  } catch (e) {
    results.push({ name: "KIS Open API", status: "error", latency: Date.now() - kisStart, message: e instanceof Error ? e.message : "Unknown" });
  }

  // Yahoo Finance
  const yahooStart = Date.now();
  try {
    await getYahooQuote("AAPL");
    results.push({ name: "Yahoo Finance", status: "ok", latency: Date.now() - yahooStart });
  } catch (e) {
    results.push({ name: "Yahoo Finance", status: "error", latency: Date.now() - yahooStart, message: e instanceof Error ? e.message : "Unknown" });
  }

  // Claude API (키 유효성만 체크 — 실제 호출 안 함)
  results.push({
    name: "Claude API",
    status: process.env.ANTHROPIC_API_KEY ? "ok" : "error",
    latency: 0,
    message: process.env.ANTHROPIC_API_KEY ? "API Key 설정됨" : "API Key 미설정",
  });

  return results;
}
