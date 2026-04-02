import { auth } from "@/auth";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function isDomestic(ticker: string) {
  return /^\d{6}$/.test(ticker);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  if (!ticker || !startDate || !endDate) {
    return Response.json({ error: "ticker, start, end 파라미터가 필요합니다." }, { status: 400 });
  }

  const symbol = isDomestic(ticker) ? `${ticker}.KS` : ticker;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    })) as any;

    const quotes = result.quotes ?? [];

    const data = quotes
      .filter((q: any) => q.close != null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString().slice(0, 10),
        close: Math.round(q.close * 100) / 100,
      }));

    return Response.json({ ticker, data });
  } catch {
    return Response.json({ ticker, data: [] });
  }
}
