import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, buildSummaryUserPrompt } from "@/lib/prompts";
import Anthropic from "@anthropic-ai/sdk";
import { parseAiJson } from "@/lib/parseAiJson";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

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
    const { input_tokens, output_tokens } = message.usage;

    const parsed = parseAiJson(text);
    if (!parsed) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    const summaryKo = JSON.stringify(parsed);
    await prisma.tickerSummaryCache.upsert({
      where: { ticker },
      create: { ticker, summaryKo },
      update: { summaryKo },
    });

    // 토큰 사용량 기록
    const today = new Date().toISOString().slice(0, 10);
    await prisma.apiUsageLog.upsert({
      where: { userId_type_date: { userId: session.user.id, type: "summary", date: today } },
      create: { userId: session.user.id, type: "summary", date: today, count: 1, inputTokens: input_tokens, outputTokens: output_tokens },
      update: { count: { increment: 1 }, inputTokens: { increment: input_tokens }, outputTokens: { increment: output_tokens } },
    });

    return Response.json({ ticker, summary: summaryKo, cached: false });
  } catch (err: unknown) {
    const isOverloaded = err instanceof Error && (err.message?.includes("Overloaded") || err.message?.includes("529"));
    const message = isOverloaded
      ? "AI 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요."
      : "AI 요약 생성에 실패했습니다.";
    return Response.json({ error: message }, { status: isOverloaded ? 503 : 500 });
  }
}
