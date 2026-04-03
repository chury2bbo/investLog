import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: 내가 분석한 종목 이력 (최근 5개, 중복 제거)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await prisma.$queryRaw<
    { ticker: string; name: string; country: string; createdAt: Date }[]
  >`
    SELECT ticker, name, country, "createdAt"
    FROM (
      SELECT DISTINCT ON (ticker) ticker, name, country, "createdAt"
      FROM user_analysis_logs
      WHERE "userId" = ${session.user.id}
      ORDER BY ticker, "createdAt" DESC
    ) sub
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;

  return Response.json(
    logs.map((l) => ({
      ticker: l.ticker,
      name: l.name,
      country: l.country,
      createdAt: l.createdAt,
    }))
  );
}

// POST: 분석 이력 기록
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticker, name, country } = await req.json();
  if (!ticker || !name) {
    return Response.json({ error: "ticker, name 필수" }, { status: 400 });
  }

  await prisma.$executeRaw`
    INSERT INTO user_analysis_logs ("userId", ticker, name, country, "createdAt")
    VALUES (${session.user.id}, ${ticker}, ${name}, ${country ?? "KR"}, NOW())
  `;

  return Response.json({ success: true });
}
