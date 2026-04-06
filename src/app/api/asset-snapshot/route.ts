import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── GET: 월별 스냅샷 조회 ──────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshots = await prisma.monthlyAssetSnapshot.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
    select: {
      date: true,
      cashTotal: true,
      investedAmount: true,
      evaluatedAmount: true,
      usdRate: true,
    },
  });

  return Response.json(snapshots);
}

// ─── POST: 당월 스냅샷 upsert ───────────────────────────────
// 대시보드 접속 시 호출 — 이번 달 1일 기준으로 upsert
// body: { cashTotal, investedAmount, evaluatedAmount, usdRate }

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { cashTotal, investedAmount, evaluatedAmount, usdRate } = body;

    if (
      typeof cashTotal !== "number" ||
      typeof investedAmount !== "number" ||
      typeof evaluatedAmount !== "number" ||
      typeof usdRate !== "number"
    ) {
      return Response.json({ error: "Invalid data" }, { status: 400 });
    }

    // 당월 1일 날짜 계산
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    const snapshot = await prisma.monthlyAssetSnapshot.upsert({
      where: {
        userId_date: {
          userId,
          date: monthStart,
        },
      },
      create: {
        userId,
        date: monthStart,
        cashTotal,
        investedAmount,
        evaluatedAmount,
        usdRate,
      },
      update: {
        cashTotal,
        investedAmount,
        evaluatedAmount,
        usdRate,
      },
    });

    return Response.json({ success: true, snapshot });
  } catch (error) {
    console.error("Snapshot upsert error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
