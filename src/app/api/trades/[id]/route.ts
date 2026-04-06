import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── PATCH: 매매 기록 부분 수정 (태그, 심리, 메모) ──────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tradeId = parseInt(id, 10);
  if (isNaN(tradeId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 본인 매매 기록인지 확인
  const trade = await prisma.tradeLog.findFirst({
    where: {
      id: tradeId,
      account: { userId: session.user.id },
    },
  });

  if (!trade) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { reasonTags, emotion, memo } = body;

  const updated = await prisma.tradeLog.update({
    where: { id: tradeId },
    data: {
      ...(reasonTags !== undefined && { reasonTags }),
      ...(emotion !== undefined && { emotion }),
      ...(memo !== undefined && { memo }),
    },
  });

  return Response.json(updated);
}

// ─── DELETE: 매매 기록 삭제 + Holding/예수금 되돌리기 ────────

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tradeId = parseInt(id, 10);
  if (isNaN(tradeId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const trade = await prisma.tradeLog.findFirst({
    where: {
      id: tradeId,
      account: { userId: session.user.id },
    },
    include: {
      account: {
        include: {
          holdings: true,
          cashBalances: true,
        },
      },
    },
  });

  if (!trade) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const tradeAmount = trade.price * trade.quantity;
  const country = /^\d{6}$/.test(trade.ticker) ? "KR" : "US";
  const currency = country === "KR" ? "KRW" : "USD";
  const holding = trade.account.holdings.find((h) => h.ticker === trade.ticker);
  const cashBalance = trade.account.cashBalances.find((c) => c.currency === currency);

  if (trade.type === "BUY") {
    // ── 매수 삭제 → Holding 수량 차감 + 예수금 복원 ──

    if (holding) {
      const newQty = holding.quantity - trade.quantity;
      if (newQty <= 0) {
        // 수량이 0 이하면 Holding 삭제
        await prisma.holding.delete({ where: { id: holding.id } });
      } else {
        // 평단가 역산: (기존총액 - 삭제금액) / 남은수량
        const prevTotal = holding.avgPrice * holding.quantity;
        const newAvgPrice = (prevTotal - trade.price * trade.quantity) / newQty;
        await prisma.holding.update({
          where: { id: holding.id },
          data: { quantity: newQty, avgPrice: Math.max(0, newAvgPrice) },
        });
      }
    }

    // 예수금 복원
    if (cashBalance) {
      await prisma.cashBalance.update({
        where: { id: cashBalance.id },
        data: { amount: cashBalance.amount + tradeAmount },
      });
    }
  } else {
    // ── 매도 삭제 → Holding 수량 복원 + 예수금 차감 ──

    if (holding) {
      // 기존 Holding에 수량 추가 (평단가는 유지 — 매도 시 평단가 변경 안 했으므로)
      await prisma.holding.update({
        where: { id: holding.id },
        data: { quantity: holding.quantity + trade.quantity },
      });
    } else {
      // Holding이 삭제된 경우 — 다시 생성
      await prisma.holding.create({
        data: {
          accountId: trade.accountId,
          ticker: trade.ticker,
          name: trade.name,
          country,
          avgPrice: trade.price,
          quantity: trade.quantity,
        },
      });
    }

    // 예수금 차감
    if (cashBalance) {
      await prisma.cashBalance.update({
        where: { id: cashBalance.id },
        data: { amount: Math.max(0, cashBalance.amount - tradeAmount) },
      });
    }
  }

  // 매매 기록 삭제
  await prisma.tradeLog.delete({ where: { id: tradeId } });

  // 관련 예수금 변동 로그도 삭제
  await prisma.cashLog.deleteMany({
    where: {
      accountId: trade.accountId,
      memo: { contains: `${trade.name} ${trade.type === "BUY" ? "매수" : "매도"} ${trade.quantity}주` },
      date: trade.date,
    },
  });

  return Response.json({ success: true });
}
