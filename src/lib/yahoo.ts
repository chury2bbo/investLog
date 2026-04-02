// yahoo-finance2 래퍼 — 해외 주식 현재가 + 환율

import yahooFinance from "yahoo-finance2";

export interface YahooQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
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
  };
}

export async function getUsdKrwRate(): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await yahooFinance.quote("KRW=X", undefined, {
    validateResult: false,
  })) as any;
  // KRW=X = 1 USD → KRW
  return result.regularMarketPrice ?? 1400;
}
