import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";

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
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
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
              text: `이 이미지를 분석해줘.

1단계: 증권사 앱의 보유종목 또는 잔고 화면인지 판단해.
- 증권사 잔고/보유종목 화면이 아닌 경우: { "valid": false } 만 반환
- 종목명·수량·평단가를 전혀 읽을 수 없는 경우: { "valid": false } 만 반환

2단계: 유효한 화면이면 아래 JSON 형식으로 응답해줘.

규칙:
- avgPrice(평단가), quantity(수량)는 콤마/원/$ 없이 순수 숫자, 확인 안 되면 0
- ticker(종목코드)가 안 보이면 빈 문자열
- 국내 종목은 country "KR", 해외 종목은 "US"
- cashBalances는 예수금/잔고가 보이면 추출, 없으면 빈 배열

{
  "valid": true,
  "holdings": [
    { "name": "종목명", "ticker": "종목코드", "avgPrice": 0, "quantity": 0, "country": "KR" }
  ],
  "cashBalances": [
    { "currency": "KRW", "amount": 0 }
  ]
}

JSON만 응답해줘.`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "이미지에서 종목 정보를 찾을 수 없습니다." }, { status: 400 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch (err) {
    console.error("Import analyze error:", err);
    return Response.json({ error: "이미지 분석에 실패했습니다." }, { status: 500 });
  }
}
