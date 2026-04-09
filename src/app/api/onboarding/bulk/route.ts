import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKisSector } from "@/lib/kis";
import { getYahooSector } from "@/lib/yahoo";

/** 섹터 조회 (실패 시 null) */
async function fetchSector(ticker: string): Promise<string | null> {
  try {
    const isDomestic = /^\d{6}$/.test(ticker);
    const info = isDomestic
      ? await getKisSector(ticker)
      : await getYahooSector(ticker);
    return info.sector ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { accounts, trade } = await req.json();

  try {
    // ─── 1단계: 섹터를 트랜잭션 밖에서 미리 조회 ──────────
    const sectorCache = new Map<string, string | null>();

    for (const acc of accounts ?? []) {
      for (const h of acc.holdings ?? []) {
        if (h.ticker && !sectorCache.has(h.ticker)) {
          sectorCache.set(h.ticker, await fetchSector(h.ticker));
        }
      }
    }
    if (trade?.ticker && !sectorCache.has(trade.ticker)) {
      sectorCache.set(trade.ticker, await fetchSector(trade.ticker));
    }

    // ─── 2단계: DB 작업만 트랜잭션으로 ───────────────────
    await prisma.$transaction(async (tx) => {
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

          for (const h of acc.holdings as {
            ticker: string; name: string; country: string;
            avgPrice: number; quantity: number;
            sectorManual?: string; tags?: string[];
          }[]) {
            if (!h.ticker || seenTickers.has(h.ticker)) continue;
            seenTickers.add(h.ticker);

            await tx.holding.create({
              data: {
                accountId: created.id,
                ticker: h.ticker,
                name: h.name,
                country: h.country,
                avgPrice: h.avgPrice,
                quantity: h.quantity,
                sectorAuto: sectorCache.get(h.ticker) ?? null,
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
              await tx.holding.create({
                data: {
                  accountId: accountEntry.id,
                  ticker: trade.ticker,
                  name: trade.name,
                  country,
                  avgPrice: trade.price,
                  quantity: trade.quantity,
                  sectorAuto: sectorCache.get(trade.ticker) ?? null,
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
