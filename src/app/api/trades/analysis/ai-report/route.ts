import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // ─── 3회/일 제한 확인 ─────────────────────────────────

  const usageLog = await prisma.apiUsageLog.findUnique({
    where: {
      userId_type_date: {
        userId: session.user.id,
        type: "personality_report",
        date: today,
      },
    },
  });

  if (usageLog && usageLog.count >= 3) {
    return Response.json({
      error: "오늘 AI 성향 리포트 생성 횟수(3회)를 초과했습니다.",
      remaining: 0,
    }, { status: 429 });
  }

  // ─── 매매 데이터 조회 ─────────────────────────────────

  const trades = await prisma.tradeLog.findMany({
    where: { account: { userId: session.user.id } },
    orderBy: { date: "desc" },
    take: 100,
  });

  if (trades.length < 10) {
    return Response.json({
      error: "매매 기록이 10건 이상 필요합니다.",
      totalCount: trades.length,
    }, { status: 400 });
  }

  // ─── Claude API 호출 ──────────────────────────────────

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  // 매매 데이터 요약
  const tradeSummary = trades.map((t) => ({
    date: new Date(t.date).toISOString().slice(0, 10),
    ticker: t.ticker,
    name: t.name,
    type: t.type,
    price: t.price,
    quantity: t.quantity,
    reasonTags: t.reasonTags,
    emotion: t.emotion,
  }));

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `다음은 한 투자자의 최근 매매 기록입니다:

${JSON.stringify(tradeSummary, null, 2)}

이 데이터를 분석해서 투자 성향 리포트를 작성해줘.

다음 JSON 형식으로 응답해:
{
  "investorType": "투자 스타일 유형 (예: 모멘텀 추격자, 가치투자자, 분산투자자 등) 한 줄",
  "typeDescription": "유형에 대한 설명 2~3줄",
  "goodPatterns": ["잘하고 있는 패턴 1", "잘하고 있는 패턴 2", "잘하고 있는 패턴 3"],
  "badPatterns": ["반복되는 실수 1", "반복되는 실수 2", "반복되는 실수 3"],
  "recommendations": ["개선 권고 1", "개선 권고 2", "개선 권고 3"],
  "emotionAnalysis": "감정과 수익률의 관계 분석 2~3줄",
  "summary": "종합 한줄평"
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

    const report = JSON.parse(jsonMatch[0]);

    // 사용 횟수 증가
    await prisma.apiUsageLog.upsert({
      where: {
        userId_type_date: {
          userId: session.user.id,
          type: "personality_report",
          date: today,
        },
      },
      create: {
        userId: session.user.id,
        type: "personality_report",
        date: today,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });

    const remaining = 3 - ((usageLog?.count ?? 0) + 1);

    return Response.json({ report, remaining });
  } catch (err) {
    console.error("AI Report error:", err);
    return Response.json({ error: "AI 리포트 생성에 실패했습니다." }, { status: 500 });
  }
}
