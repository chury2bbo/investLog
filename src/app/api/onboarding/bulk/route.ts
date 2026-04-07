import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKisSector } from "@/lib/kis";
import { getYahooSector } from "@/lib/yahoo";

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

      // 보유종목 + sectorAuto 자동 조회
      if (acc.holdings?.length > 0) {
        const seenTickers = new Set<string>();

        for (const h of acc.holdings as {
          ticker: string; name: string; country: string;
          avgPrice: number; quantity: number;
          sectorManual?: string; tags?: string[];
        }[]) {
          if (!h.ticker || seenTickers.has(h.ticker)) continue;
          seenTickers.add(h.ticker);

          // 섹터 자동 조회
          let sectorAuto: string | null = null;
          try {
            const isDomestic = /^\d{6}$/.test(h.ticker);
            const info = isDomestic
              ? await getKisSector(h.ticker)
              : await getYahooSector(h.ticker);
            sectorAuto = info.sector ?? null;
          } catch { /* 섹터 조회 실패 시 무시 */ }

          await tx.holding.create({
            data: {
              accountId: created.id,
              ticker: h.ticker,
              name: h.name,
              country: h.country,
              avgPrice: h.avgPrice,
              quantity: h.quantity,
              sectorAuto,
              sectorManual: h.sectorManual ?? null,
              tags: h.tags ?? [],
            },
          });
        }
      }
    }

    // 첫 매매 기록 + holding 연동
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

        // 매수인 경우 holding 생성/업데이트
        if (trade.type === "BUY") {
          const country = trade.ticker.length <= 6 && /^\d+$/.test(trade.ticker) ? "KR" : "US";
          const existing = await tx.holding.findFirst({
            where: { accountId: accountEntry.id, ticker: trade.ticker },
          });

          if (existing) {
            const totalQty = existing.quantity + trade.quantity;
            const newAvgPrice =
              (existing.avgPrice * existing.quantity + trade.price * trade.quantity) / totalQty;
            await tx.holding.update({
              where: { id: existing.id },
              data: { avgPrice: newAvgPrice, quantity: totalQty },
            });
          } else {
            // 섹터 자동 조회
            let sectorAuto: string | null = null;
            try {
              const isDomestic = /^\d{6}$/.test(trade.ticker);
              const info = isDomestic
                ? await getKisSector(trade.ticker)
                : await getYahooSector(trade.ticker);
              sectorAuto = info.sector ?? null;
            } catch { /* 섹터 조회 실패 시 무시 */ }

            await tx.holding.create({
              data: {
                accountId: accountEntry.id,
                ticker: trade.ticker,
                name: trade.name,
                country,
                avgPrice: trade.price,
                quantity: trade.quantity,
                sectorAuto,
              },
            });
          }
        }
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
