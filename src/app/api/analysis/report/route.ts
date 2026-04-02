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

  const today = new Date().toISOString().slice(0, 10);

  // 당일 캐시 확인
  const cached = await prisma.tickerAnalysisCache.findUnique({
    where: { ticker },
  });

  if (cached && cached.cachedDate === today) {
    return Response.json({ ticker, report: cached, cached: true });
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
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `주식 종목 "${ticker}"에 대해 투자 분석을 해줘.
다음 항목을 포함해서 JSON으로 응답해:

{
  "recommendation": "BUY" | "HOLD" | "SELL",
  "targetBuy": "적정 매수가 (숫자 문자열)",
  "targetSell": "적정 매도가 (숫자 문자열)",
  "swotStrength": "강점 1~2줄",
  "swotWeakness": "약점 1~2줄",
  "swotOpportunity": "기회 1~2줄",
  "swotThreat": "위협 1~2줄",
  "reasoning": "종합 투자 의견 3~4줄"
}

한국어로 작성하고, JSON만 응답해줘.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "AI 응답 파싱 실패" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

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
        cachedDate: today,
      },
    });

    return Response.json({ ticker, report, cached: false });
  } catch (err) {
    console.error("Report API error:", err);
    return Response.json({ error: "AI 분석 생성에 실패했습니다." }, { status: 500 });
  }
}
