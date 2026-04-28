// KIS Open API 래퍼 — 국내 주식 현재가

const KIS_DOMAIN = "https://openapi.koreainvestment.com:9443";

interface KisToken {
  access_token: string;
  expires_at: number; // ms timestamp
}

// 서버 메모리 캐시 (프로세스 재시작 전까지 유지)
let cachedToken: KisToken | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + 60_000) {
    return cachedToken.access_token;
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
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ?? 86400) * 1000,
  };

  return cachedToken.access_token;
}

export interface KisQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  per?: number | null;
  pbr?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
}

export async function getKisQuote(ticker: string): Promise<KisQuote> {
  const token = await getToken();

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

  if (!res.ok) throw new Error(`KIS quote error: ${res.status}`);

  const data = await res.json();
  const o = data.output;

  const price = parseFloat(o.stck_prpr);
  const changeAbs = parseFloat(o.prdy_vrss);
  const sign = o.prdy_vrss_sign; // 1·2: 상승, 3: 보합, 4·5: 하락
  const change = sign === "4" || sign === "5" ? -changeAbs : changeAbs;
  const changePercent = parseFloat(o.prdy_ctrt);

  const per = parseFloat(o.per);
  const pbr = parseFloat(o.pbr);
  const w52h = parseFloat(o.stck_dryy_hgpr || o.w52_hgpr);
  const w52l = parseFloat(o.stck_dryy_lwpr || o.w52_lwpr);

  return {
    ticker,
    price,
    change,
    changePercent,
    per: isNaN(per) || per === 0 ? null : per,
    pbr: isNaN(pbr) || pbr === 0 ? null : pbr,
    fiftyTwoWeekHigh: isNaN(w52h) || w52h === 0 ? null : w52h,
    fiftyTwoWeekLow: isNaN(w52l) || w52l === 0 ? null : w52l,
  };
}

export interface KisSectorInfo {
  sector: string | null;
}

export async function getKisSector(ticker: string): Promise<KisSectorInfo> {
  const MAX_RETRY = 3;
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
      const token = await getToken();

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

      if (!res.ok) continue;

      const data = await res.json();
      const sector = data.output?.bstp_kor_isnm ?? null;
      if (sector) return { sector };
    } catch { /* 다음 재시도 */ }
  }
  return { sector: null };
}
