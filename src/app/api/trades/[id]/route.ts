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
    // ── 매수 삭제 → Holding 차분 복원 + 예수금 복원 ──
    // [Phase 1] TradeLog 재집계 방식은 종목 등록(holdings 직접 생성)의
    // 초기 보유분(TradeLog 없음)을 무시하여 holding이 통째로 삭제되는
    // 버그가 있어 차분(delta) 방식으로 임시 대응.
    // Phase 2에서 initialQty/initialAvgPrice 필드 추가 + 시간순 시뮬레이션으로 정밀화 예정.

    if (holding) {
      const newQty = holding.quantity - trade.quantity;

      if (newQty <= 0) {
        await prisma.holding.delete({ where: { id: holding.id } });
      } else {
        // 평단가 역산: (현재 총비용 - 삭제분 비용) / 새 수량
        const totalCost = holding.avgPrice * holding.quantity;
        const deletedCost = trade.price * trade.quantity;
        const newAvgPrice = (totalCost - deletedCost) / newQty;

        await prisma.holding.update({
          where: { id: holding.id },
          data: {
            quantity: newQty,
            avgPrice: Math.max(0, newAvgPrice),
          },
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
      // Holding이 삭제된 경우 — 매수 기록에서 평단가 재계산 후 다시 생성
      const buys = await prisma.tradeLog.findMany({
        where: { accountId: trade.accountId, ticker: trade.ticker, type: "BUY" },
        select: { price: true, quantity: true },
      });
      const totalBuyQty = buys.reduce((s, t) => s + t.quantity, 0);
      const totalBuyCost = buys.reduce((s, t) => s + t.price * t.quantity, 0);
      const avgPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : trade.price;

      await prisma.holding.create({
        data: {
          accountId: trade.accountId,
          ticker: trade.ticker,
          name: trade.name,
          country,
          avgPrice,
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

  // 매매 기록 삭제 — cashLog는 외래 키(tradeLogId) cascade로 자동 삭제
  await prisma.tradeLog.delete({ where: { id: tradeId } });

  return Response.json({ success: true });
}
