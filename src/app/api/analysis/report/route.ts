import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, REPORT_SYSTEM, buildReportUserPrompt } from "@/lib/prompts";
import Anthropic from "@anthropic-ai/sdk";
import { getKisQuote } from "@/lib/kis";
import { getYahooQuote } from "@/lib/yahoo";
import { parseAiJson } from "@/lib/parseAiJson";

const DAILY_LIMIT = 10;

async function fetchCurrentPrice(ticker: string, country: string): Promise<{ price: number; currency: string }> {
  try {
    if (country === "KR") {
      const q = await getKisQuote(ticker);
      return { price: q.price, currency: "원" };
    } else {
      const q = await getYahooQuote(ticker);
      return { price: q.price, currency: "USD" };
    }
  } catch {
    return { price: 0, currency: country === "KR" ? "원" : "USD" };
  }
}

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

  // 캐시 + 한도 + 현재가를 병렬로 조회
  const [cached, usage, priceResult] = await Promise.all([
    prisma.tickerAnalysisCache.findUnique({ where: { ticker } }),
    prisma.apiUsageLog.findUnique({
      where: { userId_type_date: { userId, type: "analysis", date: today } },
    }),
    fetchCurrentPrice(ticker, country),
  ]);

  if (cached && cached.cachedDate === today) {
    try {
      await prisma.$executeRaw`
        INSERT INTO user_analysis_logs ("userId", ticker, name, country, "createdAt")
        VALUES (${userId}, ${ticker}, ${stockName}, ${country}, NOW())
      `;
    } catch { /* 이력 저장 실패 무시 */ }
    return Response.json({ ticker, report: cached, cached: true });
  }

  if (usage && usage.count >= DAILY_LIMIT) {
    return Response.json(
      { error: `일일 분석 한도(${DAILY_LIMIT}회)를 초과했습니다. 내일 다시 시도해주세요.` },
      { status: 429 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const { price, currency } = priceResult;
  const priceText = price > 0
    ? `현재가: ${price.toLocaleString()}${currency}`
    : "현재가: 조회 불가";

  try {
    const anthropic = new Anthropic({ apiKey });

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
    const { input_tokens, output_tokens } = message.usage;

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
      return Response.json({ error: "AI 서버 응답이 불완전합니다. 다시 시도해주세요." }, { status: 502 });
    }

    // 당일 캐시 저장
    const report = await prisma.tickerAnalysisCache.upsert({
      where: { ticker },
      create: {
        ticker,
        recommendation: parsed.recommendation ?? "HOLD",
        targetBuy: parsed.targetBuy ?? "",
        targetSell: parsed.targetSell ?? "",
        swotStrength: parsed.swotStrength ?? "",
        swotWeakness: parsed.swotWeakness ?? "",
        swotOpportunity: parsed.swotOpportunity ?? "",
        swotThreat: parsed.swotThreat ?? "",
        reasoning: parsed.reasoning ?? "",
        recentIssues: parsed.recentIssues ?? "",
        cachedDate: today,
      },
      update: {
        recommendation: parsed.recommendation ?? "HOLD",
        targetBuy: parsed.targetBuy ?? "",
        targetSell: parsed.targetSell ?? "",
        swotStrength: parsed.swotStrength ?? "",
        swotWeakness: parsed.swotWeakness ?? "",
        swotOpportunity: parsed.swotOpportunity ?? "",
        swotThreat: parsed.swotThreat ?? "",
        reasoning: parsed.reasoning ?? "",
        recentIssues: parsed.recentIssues ?? "",
        cachedDate: today,
      },
    });

    // 사용량 카운트 + 토큰 증가
    await prisma.apiUsageLog.upsert({
      where: { userId_type_date: { userId, type: "analysis", date: today } },
      update: { count: { increment: 1 }, inputTokens: { increment: input_tokens }, outputTokens: { increment: output_tokens } },
      create: { userId, type: "analysis", date: today, count: 1, inputTokens: input_tokens, outputTokens: output_tokens },
    });

    // 사용자 분석 이력 기록
    try {
      await prisma.$executeRaw`
        INSERT INTO user_analysis_logs ("userId", ticker, name, country, "createdAt")
        VALUES (${userId}, ${ticker}, ${stockName}, ${country}, NOW())
      `;
    } catch { /* 이력 저장 실패 무시 */ }

    return Response.json({ ticker, report, cached: false });
  } catch (err: unknown) {
    console.error("Report API error:", err);
    const isOverloaded = err instanceof Error && (err.message?.includes("Overloaded") || err.message?.includes("529"));
    const message = isOverloaded
      ? "AI 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요."
      : "AI 분석 생성에 실패했습니다.";
    return Response.json({ error: message }, { status: isOverloaded ? 503 : 500 });
  }
}
