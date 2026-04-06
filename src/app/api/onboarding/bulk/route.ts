import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { accounts, trade } = await req.json();

  try {
  await prisma.$transaction(async (tx) => {
    // 계좌 생성 + 인덱스 매핑 (trade.accountIndex 대응용)
    const createdAccounts: { index: number; id: number }[] = [];

    for (let i = 0; i < (accounts ?? []).length; i++) {
      const acc = accounts[i];
      if (!acc.accountCode) continue;

      const created = await tx.investAccount.create({
        data: { userId, accountCode: acc.accountCode },
      });

      createdAccounts.push({ index: i, id: created.id });

      // 예수금
      if (acc.cashBalances?.length > 0) {
        await tx.cashBalance.createMany({
          data: acc.cashBalances.map((cb: { currency: string; amount: number }) => ({
            accountId: created.id,
            currency: cb.currency,
            amount: cb.amount,
          })),
        });
      }

      // 보유종목
      if (acc.holdings?.length > 0) {
        const seenTickers = new Set<string>();
        let emptyCount = 0;

        const holdingsData = acc.holdings
          .map((h: {
            ticker: string;
            name: string;
            country: string;
            avgPrice: number;
            quantity: number;
            sectorManual?: string;
            tags?: string[];
          }) => ({
            accountId: created.id,
            ticker: h.ticker || `__unknown_${emptyCount++}`,
            name: h.name,
            country: h.country,
            avgPrice: h.avgPrice,
            quantity: h.quantity,
            sectorManual: h.sectorManual ?? null,
            tags: h.tags ?? [],
          }))
          .filter((h: { ticker: string }) => {
            if (seenTickers.has(h.ticker)) return false;
            seenTickers.add(h.ticker);
            return true;
          });

        await tx.holding.createMany({ data: holdingsData });
      }
    }

    // 첫 매매 기록
    if (trade?.ticker && trade?.price && trade?.quantity) {
      const accountEntry = createdAccounts.find((a) => a.index === trade.accountIndex);
      if (accountEntry) {
        await tx.tradeLog.create({
          data: {
            accountId: accountEntry.id,
            date: new Date(),
            ticker: trade.ticker,
            name: trade.name,
            type: trade.type,
            price: trade.price,
            quantity: trade.quantity,
            reasonTags: trade.reasonTags ?? [],
          },
        });
      }
    }

    // 온보딩 완료 처리
    await tx.user.update({
      where: { id: userId },
      data: { onboardingDone: true },
    });
  });
  } catch (err: unknown) {
    console.error("[onboarding/bulk] 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ success: true });
}
