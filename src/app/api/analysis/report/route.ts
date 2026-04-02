// AI 종목 분석 리포트 — 당일 캐시 + 사용자 10회/일 제한
// POST /api/analysis/report  { ticker, name, price, per, pbr, high52w, low52w, sector }

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const DAILY_LIMIT = 10;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const today = todayStr();

  const { ticker, name, price, per, pbr, high52w, low52w, sector, currency } =
    await req.json();
  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });

  // ── 당일 캐시 확인 ─────────────────────────────────────
  const cached = await prisma.tickerAnalysisCache.findUnique({ where: { ticker } });
  if (cached && cached.cachedDate === today) {
    return Response.json({
      ticker,
      recommendation: cached.recommendation,
      targetBuy: cached.targetBuy,
      targetSell: cached.targetSell,
      swot: {
        strength: cached.swotStrength,
        weakness: cached.swotWeakness,
        opportunity: cached.swotOpportunity,
        threat: cached.swotThreat,
      },
      reasoning: cached.reasoning,
      cached: true,
    });
  }

  // ── 사용자 일일 한도 확인 ──────────────────────────────
  const usage = await prisma.apiUsageLog.findUnique({
    where: { userId_type_date: { userId, type: "analysis", date: today } },
  });
  if (usage && usage.count >= DAILY_LIMIT) {
    return Response.json(
      { error: `일일 분석 한도(${DAILY_LIMIT}회)를 초과했습니다. 내일 다시 시도해주세요.` },
      { status: 429 }
    );
  }

  // ── Claude API 호출 ────────────────────────────────────
  const sym = currency === "USD" ? "$" : "₩";
  const prompt = `
다음 주식 종목을 분석하고 JSON 형식으로 응답해줘.

종목명: ${name}
티커: ${ticker}
현재가: ${sym}${price?.toLocaleString() ?? "N/A"}
${per != null ? `PER: ${per}` : ""}
${pbr != null ? `PBR: ${pbr}` : ""}
${high52w != null ? `52주 최고: ${sym}${high52w.toLocaleString()}` : ""}
${low52w != null ? `52주 최저: ${sym}${low52w.toLocaleString()}` : ""}
${sector ? `섹터: ${sector}` : ""}

아래 JSON 형식으로만 응답해줘 (다른 텍스트 없이):
{
  "recommendation": "BUY" | "HOLD" | "SELL",
  "targetBuy": "적정 매수가 (예: ₩65,000~70,000 또는 $140~150)",
  "targetSell": "적정 매도가 (예: ₩90,000 이상 또는 $200 이상)",
  "swot": {
    "strength": "강점 1~2줄",
    "weakness": "약점 1~2줄",
    "opportunity": "기회 1~2줄",
    "threat": "위협 1~2줄"
  },
  "reasoning": "투자 의견 근거 2~3줄"
}
`.trim();

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

    // JSON 파싱
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON parse failed");
    const parsed = JSON.parse(jsonMatch[0]);

    const result = {
      recommendation: parsed.recommendation ?? "HOLD",
      targetBuy: parsed.targetBuy ?? "-",
      targetSell: parsed.targetSell ?? "-",
      swotStrength: parsed.swot?.strength ?? "-",
      swotWeakness: parsed.swot?.weakness ?? "-",
      swotOpportunity: parsed.swot?.opportunity ?? "-",
      swotThreat: parsed.swot?.threat ?? "-",
      reasoning: parsed.reasoning ?? "-",
      cachedDate: today,
    };

    // 당일 캐시 저장
    await prisma.tickerAnalysisCache.upsert({
      where: { ticker },
      update: result,
      create: { ticker, ...result },
    });

    // 사용량 카운트 증가
    await prisma.apiUsageLog.upsert({
      where: { userId_type_date: { userId, type: "analysis", date: today } },
      update: { count: { increment: 1 } },
      create: { userId, type: "analysis", date: today, count: 1 },
    });

    return Response.json({
      ticker,
      recommendation: result.recommendation,
      targetBuy: result.targetBuy,
      targetSell: result.targetSell,
      swot: {
        strength: result.swotStrength,
        weakness: result.swotWeakness,
        opportunity: result.swotOpportunity,
        threat: result.swotThreat,
      },
      reasoning: result.reasoning,
      cached: false,
    });
  } catch (e) {
    console.error("analysis/report error:", e);
    return Response.json({ error: "분석 생성에 실패했습니다." }, { status: 500 });
  }
}
