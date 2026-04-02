// 기업 소개 AI 한국어 요약 — 영구 캐시 (티커당 1회만 Claude 호출)
// POST /api/analysis/summary  { ticker, name, sector, industry, exchange }

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticker, name, sector, industry, exchange } = await req.json();
  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });

  // 영구 캐시 확인
  const cached = await prisma.tickerSummaryCache.findUnique({ where: { ticker } });
  if (cached) {
    return Response.json({ ticker, summaryKo: cached.summaryKo, cached: true });
  }

  // Claude API 호출
  const prompt = [
    `다음 기업을 한국어로 2~3문장 간결하게 소개해줘.`,
    `회사명: ${name}`,
    sector ? `섹터: ${sector}` : "",
    industry ? `산업: ${industry}` : "",
    `거래소: ${exchange}`,
    `티커: ${ticker}`,
    `\n요구사항:`,
    `- 무엇을 하는 회사인지 핵심만`,
    `- 전문용어는 쉽게 풀어서`,
    `- 마케팅 문구 없이 중립적으로`,
    `- 2~3문장 이내`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const summaryKo =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // 영구 캐시 저장
    await prisma.tickerSummaryCache.upsert({
      where: { ticker },
      update: { summaryKo },
      create: { ticker, summaryKo },
    });

    return Response.json({ ticker, summaryKo, cached: false });
  } catch (e) {
    console.error("analysis/summary error:", e);
    return Response.json({ error: "요약 생성에 실패했습니다." }, { status: 500 });
  }
}
