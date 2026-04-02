import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

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

  // Claude API 호출
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `주식 종목 "${ticker}"에 대해 한국어로 간결하게 소개해줘.
다음 형식으로 작성해:
- 종목명(한국어)
- 거래소
- 섹터
- 산업
- 소개 (2~3줄로 핵심 사업과 투자 포인트 요약)

JSON 형식으로 응답해줘:
{"name":"종목명","exchange":"거래소","sector":"섹터","industry":"산업","summary":"소개 2~3줄"}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 영구 캐시 저장
    const summaryKo = JSON.stringify(parsed);
    await prisma.tickerSummaryCache.upsert({
      where: { ticker },
      create: { ticker, summaryKo },
      update: { summaryKo },
    });

    return Response.json({ ticker, summary: summaryKo, cached: false });
  } catch (err) {
    console.error("Summary API error:", err);
    return Response.json({ error: "AI 요약 생성에 실패했습니다." }, { status: 500 });
  }
}
