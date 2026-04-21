import { auth } from "@/auth";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const YAHOO_BENCHMARKS = [
  { name: "KOSPI",    ticker: "^KS11" },
  { name: "S&P 500",  ticker: "^GSPC" },
  { name: "NASDAQ",   ticker: "^IXIC" },
  { name: "비트코인",  ticker: "BTC-USD" },
  { name: "금",        ticker: "GC=F" },
  { name: "달러(KRW)", ticker: "USDKRW=X" },
];

// 2026년 N주차 코드 계산 (YYYYWW)
function weekCode(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const week = Math.ceil(dayOfYear / 7);
  return `${year}${String(week).padStart(2, "0")}`;
}

async function getSeoulAptReturnRate(year: number): Promise<number | null> {
  const apiKey = process.env.REB_API_KEY;
  if (!apiKey) return null;

  const startWrt = `${year}01`;     // 해당연도 1주차
  const endWrt   = weekCode(new Date());

  const url = new URL("https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do");
  url.searchParams.set("KEY",            apiKey);
  url.searchParams.set("Type",           "json");
  url.searchParams.set("STATBL_ID",      "T244183132827305"); // 주간 매매가격지수
  url.searchParams.set("DTACYCLE_CD",    "WK");
  url.searchParams.set("CLS_ID",         "50008");            // 서울
  url.searchParams.set("ITM_ID",         "10001");            // 지수
  url.searchParams.set("START_WRTTIME",  startWrt);
  url.searchParams.set("END_WRTTIME",    endWrt);
  url.searchParams.set("pSize",          "100");

  const res  = await fetch(url.toString(), { cache: "no-store" });
  const json = await res.json();

  // 응답 구조: { SttsApiTblData: [ {head:[...]}, {row:[...]} ] }
  const body = json?.SttsApiTblData ?? json?.sttsApiTblData;
  if (!body) return null;

  // head/row 배열 추출
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = Array.isArray(body)
    ? (body.find((b: any) => b.row)?.row ?? [])
    : (body.row ?? []);

  if (rows.length < 2) return null;

  const first = parseFloat(rows[0].DTA_VAL);
  const last  = parseFloat(rows[rows.length - 1].DTA_VAL);
  if (isNaN(first) || isNaN(last) || first === 0) return null;

  return Math.round(((last - first) / first) * 10000) / 100;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const year      = new Date().getFullYear();
  const startDate = new Date(`${year}-01-01`).toISOString().slice(0, 10);
  const today     = new Date().toISOString().slice(0, 10);

  // Yahoo Finance 벤치마크
  const yahooResults = await Promise.allSettled(
    YAHOO_BENCHMARKS.map(async (b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (yahooFinance.chart as any)(b.ticker, {
        period1: startDate,
        period2: today,
        interval: "1d",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quotes = (result?.quotes ?? []).filter((q: any) => q.close != null);
      if (quotes.length < 2) return { ...b, returnRate: null };
      const first = quotes[0].close as number;
      const last  = quotes[quotes.length - 1].close as number;
      return { ...b, returnRate: Math.round(((last - first) / first) * 10000) / 100 };
    })
  );

  const benchmarks = yahooResults.map((r, i) =>
    r.status === "fulfilled" ? r.value : { ...YAHOO_BENCHMARKS[i], returnRate: null }
  );

  // 서울 아파트 (R-ONE API)
  try {
    const aptRate = await getSeoulAptReturnRate(year);
    benchmarks.push({ name: "서울아파트", returnRate: aptRate });
  } catch {
    benchmarks.push({ name: "서울아파트", returnRate: null });
  }

  return Response.json({ year, benchmarks });
}
