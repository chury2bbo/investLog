// 종목 분석용 지표 + MDD 차트 데이터
// GET /api/analysis/quote?ticker=005930&from=2024-01-01&to=2024-12-31

import { auth } from "@/auth";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const KIS_DOMAIN = "https://openapi.koreainvestment.com:9443";

let cachedKisToken: { access_token: string; expires_at: number } | null = null;

async function getKisToken(): Promise<string> {
  const now = Date.now();
  if (cachedKisToken && cachedKisToken.expires_at > now + 60_000) {
    return cachedKisToken.access_token;
  }
  const res = await fetch(`${KIS_DOMAIN}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`KIS token error: ${res.status}`);
  const data = await res.json();
  cachedKisToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ?? 86400) * 1000,
  };
  return cachedKisToken.access_token;
}

function isDomestic(ticker: string) {
  return /^\d{6}$/.test(ticker);
}

// KIS — 국내 주식 상세 지표
async function getKisDetail(ticker: string) {
  const token = await getKisToken();
  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: "J",
    FID_INPUT_ISCD: ticker,
  });
  const res = await fetch(
    `${KIS_DOMAIN}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: "FHKST01010100",
      },
    }
  );
  if (!res.ok) throw new Error(`KIS detail error: ${res.status}`);
  const data = await res.json();
  const o = data.output;

  const price = parseFloat(o.stck_prpr);
  const changeAbs = parseFloat(o.prdy_vrss);
  const sign = o.prdy_vrss_sign;
  const change = sign === "4" || sign === "5" ? -changeAbs : changeAbs;

  return {
    price,
    change,
    changePercent: parseFloat(o.prdy_ctrt),
    high52w: parseFloat(o.w52_hgpr),
    low52w: parseFloat(o.w52_lwpr),
    per: parseFloat(o.per) || null,
    pbr: parseFloat(o.pbr) || null,
    name: o.hts_kor_isnm ?? "",
    sector: null as string | null,
    industry: null as string | null,
    exchange: "KRX",
    currency: "KRW",
  };
}

// KIS — 국내 일봉 차트 (최대 100일)
async function getKisDailyChart(ticker: string, from: string, to: string) {
  const token = await getKisToken();
  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: "J",
    FID_INPUT_ISCD: ticker,
    FID_INPUT_DATE_1: from.replace(/-/g, ""),
    FID_INPUT_DATE_2: to.replace(/-/g, ""),
    FID_PERIOD_DIV_CODE: "D",
    FID_ORG_ADJ_PRC: "0",
  });
  const res = await fetch(
    `${KIS_DOMAIN}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${params}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: "FHKST03010100",
      },
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const output2: { stck_bsop_date: string; stck_clpr: string }[] =
    data.output2 ?? [];

  return output2
    .map((row) => ({
      date: row.stck_bsop_date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
      close: parseFloat(row.stck_clpr),
    }))
    .filter((r) => !isNaN(r.close))
    .reverse();
}

// Yahoo — 해외 주식 상세 지표
async function getYahooDetail(ticker: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quote, summary] = await Promise.all([
    yf.quote(ticker, undefined, { validateResult: false }) as Promise<any>,
    yf
      .quoteSummary(ticker, { modules: ["assetProfile", "summaryDetail"] }, { validateResult: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .catch(() => null) as Promise<any>,
  ]);

  return {
    price: quote.regularMarketPrice ?? 0,
    change: quote.regularMarketChange ?? 0,
    changePercent: quote.regularMarketChangePercent ?? 0,
    high52w: quote.fiftyTwoWeekHigh ?? null,
    low52w: quote.fiftyTwoWeekLow ?? null,
    per: quote.forwardPE ?? quote.trailingPE ?? null,
    pbr: quote.priceToBook ?? null,
    name: quote.shortName ?? quote.longName ?? ticker,
    sector: summary?.assetProfile?.sector ?? null,
    industry: summary?.assetProfile?.industry ?? null,
    exchange: quote.fullExchangeName ?? quote.exchange ?? "US",
    currency: quote.currency ?? "USD",
  };
}

// Yahoo — 해외 일봉 차트
async function getYahooDailyChart(ticker: string, from: string, to: string) {
  const result = await yf.chart(
    ticker,
    {
      period1: from,
      period2: to,
      interval: "1d",
    },
    { validateResult: false }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).catch(() => null) as any;

  if (!result?.quotes) return [];

  return (result.quotes as { date: Date; close: number | null }[])
    .filter((q) => q.close !== null)
    .map((q) => ({
      date: q.date.toISOString().slice(0, 10),
      close: q.close as number,
    }));
}

// MDD 계산
function calcMdd(candles: { date: string; close: number }[]) {
  if (candles.length === 0) return { mddPercent: 0, chartData: [] };

  let peak = candles[0].close;
  let maxDrawdown = 0;

  const chartData = candles.map((c) => {
    if (c.close > peak) peak = c.close;
    const drawdown = peak > 0 ? ((c.close - peak) / peak) * 100 : 0;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    return { date: c.date, close: c.close, drawdown: parseFloat(drawdown.toFixed(2)) };
  });

  return { mddPercent: parseFloat(maxDrawdown.toFixed(2)), chartData };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker")?.trim() ?? "";
  const from = searchParams.get("from") ?? new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });

  try {
    if (isDomestic(ticker)) {
      const [detail, candles] = await Promise.all([
        getKisDetail(ticker),
        getKisDailyChart(ticker, from, to),
      ]);
      const { mddPercent, chartData } = calcMdd(candles);
      return Response.json({ ...detail, mddPercent, chartData });
    } else {
      const [detail, candles] = await Promise.all([
        getYahooDetail(ticker),
        getYahooDailyChart(ticker, from, to),
      ]);
      const { mddPercent, chartData } = calcMdd(candles);
      return Response.json({ ...detail, mddPercent, chartData });
    }
  } catch (e) {
    console.error("analysis/quote error:", e);
    return Response.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}
