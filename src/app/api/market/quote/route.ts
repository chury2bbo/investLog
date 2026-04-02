import { auth } from "@/auth";
import { getKisQuote } from "@/lib/kis";
import { getYahooQuote, getUsdKrwRate } from "@/lib/yahoo";

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

  const quotes = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        if (isDomestic(ticker)) {
          return await getKisQuote(ticker);
        }
        return await getYahooQuote(ticker);
      } catch {
        // KIS 장애 시 yahoo 폴백
        try {
          return await getYahooQuote(ticker);
        } catch {
          return { ticker, price: 0, change: 0, changePercent: 0 };
        }
      }
    })
  );

  return Response.json({ quotes });
}
