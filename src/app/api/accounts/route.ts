import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── GET: 계좌 목록 조회 ─────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    include: {
      brokerageCompany: { select: { code: true, name: true } },
      holdings: true,
      cashBalances: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(accounts);
}

// ─── POST: 계좌 추가 ────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { accountCode, cashKRW, cashUSD } = body;

  if (!accountCode) {
    return Response.json(
      { error: "증권사를 선택해주세요." },
      { status: 400 }
    );
  }

  const account = await prisma.account.create({
    data: {
      userId: session.user.id,
      accountCode,
    },
    include: {
      brokerageCompany: { select: { code: true, name: true } },
      holdings: true,
      cashBalances: true,
    },
  });

  // 예수금 생성 (입력된 경우만)
  const cashPromises = [];
  if (cashKRW && parseFloat(cashKRW) > 0) {
    cashPromises.push(
      prisma.cashBalance.create({
        data: { accountId: account.id, currency: "KRW", amount: parseFloat(cashKRW) },
      })
    );
  }
  if (cashUSD && parseFloat(cashUSD) > 0) {
    cashPromises.push(
      prisma.cashBalance.create({
        data: { accountId: account.id, currency: "USD", amount: parseFloat(cashUSD) },
      })
    );
  }
  if (cashPromises.length > 0) await Promise.all(cashPromises);

  // 생성된 계좌 재조회 (cashBalances 포함)
  const result = await prisma.account.findUnique({
    where: { id: account.id },
    include: {
      brokerageCompany: { select: { code: true, name: true } },
      holdings: true,
      cashBalances: true,
    },
  });

  return Response.json(result, { status: 201 });
}
