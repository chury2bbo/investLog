import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── GET: 입출금 이력 조회 ───────────────────────────────

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return Response.json({ error: "accountId 필요" }, { status: 400 });
  }

  // 계좌 소유권 확인
  const account = await prisma.investAccount.findFirst({
    where: { id: parseInt(accountId, 10), userId: session.user.id },
  });
  if (!account) {
    return Response.json({ error: "계좌를 찾을 수 없습니다." }, { status: 404 });
  }

  const logs = await prisma.cashLog.findMany({
    where: { accountId: account.id },
    orderBy: { date: "desc" },
    take: 20,
  });

  return Response.json(logs);
}

// ─── POST: 입출금 처리 ──────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { accountId, type, currency, amount } = body;

  if (!accountId || !type || !currency || !amount) {
    return Response.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }

  if (!["DEPOSIT", "WITHDRAW"].includes(type)) {
    return Response.json({ error: "type은 DEPOSIT 또는 WITHDRAW" }, { status: 400 });
  }

  // 계좌 소유권 확인
  const account = await prisma.investAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
    include: { cashBalances: true },
  });
  if (!account) {
    return Response.json({ error: "계좌를 찾을 수 없습니다." }, { status: 404 });
  }

  const cashBalance = account.cashBalances.find((c) => c.currency === currency);
  const currentAmount = cashBalance?.amount ?? 0;
  const delta = type === "DEPOSIT" ? amount : -amount;
  const newAmount = currentAmount + delta;

  // 출금 시 잔고 부족 체크
  if (type === "WITHDRAW" && newAmount < 0) {
    return Response.json({ error: "잔고가 부족합니다." }, { status: 400 });
  }

  // 예수금 업데이트
  if (cashBalance) {
    await prisma.cashBalance.update({
      where: { id: cashBalance.id },
      data: { amount: newAmount },
    });
  } else {
    await prisma.cashBalance.create({
      data: { accountId, currency, amount: delta },
    });
  }

  // 입출금 로그
  const log = await prisma.cashLog.create({
    data: {
      date: new Date(),
      accountId,
      type,
      currency,
      amount: delta,
      memo: type === "DEPOSIT" ? "입금" : "출금",
    },
  });

  return Response.json(log, { status: 201 });
}
