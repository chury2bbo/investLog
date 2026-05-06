import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const DAILY_LIMIT = 10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const usage = await prisma.apiUsageLog.findUnique({
    where: { userId_type_date: { userId: session.user.id, type: "analysis", date: today } },
  });

  return Response.json({
    count: usage?.count ?? 0,
    limit: DAILY_LIMIT,
  });
}
