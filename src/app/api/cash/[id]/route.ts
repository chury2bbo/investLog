import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const logId = parseInt(id, 10);
  if (isNaN(logId)) {
    return Response.json({ error: "잘못된 ID" }, { status: 400 });
  }

  // 소유권 확인 + 로그 조회
  const log = await prisma.cashLog.findFirst({
    where: { id: logId, account: { userId: session.user.id } },
  });
  if (!log) {
    return Response.json({ error: "이력을 찾을 수 없습니다." }, { status: 404 });
  }

  // 예수금 역산 (배당금은 입금이었으므로 차감)
  const cashBalance = await prisma.cashBalance.findFirst({
    where: { accountId: log.accountId, currency: log.currency },
  });
  if (cashBalance) {
    const newAmount = cashBalance.amount - log.amount;
    if (newAmount < 0) {
      return Response.json(
        { error: `예수금이 부족합니다. (현재 ${log.currency === "KRW" ? `₩${cashBalance.amount.toLocaleString()}` : `$${cashBalance.amount.toFixed(2)}`})` },
        { status: 400 }
      );
    }
    await prisma.cashBalance.update({
      where: { id: cashBalance.id },
      data: { amount: newAmount },
    });
  }

  await prisma.cashLog.delete({ where: { id: logId } });

  return Response.json({ ok: true });
}
