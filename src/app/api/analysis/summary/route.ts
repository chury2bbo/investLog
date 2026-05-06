import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, buildSummaryUserPrompt } from "@/lib/prompts";
import Anthropic from "@anthropic-ai/sdk";
import { parseAiJson } from "@/lib/parseAiJson";
import { scrapeSummary } from "@/lib/summary-scraper";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");
  const country = searchParams.get("country") ?? (/^\d{6}$/.test(ticker ?? "") ? "KR" : "US");

  if (!ticker) {
    return Response.json({ error: "ticker 파라미터가 필요합니다." }, { status: 400 });
  }

  // 영구 캐시 확인
  const cached = await prisma.tickerSummaryCache.findUnique({
    where: { ticker },
  });

  if (cached) {
    return Response.json({ ticker, summary: cached.summaryKo, cached: true });
  }

  // ─── AI 시도 → 실패 시 스크래퍼 폴백 ──────────────────

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let summaryKo: string;
  let fallback = false;
  let inputTokens = 0;
  let outputTokens = 0;

  if (apiKey) {
    // AI 키가 있으면 AI 먼저 시도
    try {
      const anthropic = new Anthropic({ apiKey });

      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: buildSummaryUserPrompt(ticker),
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      inputTokens = message.usage.input_tokens;
      outputTokens = message.usage.output_tokens;

      const parsed = parseAiJson(text);
      if (!parsed) {
        // AI 응답 파싱 실패 → 폴백
        throw new Error("AI 응답 파싱 실패");
      }

      summaryKo = JSON.stringify(parsed);
    } catch (err: unknown) {
      // AI 실패 → 스크래퍼 폴백
      console.warn("AI 기업 소개 실패, 스크래퍼로 폴백:", err instanceof Error ? err.message : err);

      try {
        const scraped = await scrapeSummary(ticker, country);
        summaryKo = JSON.stringify(scraped);
        fallback = true;
      } catch (scrapeErr: unknown) {
        console.error("스크래퍼도 실패:", scrapeErr);
        return Response.json(
          { error: "기업 소개 조회에 실패했습니다." },
          { status: 502 }
        );
      }
    }
  } else {
    // API 키 없음 → 바로 스크래퍼 사용
    try {
      const scraped = await scrapeSummary(ticker, country);
      summaryKo = JSON.stringify(scraped);
      fallback = true;
    } catch (scrapeErr: unknown) {
      console.error("스크래퍼 실패:", scrapeErr);
      return Response.json(
        { error: "기업 소개 조회에 실패했습니다." },
        { status: 502 }
      );
    }
  }

  // 영구 캐시 저장
  await prisma.tickerSummaryCache.upsert({
    where: { ticker },
    create: { ticker, summaryKo },
    update: { summaryKo },
  });

  // 토큰 사용량 기록 (AI 사용 시에만)
  if (inputTokens > 0 || outputTokens > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await prisma.apiUsageLog.upsert({
      where: { userId_type_date: { userId: session.user.id, type: "summary", date: today } },
      create: { userId: session.user.id, type: "summary", date: today, count: 1, inputTokens, outputTokens },
      update: { count: { increment: 1 }, inputTokens: { increment: inputTokens }, outputTokens: { increment: outputTokens } },
    });
  }

  return Response.json({ ticker, summary: summaryKo, cached: false, fallback });
}
