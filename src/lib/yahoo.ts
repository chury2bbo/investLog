// yahoo-finance2 래퍼 — 해외 주식 현재가 + 환율

import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface YahooQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  per?: number | null;
  pbr?: number | null;
  forwardPer?: number | null;
  forwardPbr?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  roe?: number | null;
}

export async function getYahooQuote(ticker: string): Promise<YahooQuote> {
  // 국내 주식 폴백용: 6자리 숫자 → .KS 접미사
  const symbol = /^\d{6}$/.test(ticker) ? `${ticker}.KS` : ticker;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await yahooFinance.quote(symbol, undefined, {
    validateResult: false,
  })) as any;

  return {
    ticker,
    price: result.regularMarketPrice ?? 0,
    change: result.regularMarketChange ?? 0,
    changePercent: result.regularMarketChangePercent ?? 0,
    per: result.trailingPE ?? null,
    pbr: result.priceToBook ?? null,
    forwardPer: result.forwardPE ?? null,
    forwardPbr: null,
    fiftyTwoWeekHigh: result.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: result.fiftyTwoWeekLow ?? null,
  };
}

/** ROE 조회 (quoteSummary 필요) */
export async function getYahooFinancials(ticker: string): Promise<{ roe: number | null }> {
  const symbol = /^\d{6}$/.test(ticker) ? `${ticker}.KS` : ticker;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await yahooFinance.quoteSummary(
      symbol,
      { modules: ["financialData"] },
      { validateResult: false }
    )) as any;
    const roe = result?.financialData?.returnOnEquity ?? null;
    return { roe: roe !== null ? roe * 100 : null };
  } catch {
    return { roe: null };
  }
}

export interface YahooSearchResult {
  ticker: string;
  name: string;
  market: string;
  country: string;
}

export async function getYahooSearch(query: string): Promise<YahooSearchResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await yahooFinance.search(query, undefined, {
    validateResult: false,
  })) as any;

  const quotes: any[] = result.quotes ?? [];

  return quotes
    .filter(
      (q) =>
        (q.quoteType === "EQUITY" || q.quoteType === "ETF") &&
        q.isYahooFinance &&
        // 점(.)이 없는 심볼 = 미국 거래소
        !q.symbol.includes(".")
    )
    .slice(0, 10)
    .map((q) => ({
      ticker: q.symbol,
      name: q.shortname ?? q.longname ?? q.symbol,
      market: q.exchDisp ?? q.exchange ?? "",
      country: "US",
    }));
}

export interface YahooSectorInfo {
  sector: string | null;
  industry: string | null;
}

export async function getYahooSector(ticker: string): Promise<YahooSectorInfo> {
  const symbol = /^\d{6}$/.test(ticker) ? `${ticker}.KS` : ticker;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await yahooFinance.quoteSummary(
      symbol,
      { modules: ["assetProfile"] },
      { validateResult: false }
    )) as any;

    return {
      sector: result?.assetProfile?.sector ?? null,
      industry: result?.assetProfile?.industry ?? null,
    };
  } catch {
    return { sector: null, industry: null };
  }
}

export async function getUsdKrwRate(): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await yahooFinance.quote("KRW=X", undefined, {
    validateResult: false,
  })) as any;
  // KRW=X = 1 USD → KRW
  return result.regularMarketPrice ?? 1400;
}
