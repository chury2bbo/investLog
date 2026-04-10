import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODEL, IMPORT_ANALYZE_PROMPT } from "@/lib/prompts";
import { getYahooSearch } from "@/lib/yahoo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File;

  if (!file) {
    return Response.json({ error: "이미지가 없습니다." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = (
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
      ? file.type
      : "image/jpeg"
  ) as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: IMPORT_ANALYZE_PROMPT,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const { input_tokens, output_tokens } = message.usage;

    // 토큰 사용량 기록
    const today = new Date().toISOString().slice(0, 10);
    await prisma.apiUsageLog.upsert({
      where: { userId_type_date: { userId: session.user.id, type: "import", date: today } },
      create: { userId: session.user.id, type: "import", date: today, count: 1, inputTokens: input_tokens, outputTokens: output_tokens },
      update: { count: { increment: 1 }, inputTokens: { increment: input_tokens }, outputTokens: { increment: output_tokens } },
    });

    // 응답이 max_tokens로 잘렸는지 확인
    if (message.stop_reason === "max_tokens") {
      console.warn("Import analyze: response truncated by max_tokens");
      return Response.json(
        { error: "종목이 너무 많아 분석이 잘렸어요. 이미지를 나눠서 다시 시도해주세요." },
        { status: 400 }
      );
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "이미지에서 종목 정보를 찾을 수 없습니다." }, { status: 400 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // ticker 빈값 종목에 대해 자동 보완
    if (Array.isArray(parsed.holdings)) {
      await Promise.all(
        parsed.holdings.map(async (h: { ticker: string; name: string; country: string }) => {
          if (h.ticker) return;
          if (!h.name || !h.name.trim()) return;

          try {
            if (h.country === "KR") {
              // 정확 일치 우선 → 없으면 contains 폴백
              const exact = await prisma.stockMaster.findFirst({
                where: { name: h.name },
                select: { ticker: true },
              });
              if (exact) {
                h.ticker = exact.ticker;
              } else {
                const partial = await prisma.stockMaster.findFirst({
                  where: { name: { contains: h.name, mode: "insensitive" } },
                  select: { ticker: true },
                });
                if (partial) h.ticker = partial.ticker;
              }
            } else {
              const results = await getYahooSearch(h.name);
              if (results.length > 0) h.ticker = results[0].ticker;
            }
          } catch (lookupErr) {
            console.warn(`Ticker lookup failed for "${h.name}":`, lookupErr instanceof Error ? lookupErr.message : lookupErr);
            // 한 종목 실패가 전체 분석을 막지 않도록 무시
          }
        })
      );
    }

    return Response.json(parsed);
  } catch (err) {
    console.error("Import analyze error:", err);
    return Response.json({ error: "이미지 분석에 실패했습니다." }, { status: 500 });
  }
}
