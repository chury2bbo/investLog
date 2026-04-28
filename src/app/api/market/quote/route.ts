import { after } from "next/server";
import { auth } from "@/auth";
import { getKisQuote, getKisSector } from "@/lib/kis";
import { getYahooQuote, getYahooFinancials, getUsdKrwRate } from "@/lib/yahoo";
import { prisma } from "@/lib/prisma";

function isDomestic(ticker: string) {
  return /^\d{6}$/.test(ticker);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // ── 환율 조회 ──────────────────────────────────────────
  const singleTicker = searchParams.get("ticker");
  if (singleTicker === "USDKRW") {
    try {
      const price = await getUsdKrwRate();
      return Response.json({ ticker: "USDKRW", price });
    } catch {
      return Response.json({ ticker: "USDKRW", price: 1400 });
    }
  }

  // ── 종목 현재가 일괄 조회 ──────────────────────────────
  const tickersParam = searchParams.get("tickers");
  if (!tickersParam) return Response.json({ quotes: [] });

  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const detailed = searchParams.get("detailed") === "true";

  const quotes = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        let quote;
        if (isDomestic(ticker)) {
          quote = await getKisQuote(ticker);
          // 국내: ROE는 yahoo quoteSummary로 보충
          if (detailed) {
            const [financials, yahooQ] = await Promise.all([
              getYahooFinancials(ticker),
              getYahooQuote(ticker).catch(() => null),
            ]);
            return {
              ...quote,
              roe: financials.roe,
              forwardPer: yahooQ?.forwardPer ?? null,
              forwardPbr: null,
              fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? yahooQ?.fiftyTwoWeekHigh ?? null,
              fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? yahooQ?.fiftyTwoWeekLow ?? null,
            };
          }
          return quote;
        }
        quote = await getYahooQuote(ticker);
        if (detailed) {
          const financials = await getYahooFinancials(ticker);
          return { ...quote, roe: financials.roe };
        }
        return quote;
      } catch {
        try {
          return await getYahooQuote(ticker);
        } catch {
          return { ticker, price: 0, change: 0, changePercent: 0 };
        }
      }
    })
  );

  // 응답 전송 후 sectorAuto가 null인 국내 종목 자가 치유
  const domesticTickers = tickers.filter(isDomestic);
  if (domesticTickers.length > 0) {
    const userId = session.user.id;
    after(async () => {
      const nullSectorHoldings = await prisma.holding.findMany({
        where: {
          ticker: { in: domesticTickers },
          sectorAuto: null,
          account: { userId },
        },
        select: { id: true, ticker: true },
      });
      for (const h of nullSectorHoldings) {
        const { sector } = await getKisSector(h.ticker);
        if (sector) {
          await prisma.holding.update({
            where: { id: h.id },
            data: { sectorAuto: sector },
          });
        }
      }
    });
  }

  return Response.json({ quotes });
}
