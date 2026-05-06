// 기업 소개 스크래퍼 — 네이버 금융(국내) / Yahoo Finance(해외)
// AI 기업 소개 생성 실패 시 폴백으로 사용

import * as cheerio from "cheerio";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** 기업 소개 결과 (기존 Summary API 응답과 호환) */
export interface CompanySummary {
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  summary: string;
}

// ─── 통합 진입점 ─────────────────────────────────────────

/**
 * 종목의 기업 소개를 가져옵니다.
 * 국내 종목: 네이버 금융 → Yahoo Finance 폴백
 * 해외 종목: Yahoo Finance quoteSummary
 */
export async function scrapeSummary(
  ticker: string,
  country: string
): Promise<CompanySummary> {
  if (country === "KR" || /^\d{6}$/.test(ticker)) {
    return scrapeKrSummary(ticker);
  }
  return scrapeUsSummary(ticker);
}

// ─── 국내 종목 (네이버 금융 → Yahoo 폴백) ────────────────

async function scrapeKrSummary(ticker: string): Promise<CompanySummary> {
  try {
    return await scrapeNaverFinance(ticker);
  } catch {
    // 네이버 실패 시 Yahoo Finance (.KS 접미사) 폴백
    return scrapeYahooKr(ticker);
  }
}

async function scrapeNaverFinance(ticker: string): Promise<CompanySummary> {
  const url = `https://finance.naver.com/item/main.naver?code=${ticker}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Naver fetch failed: ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    // 기업명
    const name =
      $(".wrap_company h2 a").text().trim() ||
      $("title").text().split(":")[0]?.trim() ||
      ticker;

    // 섹터/산업 — 네이버 금융의 업종 정보
    const sectorText = $(".sub_info .t_td a").first().text().trim();
    const sector = sectorText || "정보 없음";
    const industry = $(".sub_info .t_td a").eq(1).text().trim() || sector;

    // 기업 소개 — 기업개요 영역
    const summaryText =
      $(".summary_info p").text().trim() ||
      $(".cmp_comment .cont").text().trim() ||
      $(".wrap_company .summary").text().trim() ||
      "";

    // 거래소 판별
    const exchange = $(".code").text().includes("코스닥") ? "KOSDAQ" : "KOSPI";

    return {
      name,
      exchange,
      sector,
      industry,
      summary: summaryText || `${name}은(는) ${exchange}에 상장된 기업입니다.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeYahooKr(ticker: string): Promise<CompanySummary> {
  const symbol = `${ticker}.KS`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await yahooFinance.quoteSummary(
      symbol,
      { modules: ["assetProfile", "quoteType"] },
      { validateResult: false }
    )) as any;

    const profile = result?.assetProfile ?? {};
    const quoteType = result?.quoteType ?? {};

    const longSummary: string = profile.longBusinessSummary ?? "";
    const summary = truncateSummary(longSummary);

    return {
      name: quoteType.shortName ?? quoteType.longName ?? ticker,
      exchange: quoteType.exchange ?? "KRX",
      sector: profile.sector ?? "정보 없음",
      industry: profile.industry ?? "정보 없음",
      summary: summary || `${ticker} 종목의 기업 소개 정보입니다.`,
    };
  } catch {
    // Yahoo도 실패하면 최소 정보 반환
    return {
      name: ticker,
      exchange: "KRX",
      sector: "정보 없음",
      industry: "정보 없음",
      summary: `${ticker} 종목의 기업 소개를 가져올 수 없습니다.`,
    };
  }
}

// ─── 해외 종목 (Yahoo Finance quoteSummary) ──────────────

async function scrapeUsSummary(ticker: string): Promise<CompanySummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (await yahooFinance.quoteSummary(
    ticker,
    { modules: ["assetProfile", "quoteType"] },
    { validateResult: false }
  )) as any;

  const profile = result?.assetProfile;
  const quoteType = result?.quoteType;

  if (!profile) {
    throw new Error(`Yahoo Finance에서 ${ticker} 기업 정보를 가져올 수 없습니다.`);
  }

  const longSummary: string = profile.longBusinessSummary ?? "";
  const truncated = truncateSummary(longSummary);
  const summary = await translateToKorean(truncated);

  return {
    name: quoteType?.shortName ?? quoteType?.longName ?? ticker,
    exchange: quoteType?.exchange ?? "NASDAQ",
    sector: profile.sector ?? "정보 없음",
    industry: profile.industry ?? "정보 없음",
    summary: summary || `${ticker}은(는) ${profile.sector ?? "기술"} 섹터의 기업입니다.`,
  };
}

// ─── 유틸 ────────────────────────────────────────────────

/**
 * 긴 영문 소개를 2~3문장으로 축약합니다.
 * 마침표 기준으로 최대 3문장까지만 추출합니다.
 */
function truncateSummary(text: string): string {
  if (!text) return "";

  // 문장 분리 (마침표 + 공백 또는 마침표 + 끝)
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return text.slice(0, 200);

  // 최대 3문장
  const selected = sentences.slice(0, 3).join(" ").trim();
  return selected;
}

/**
 * Google Translate 비공식 API로 영문을 한국어로 번역합니다.
 * 실패 시 원문을 그대로 반환합니다.
 */
async function translateToKorean(text: string): Promise<string> {
  if (!text) return "";
  // 이미 한국어면 번역 불필요
  if (/[\uAC00-\uD7A3]/.test(text)) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return text;

    const data = await res.json();
    // 응답 구조: [[["번역문", "원문", ...], ...], ...]
    const translated = (data[0] as any[])
      .map((segment: any) => segment[0])
      .join("");

    return translated || text;
  } catch {
    return text;
  }
}

/**
 * HTML 엔티티를 디코딩합니다.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * 새 제목이 기존 제목들과 유사한지 체크합니다.
 * 핵심 키워드 50% 이상 겹치면 유사하다고 판단합니다.
 */
function isSimilarToExisting(newTitle: string, existingTitles: string[]): boolean {
  if (existingTitles.length === 0) return false;

  const newKeywords = extractKeywords(newTitle);
  if (newKeywords.length === 0) return false;

  for (const existing of existingTitles) {
    const existingKeywords = extractKeywords(existing);
    if (existingKeywords.length === 0) continue;

    // 겹치는 키워드 수 계산
    const overlap = newKeywords.filter(k => existingKeywords.includes(k)).length;
    const similarity = overlap / Math.min(newKeywords.length, existingKeywords.length);

    if (similarity >= 0.5) return true;
  }
  return false;
}

/**
 * 제목에서 핵심 키워드를 추출합니다.
 * 2글자 이상의 한글/영문 단어만 추출합니다.
 */
function extractKeywords(title: string): string[] {
  // 특수문자, 숫자 제거 후 단어 분리
  const words = title
    .replace(/[^\uAC00-\uD7A3a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2);
  return words;
}

// ─── 최근 뉴스 크롤링 ────────────────────────────────────

/**
 * 종목의 최근 뉴스 헤드라인을 가져옵니다.
 * 국내: 네이버 금융 종목 뉴스
 * 해외: Yahoo Finance 뉴스
 * 최대 5개 헤드라인을 반환합니다.
 */
export async function scrapeRecentNews(
  ticker: string,
  country: string
): Promise<string> {
  try {
    if (country === "KR" || /^\d{6}$/.test(ticker)) {
      return await scrapeNaverNews(ticker);
    }
    return await scrapeYahooNews(ticker);
  } catch {
    return "최근 뉴스를 가져올 수 없습니다.";
  }
}

async function scrapeNaverNews(ticker: string): Promise<string> {
  // 네이버 모바일 증권 API 사용
  const url = `https://m.stock.naver.com/api/news/stock/${ticker}?pageSize=20`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Naver news API failed: ${res.status}`);

    const data = await res.json();
    const headlines: { title: string; url: string }[] = [];
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    // API 응답 구조: [{total, items: [{title, datetime, mobileNewsUrl, ...}]}]
    if (Array.isArray(data)) {
      for (const group of data) {
        const items = group?.items ?? [];
        for (const item of items) {
          if (item?.title && headlines.length < 5) {
            // datetime 형식: "202605061028" → 날짜 필터링
            const dt = item.datetime ?? "";
            if (dt.length >= 8) {
              const year = parseInt(dt.slice(0, 4));
              const month = parseInt(dt.slice(4, 6)) - 1;
              const day = parseInt(dt.slice(6, 8));
              const newsDate = new Date(year, month, day).getTime();
              if (now - newsDate > threeDaysMs) continue; // 3일 이상 된 뉴스 스킵
            }
            // 유사 제목 중복 체크
            if (isSimilarToExisting(item.title, headlines.map(h => h.title))) continue;
            headlines.push({
              title: item.title,
              url: item.mobileNewsUrl ?? "",
            });
          }
        }
      }
    }

    if (headlines.length === 0) {
      return "최근 뉴스를 가져올 수 없습니다.";
    }

    // 제목|URL 형식으로 반환 (프론트엔드에서 링크 처리)
    return headlines.map((h, i) => `${i + 1}. ${decodeHtmlEntities(h.title)}|${h.url}`).join("\n");
  } finally {
    clearTimeout(timeout);
  }
}

async function scrapeYahooNews(ticker: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await yahooFinance.search(ticker, undefined, {
      validateResult: false,
    })) as any;

    const news: any[] = result?.news ?? [];

    if (news.length === 0) {
      return "최근 뉴스를 가져올 수 없습니다.";
    }

    const headlines = news
      .slice(0, 5)
      .filter((n: any) => n.title)
      .map((n: any, i: number) => `${i + 1}. ${decodeHtmlEntities(n.title)}|${n.link ?? ""}`);

    return headlines.length > 0
      ? headlines.join("\n")
      : "최근 뉴스를 가져올 수 없습니다.";
  } catch {
    return "최근 뉴스를 가져올 수 없습니다.";
  }
}
