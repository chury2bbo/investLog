import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── GET: 입출금/배당 이력 조회 ──────────────────────────────

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const type = searchParams.get("type");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const keyword = searchParams.get("keyword");

  // ─── 배당 이력 조회 (전체 계좌 또는 특정 계좌) ────────────
  if (type === "DIVIDEND") {
    const userAccounts = await prisma.investAccount.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const userAccountIds = userAccounts.map((a) => a.id);

    const parsedAccountId = accountId ? parseInt(accountId, 10) : null;
    if (parsedAccountId && !userAccountIds.includes(parsedAccountId)) {
      return Response.json({ error: "계좌를 찾을 수 없습니다." }, { status: 404 });
    }

    const logs = await prisma.cashLog.findMany({
      where: {
        accountId: parsedAccountId ? parsedAccountId : { in: userAccountIds },
        type: "DIVIDEND",
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
              },
            }
          : {}),
        ...(keyword
          ? {
              OR: [
                { ticker: { contains: keyword, mode: "insensitive" } },
                { memo: { contains: keyword, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        account: {
          select: {
            memo: true,
            brokerageCompany: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    // StockMaster에서 종목명 일괄 조회
    const tickers = [...new Set(logs.map((l) => l.ticker).filter(Boolean) as string[])];
    const stocks = tickers.length > 0
      ? await prisma.stockMaster.findMany({
          where: { ticker: { in: tickers } },
          select: { ticker: true, name: true },
        })
      : [];
    const stockNameMap: Record<string, string> = Object.fromEntries(stocks.map((s) => [s.ticker, s.name]));

    return Response.json(
      logs.map((l) => ({
        ...l,
        stockName: l.ticker ? (stockNameMap[l.ticker] ?? null) : null,
      }))
    );
  }

  // ─── 기존: 입출금 이력 조회 (accountId 필수) ──────────────
  if (!accountId) {
    return Response.json({ error: "accountId 필요" }, { status: 400 });
  }

  const parsedAccountId = parseInt(accountId, 10);
  if (isNaN(parsedAccountId)) return Response.json({ error: "잘못된 accountId" }, { status: 400 });

  const account = await prisma.investAccount.findFirst({
    where: { id: parsedAccountId, userId: session.user.id },
  });
  if (!account) {
    return Response.json({ error: "계좌를 찾을 수 없습니다." }, { status: 404 });
  }

  const logs = await prisma.cashLog.findMany({
    where: { accountId: account.id, ...(type ? { type } : {}) },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    ...(type ? {} : { take: 20 }),
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
  const { accountId, type, currency, amount, ticker, name, date } = body;

  if (!accountId || !type || !currency || !amount) {
    return Response.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }

  if (!["DEPOSIT", "WITHDRAW", "DIVIDEND"].includes(type)) {
    return Response.json({ error: "type은 DEPOSIT, WITHDRAW 또는 DIVIDEND" }, { status: 400 });
  }

  if (type === "DIVIDEND" && !ticker) {
    return Response.json({ error: "배당금은 종목(ticker)이 필요합니다." }, { status: 400 });
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
  const delta = type === "WITHDRAW" ? -amount : amount;
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
      date: date ? new Date(date) : new Date(),
      accountId,
      type,
      currency,
      amount: delta,
      memo: type === "DEPOSIT" ? "입금" : type === "WITHDRAW" ? "출금" : (name || "배당금"),
      ticker: type === "DIVIDEND" ? ticker : null,
    },
  });

  return Response.json(log, { status: 201 });
}
