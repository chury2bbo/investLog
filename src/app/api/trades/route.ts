import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── GET: 매매 목록 조회 (필터 지원) ─────────────────────

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const type = searchParams.get("type"); // BUY | SELL
  const reasonTag = searchParams.get("reasonTag");

  const where: Record<string, unknown> = {
    account: { userId: session.user.id },
  };

  if (accountId) where.accountId = parseInt(accountId, 10);
  if (type) where.type = type;
  if (reasonTag) where.reasonTags = { has: reasonTag };

  const trades = await prisma.tradeLog.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      account: {
        select: { brokerageCompany: { select: { name: true } } },
      },
    },
  });

  return Response.json(trades);
}

// ─── POST: 매매 등록 ────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    accountId,
    ticker,
    name,
    type, // "BUY" | "SELL"
    price,
    quantity,
    reasonTags = [],
    emotion,
    reasonMemo,
    memo,
    sectorAuto,
  } = body;

  // 필수 필드 검증
  if (!accountId || !ticker || !name || !type || !price || !quantity) {
    return Response.json(
      { error: "필수 항목을 모두 입력해주세요." },
      { status: 400 }
    );
  }

  if (!["BUY", "SELL"].includes(type)) {
    return Response.json(
      { error: "type은 BUY 또는 SELL이어야 합니다." },
      { status: 400 }
    );
  }

  // 계좌 소유권 확인
  const account = await prisma.investAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
    include: {
      holdings: { where: { ticker } },
      cashBalances: true,
    },
  });

  if (!account) {
    return Response.json(
      { error: "계좌를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const tradeAmount = price * quantity;
  const holding = account.holdings[0] ?? null;
  let cashWarning = false;

  // 통화 결정: 국내 → KRW, 해외 → USD
  const country = holding?.country ?? (ticker.length <= 6 && /^\d+$/.test(ticker) ? "KR" : "US");
  const currency = country === "KR" ? "KRW" : "USD";
  const cashBalance = account.cashBalances.find((c) => c.currency === currency);
  const currentCash = cashBalance?.amount ?? 0;

  if (type === "BUY") {
    // ── 매수 ──────────────────────────────────────────

    // 예수금 부족 경고 (차단 아님)
    if (currentCash < tradeAmount) {
      cashWarning = true;
    }

    // holdings upsert: 평단가 재계산
    if (holding) {
      const totalQty = holding.quantity + quantity;
      const newAvgPrice =
        (holding.avgPrice * holding.quantity + price * quantity) / totalQty;

      await prisma.holding.update({
        where: { id: holding.id },
        data: {
          avgPrice: newAvgPrice,
          quantity: totalQty,
          ...(sectorAuto ? { sectorAuto } : {}),
        },
      });
    } else {
      await prisma.holding.create({
        data: {
          accountId,
          ticker,
          name,
          country,
          avgPrice: price,
          quantity,
          ...(sectorAuto ? { sectorAuto } : {}),
        },
      });
    }

    // 예수금 차감
    if (cashBalance) {
      await prisma.cashBalance.update({
        where: { id: cashBalance.id },
        data: { amount: currentCash - tradeAmount },
      });
    } else {
      // 예수금 레코드가 없으면 마이너스로 생성
      await prisma.cashBalance.create({
        data: {
          accountId,
          currency,
          amount: -tradeAmount,
        },
      });
    }
  } else {
    // ── 매도 ──────────────────────────────────────────

    if (!holding || holding.quantity < quantity) {
      return Response.json(
        { error: "보유 수량이 부족합니다." },
        { status: 400 }
      );
    }

    const remainQty = holding.quantity - quantity;

    if (remainQty === 0) {
      await prisma.holding.delete({ where: { id: holding.id } });
    } else {
      await prisma.holding.update({
        where: { id: holding.id },
        data: { quantity: remainQty },
      });
    }

    // 예수금 증가
    if (cashBalance) {
      await prisma.cashBalance.update({
        where: { id: cashBalance.id },
        data: { amount: currentCash + tradeAmount },
      });
    } else {
      await prisma.cashBalance.create({
        data: {
          accountId,
          currency,
          amount: tradeAmount,
        },
      });
    }
  }

  // 매매 기록 저장
  const tradeLog = await prisma.tradeLog.create({
    data: {
      date: new Date(),
      accountId,
      ticker,
      name,
      type,
      price,
      quantity,
      reasonTags,
      emotion: emotion || null,
      reasonMemo: reasonMemo || null,
      memo: memo || null,
    },
  });

  // 예수금 변동 로그
  await prisma.cashLog.create({
    data: {
      date: new Date(),
      accountId,
      type: type === "BUY" ? "TRADE_BUY" : "TRADE_SELL",
      currency,
      amount: type === "BUY" ? -tradeAmount : tradeAmount,
      memo: `${name} ${type === "BUY" ? "매수" : "매도"} ${quantity}주`,
    },
  });

  return Response.json({ ...tradeLog, cashWarning });
}
