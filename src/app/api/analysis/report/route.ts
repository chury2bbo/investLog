import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, REPORT_SYSTEM, buildReportUserPrompt } from "@/lib/prompts";
import Anthropic from "@anthropic-ai/sdk";
import { getKisQuote } from "@/lib/kis";
import { getYahooQuote, getYahooFinancials } from "@/lib/yahoo";
import { parseAiJson } from "@/lib/parseAiJson";
import { analyzeByRules, QuoteMetrics } from "@/lib/rule-engine";
import { scrapeRecentNews } from "@/lib/summary-scraper";

const DAILY_LIMIT = 10;

// ─── 통합 시세 + 지표 조회 ───────────────────────────────

async function fetchQuoteMetrics(
  ticker: string,
  country: string
): Promise<QuoteMetrics> {
  if (country === "KR") {
    // KIS + Yahoo 병렬 조회 (KIS 실패 시 Yahoo만으로 동작)
    const [kisResult, yahooQuote, yahooFinancials] = await Promise.all([
      getKisQuote(ticker).catch(() => null),
      getYahooQuote(ticker).catch(() => null),
      getYahooFinancials(ticker).catch(() => ({ roe: null })),
    ]);

    // KIS 성공 시 KIS 우선, 실패 시 Yahoo 사용
    const price = kisResult?.price ?? yahooQuote?.price ?? 0;
    const per = kisResult?.per ?? yahooQuote?.per ?? yahooQuote?.forwardPer ?? null;
    const pbr = kisResult?.pbr ?? yahooQuote?.pbr ?? null;
    const fiftyTwoWeekHigh = kisResult?.fiftyTwoWeekHigh ?? yahooQuote?.fiftyTwoWeekHigh ?? null;
    const fiftyTwoWeekLow = kisResult?.fiftyTwoWeekLow ?? yahooQuote?.fiftyTwoWeekLow ?? null;

    return {
      ticker,
      price,
      per,
      pbr,
      roe: yahooFinancials.roe,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      currency: "원",
    };
  } else {
    const [yahooQuote, yahooFinancials] = await Promise.all([
      getYahooQuote(ticker),
      getYahooFinancials(ticker).catch(() => ({ roe: null })),
    ]);
    return {
      ticker,
      price: yahooQuote.price,
      per: yahooQuote.per ?? yahooQuote.forwardPer ?? null,
      pbr: yahooQuote.pbr ?? null,
      roe: yahooFinancials.roe,
      fiftyTwoWeekHigh: yahooQuote.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: yahooQuote.fiftyTwoWeekLow ?? null,
      currency: "USD",
    };
  }
}

// ─── API 핸들러 ──────────────────────────────────────────

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");
  const stockName = searchParams.get("name") ?? ticker ?? "";
  const country = searchParams.get("country") ?? (/^\d{6}$/.test(ticker ?? "") ? "KR" : "US");

  if (!ticker) {
    return Response.json({ error: "ticker 파라미터가 필요합니다." }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // 캐시 + 한도를 병렬로 조회
  const [cached, usage] = await Promise.all([
    prisma.tickerAnalysisCache.findUnique({ where: { ticker } }),
    prisma.apiUsageLog.findUnique({
      where: { userId_type_date: { userId, type: "analysis", date: today } },
    }),
  ]);

  // 당일 캐시 히트
  if (cached && cached.cachedDate === today) {
    try {
      await prisma.$executeRaw`
        INSERT INTO user_analysis_logs ("userId", ticker, name, country, "createdAt")
        VALUES (${userId}, ${ticker}, ${stockName}, ${country}, NOW())
      `;
    } catch { /* 이력 저장 실패 무시 */ }
    return Response.json({ ticker, report: cached, cached: true, usage: { count: usage?.count ?? 0, limit: DAILY_LIMIT } });
  }

  // 일일 한도 체크
  if (usage && usage.count >= DAILY_LIMIT) {
    return Response.json(
      { error: `일일 분석 한도(${DAILY_LIMIT}회)를 초과했습니다. 내일 다시 시도해주세요.` },
      { status: 429 }
    );
  }

  // 시세 + 지표 조회
  let metrics: QuoteMetrics;
  try {
    metrics = await fetchQuoteMetrics(ticker, country);
  } catch {
    return Response.json(
      { error: "시세 정보를 조회할 수 없습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }

  if (metrics.price === 0) {
    return Response.json(
      { error: "현재가를 조회할 수 없습니다." },
      { status: 502 }
    );
  }

  // ─── AI 시도 → 실패 시 규칙 기반 폴백 ─────────────────

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let reportData: {
    recommendation: string;
    targetBuy: string;
    targetSell: string;
    swotStrength: string;
    swotWeakness: string;
    swotOpportunity: string;
    swotThreat: string;
    reasoning: string;
    recentIssues: string;
  };
  let fallback = false;
  let inputTokens = 0;
  let outputTokens = 0;

  if (apiKey) {
    // AI 키가 있으면 AI 먼저 시도
    try {
      const anthropic = new Anthropic({ apiKey });

      const priceText = metrics.price > 0
        ? `현재가: ${metrics.price.toLocaleString()}${metrics.currency}`
        : "현재가: 조회 불가";

      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: REPORT_SYSTEM,
        messages: [
          {
            role: "user",
            content: buildReportUserPrompt(stockName, ticker, priceText),
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      inputTokens = message.usage.input_tokens;
      outputTokens = message.usage.output_tokens;

      const parsed = parseAiJson<{
        recommendation?: string;
        targetBuy?: string;
        targetSell?: string;
        swotStrength?: string;
        swotWeakness?: string;
        swotOpportunity?: string;
        swotThreat?: string;
        reasoning?: string;
        recentIssues?: string;
      }>(text);

      if (!parsed) {
        // AI 응답 파싱 실패 → 폴백
        throw new Error("AI 응답 파싱 실패");
      }

      reportData = {
        recommendation: parsed.recommendation ?? "HOLD",
        targetBuy: parsed.targetBuy ?? "",
        targetSell: parsed.targetSell ?? "",
        swotStrength: parsed.swotStrength ?? "",
        swotWeakness: parsed.swotWeakness ?? "",
        swotOpportunity: parsed.swotOpportunity ?? "",
        swotThreat: parsed.swotThreat ?? "",
        reasoning: parsed.reasoning ?? "",
        recentIssues: parsed.recentIssues ?? "",
      };
    } catch (err: unknown) {
      // AI 실패 (크레딧 부족, 과부하, 타임아웃, 파싱 실패 등) → 규칙 기반 폴백
      console.warn("AI 분석 실패, 규칙 기반으로 폴백:", err instanceof Error ? err.message : err);
      reportData = analyzeByRules(metrics);
      // 최근 뉴스 크롤링으로 recentIssues 보충
      const news = await scrapeRecentNews(ticker, country).catch(() => "");
      if (news) reportData.recentIssues = news;
      fallback = true;
    }
  } else {
    // API 키 없음 → 바로 규칙 기반 사용
    reportData = analyzeByRules(metrics);
    // 최근 뉴스 크롤링으로 recentIssues 보충
    const news = await scrapeRecentNews(ticker, country).catch(() => "");
    if (news) reportData.recentIssues = news;
    fallback = true;
  }

  // ─── 캐시 저장 + 사용량 기록 ───────────────────────────

  const report = await prisma.tickerAnalysisCache.upsert({
    where: { ticker },
    create: {
      ticker,
      ...reportData,
      cachedDate: today,
    },
    update: {
      ...reportData,
      cachedDate: today,
    },
  });

  // 사용량 카운트 (AI 사용 시 토큰도 기록)
  await prisma.apiUsageLog.upsert({
    where: { userId_type_date: { userId, type: "analysis", date: today } },
    update: {
      count: { increment: 1 },
      inputTokens: { increment: inputTokens },
      outputTokens: { increment: outputTokens },
    },
    create: {
      userId,
      type: "analysis",
      date: today,
      count: 1,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
    },
  });

  // 사용자 분석 이력 기록
  try {
    await prisma.$executeRaw`
      INSERT INTO user_analysis_logs ("userId", ticker, name, country, "createdAt")
      VALUES (${userId}, ${ticker}, ${stockName}, ${country}, NOW())
    `;
  } catch { /* 이력 저장 실패 무시 */ }

  return Response.json({ ticker, report, cached: false, fallback, usage: { count: (usage?.count ?? 0) + 1, limit: DAILY_LIMIT } });
}
