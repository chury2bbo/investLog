import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getYahooSector } from "@/lib/yahoo";
import { getKisSector } from "@/lib/kis";

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
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const month = searchParams.get("month"); // YYYY-MM (캘린더용)
  const keyword = searchParams.get("keyword");
  const market = searchParams.get("market"); // KR | US
  const skip = parseInt(searchParams.get("skip") ?? "0", 10);
  const take = parseInt(searchParams.get("take") ?? "20", 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    account: { userId: session.user.id },
  };

  if (accountId) where.accountId = parseInt(accountId, 10);
  if (type) where.type = type;
  if (reasonTag) where.reasonTags = { has: reasonTag };

  // 날짜 필터
  if (month) {
    // YYYY-MM → 해당 월 전체
    const [y, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  } else if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  // 종목명/티커 검색
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { ticker: { contains: keyword, mode: "insensitive" } },
    ];
  }

  let trades = await prisma.tradeLog.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      account: {
        select: { memo: true, brokerageCompany: { select: { name: true } } },
      },
    },
  });

  // 국내/해외 필터 (DB에서 regex 불가 → 앱 레벨 필터)
  if (market === "KR") {
    trades = trades.filter((t) => /^\d{6}$/.test(t.ticker));
  } else if (market === "US") {
    trades = trades.filter((t) => !/^\d{6}$/.test(t.ticker));
  }

  const total = trades.length;
  const paginated = trades.slice(skip, skip + take);

  return Response.json({ data: paginated, total });
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
    date: bodyDate,
    country: bodyCountry,
    reasonTags = [],
    emotion,
    reasonMemo,
    memo,
    sectorAuto,
    sectorManual,
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

  // 통화 결정: body에서 받은 country 우선, 없으면 기존 holding 또는 티커 패턴으로 판별
  const country = bodyCountry ?? holding?.country ?? (ticker.length <= 6 && /^\d+$/.test(ticker) ? "KR" : "US");
  const currency = country === "KR" ? "KRW" : "USD";
  const cashBalance = account.cashBalances.find((c) => c.currency === currency);
  const currentCash = cashBalance?.amount ?? 0;

  if (type === "BUY") {
    // ── 매수 ──────────────────────────────────────────

    // 예수금 부족 경고 (차단 아님)
    if (currentCash < tradeAmount) {
      cashWarning = true;
    }

    // sectorAuto 자동 조회 (신규 종목이거나 기존에 없는 경우)
    // 국내(6자리 숫자) → KIS API, 해외 → Yahoo Finance
    let resolvedSectorAuto = sectorAuto;
    if (!resolvedSectorAuto && (!holding || !holding.sectorAuto)) {
      try {
        const isDomestic = /^\d{6}$/.test(ticker);
        const sectorInfo = isDomestic
          ? await getKisSector(ticker)
          : await getYahooSector(ticker);
        resolvedSectorAuto = sectorInfo.sector;
      } catch { /* 섹터 조회 실패 시 무시 */ }
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
          ...(resolvedSectorAuto && !holding.sectorAuto ? { sectorAuto: resolvedSectorAuto } : {}),
          ...(sectorManual ? { sectorManual } : {}),
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
          ...(resolvedSectorAuto ? { sectorAuto: resolvedSectorAuto } : {}),
          ...(sectorManual ? { sectorManual } : {}),
        },
      });
    }

    // 예수금 차감 (마이너스 시 0으로 처리)
    if (cashBalance) {
      await prisma.cashBalance.update({
        where: { id: cashBalance.id },
        data: { amount: Math.max(0, currentCash - tradeAmount) },
      });
    } else {
      // 예수금 레코드가 없으면 0으로 생성
      await prisma.cashBalance.create({
        data: {
          accountId,
          currency,
          amount: 0,
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
      date: bodyDate ? new Date(bodyDate) : new Date(),
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
      date: bodyDate ? new Date(bodyDate) : new Date(),
      accountId,
      type: type === "BUY" ? "TRADE_BUY" : "TRADE_SELL",
      currency,
      amount: type === "BUY" ? -tradeAmount : tradeAmount,
      memo: `${name} ${type === "BUY" ? "매수" : "매도"} ${quantity}주`,
    },
  });

  return Response.json({ ...tradeLog, cashWarning });
}
