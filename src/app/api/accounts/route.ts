import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── GET: 계좌 목록 조회 ─────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.investAccount.findMany({
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
  const { accountCode, memo, cashKRW, cashUSD } = body;

  if (!accountCode) {
    return Response.json(
      { error: "증권사를 선택해주세요." },
      { status: 400 }
    );
  }

  // 동일 증권사 중복 체크
  const existing = await prisma.investAccount.findFirst({
    where: { userId: session.user.id, accountCode },
  });
  if (existing) {
    return Response.json(
      { error: "이미 등록된 증권사입니다." },
      { status: 409 }
    );
  }

  let account;
  try {
    account = await prisma.investAccount.create({
      data: {
        userId: session.user.id,
        accountCode,
        memo: memo || null,
      },
      include: {
        brokerageCompany: { select: { code: true, name: true } },
        holdings: true,
        cashBalances: true,
      },
    });
  } catch (err: unknown) {
    console.error("계좌 생성 에러:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 에러";
    return Response.json({ error: message }, { status: 500 });
  }

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
  const result = await prisma.investAccount.findUnique({
    where: { id: account.id },
    include: {
      brokerageCompany: { select: { code: true, name: true } },
      holdings: true,
      cashBalances: true,
    },
  });

  return Response.json(result, { status: 201 });
}
