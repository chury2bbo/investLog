"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  SectionTitle,
  PnlTag,
  Tag,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";

// ─── 타입 ────────────────────────────────────────────────

interface Holding {
  id: number;
  ticker: string;
  name: string;
  country: string;
  avgPrice: number;
  quantity: number;
}

interface CashBalance {
  currency: string;
  amount: number;
}

interface AccountData {
  id: number;
  accountCode: string;
  memo: string | null;
  brokerageCompany: { code: string; name: string };
  holdings: Holding[];
  cashBalances: CashBalance[];
}

interface QuoteResult {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

interface AssetSummary {
  domesticStockValue: number;
  foreignStockValue: number;
  cashKRW: number;
  cashUSD: number;
  cashUSDinKRW: number;
  totalAsset: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlRate: number;
  dailyPnl: number;
  dailyPnlRate: number;
  holdingCount: number;
  usdRate: number;
}

interface AccountSummary {
  id: number;
  name: string;
  type: string;
  stockCount: number;
  cashKRW: number;
  cashUSD: number;
  evalKRW: number;
  evalUSD: number;
  totalKRW: number;
  pnlRate: number;
}

// ─── 유틸 ────────────────────────────────────────────────

function formatKRW(value: number): string {
  if (Math.abs(value) >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(1)}억`;
  }
  if (Math.abs(value) >= 1_0000) {
    return `${(value / 10000).toFixed(1)}만`;
  }
  return value.toLocaleString();
}

function formatCompact(value: number, currency: string): string {
  if (currency === "USD") {
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }
  return `₩${formatKRW(value)}`;
}

// ─── 자산 배분 바 차트 색상 ──────────────────────────────

const ALLOC_COLORS = {
  domestic: "#05C072",
  foreign: "#4285F4",
  cashKRW: "#F07D05",
  cashUSD: "#9AA99A",
};

// ─── 메인 페이지 ─────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  // TODO: /api/market/quote API 완성 후 실시간 환율 조회로 교체
  const [usdRate, setUsdRate] = useState(1400);
  const [loading, setLoading] = useState(true);
  const [quotesRefreshing, setQuotesRefreshing] = useState(false);
  const [staleQuote, setStaleQuote] = useState(false);
  const [fxRefreshing, setFxRefreshing] = useState(false);

  const userName = session?.user?.name ?? "투자자";

  // ─── 데이터 로딩 ───────────────────────────────────────

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setQuotesRefreshing(true);
    else setLoading(true);
    try {
      // 계좌 목록 조회
      const accRes = await fetch("/api/accounts");
      if (!accRes.ok) throw new Error("accounts fetch failed");
      const accJson = await accRes.json();
      const accData: AccountData[] = Array.isArray(accJson) ? accJson : [];
      setAccounts(accData);

      // 모든 보유 종목 티커 추출
      const tickers = new Set<string>();
      accData.forEach((acc) =>
        acc.holdings.forEach((h) => tickers.add(h.ticker))
      );

      // 현재가 + 환율 조회
      const tickerList = [...tickers];
      if (tickerList.length > 0 || true) {
        try {
          // 환율 조회
          const fxRes = await fetch("/api/market/quote?ticker=USDKRW");
          if (fxRes.ok) {
            const fxData = await fxRes.json();
            if (fxData.price) setUsdRate(fxData.price);
          }

          // 종목 현재가 조회
          if (tickerList.length > 0) {
            const quoteRes = await fetch(
              `/api/market/quote?tickers=${tickerList.join(",")}`
            );
            if (quoteRes.ok) {
              const quoteData = await quoteRes.json();
              const quoteMap: Record<string, QuoteResult> = {};
              (quoteData.quotes ?? []).forEach((q: QuoteResult) => {
                quoteMap[q.ticker] = q;
              });
              setQuotes(quoteMap);
            }
          }
        } catch {
          setStaleQuote(true);
        }
      }
    } catch {
      // 조회 실패 시 빈 상태
    } finally {
      setLoading(false);
      setQuotesRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── 환율 새로고침 ──────────────────────────────────────
  // TODO: /api/market/quote API 완성 후 실제 환율 조회로 교체

  async function refreshFx() {
    setFxRefreshing(true);
    try {
      const res = await fetch("/api/market/quote?ticker=USDKRW");
      if (res.ok) {
        const data = await res.json();
        if (data.price) setUsdRate(data.price);
      }
    } catch {
      /* 실패 */
    } finally {
      setFxRefreshing(false);
    }
  }

  // ─── 자산 계산 ─────────────────────────────────────────

  function calcSummary(): AssetSummary {
    let domesticStockValue = 0;
    let foreignStockValue = 0;
    let cashKRW = 0;
    let cashUSD = 0;
    let totalInvested = 0;
    let dailyPnl = 0;
    let holdingCount = 0;

    accounts.forEach((acc) => {
      acc.cashBalances.forEach((cb) => {
        if (cb.currency === "KRW") cashKRW += cb.amount;
        if (cb.currency === "USD") cashUSD += cb.amount;
      });

      acc.holdings.forEach((h) => {
        holdingCount++;
        const quote = quotes[h.ticker];
        const currentPrice = quote?.price || h.avgPrice;
        const value = currentPrice * h.quantity;
        const invested = h.avgPrice * h.quantity;

        if (h.country === "KR") {
          domesticStockValue += value;
          totalInvested += invested;
          if (quote) dailyPnl += quote.change * h.quantity;
        } else {
          foreignStockValue += value;
          totalInvested += invested * usdRate;
          if (quote) dailyPnl += quote.change * h.quantity * usdRate;
        }
      });
    });

    const foreignStockKRW = foreignStockValue * usdRate;
    const cashUSDinKRW = cashUSD * usdRate;
    const totalAsset =
      domesticStockValue + foreignStockKRW + cashKRW + cashUSDinKRW;
    const totalPnl = totalAsset - totalInvested - cashKRW - cashUSDinKRW;
    const totalPnlRate =
      totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const dailyPnlRate =
      totalAsset - dailyPnl > 0
        ? (dailyPnl / (totalAsset - dailyPnl)) * 100
        : 0;

    return {
      domesticStockValue,
      foreignStockValue,
      cashKRW,
      cashUSD,
      cashUSDinKRW,
      totalAsset,
      totalInvested,
      totalPnl,
      totalPnlRate,
      dailyPnl,
      dailyPnlRate,
      holdingCount,
      usdRate,
    };
  }

  function calcAccountSummaries(): AccountSummary[] {
    return accounts.map((acc) => {
      const hasKR = acc.holdings.some((h) => h.country === "KR");
      const hasForeign = acc.holdings.some((h) => h.country !== "KR");
      const type = hasKR && hasForeign ? "국내·해외" : hasKR ? "국내" : hasForeign ? "해외" : "국내";

      let invested = 0;
      let evalKRW = 0;
      let evalUSD = 0;
      acc.holdings.forEach((h) => {
        const quote = quotes[h.ticker];
        const curPrice = quote?.price || h.avgPrice;
        const isForeign = h.country !== "KR";
        invested += h.avgPrice * h.quantity * (isForeign ? usdRate : 1);
        if (isForeign) {
          evalUSD += curPrice * h.quantity;
        } else {
          evalKRW += curPrice * h.quantity;
        }
      });

      const currentValue = evalKRW + evalUSD * usdRate;
      const pnlRate = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;

      const cashKRW = acc.cashBalances.find((c) => c.currency === "KRW")?.amount ?? 0;
      const cashUSD = acc.cashBalances.find((c) => c.currency === "USD")?.amount ?? 0;
      const totalKRW = evalKRW + evalUSD * usdRate + cashKRW + cashUSD * usdRate;

      return {
        id: acc.id,
        name: acc.brokerageCompany.name,
        type,
        stockCount: acc.holdings.length,
        cashKRW,
        cashUSD,
        evalKRW,
        evalUSD,
        totalKRW,
        pnlRate,
      };
    });
  }

  // ─── 자산 배분 비율 ────────────────────────────────────

  function calcAllocation(summary: AssetSummary) {
    const total = summary.totalAsset;
    if (total === 0)
      return [
        { label: "국내주식", color: ALLOC_COLORS.domestic, pct: 0 },
        { label: "해외주식", color: ALLOC_COLORS.foreign, pct: 0 },
        { label: "원화 예수금", color: ALLOC_COLORS.cashKRW, pct: 0 },
        { label: "달러 예수금", color: ALLOC_COLORS.cashUSD, pct: 0 },
      ];
    return [
      {
        label: "국내주식",
        color: ALLOC_COLORS.domestic,
        pct: Math.round((summary.domesticStockValue / total) * 100),
      },
      {
        label: "해외주식",
        color: ALLOC_COLORS.foreign,
        pct: Math.round(
          ((summary.foreignStockValue * summary.usdRate) / total) * 100
        ),
      },
      {
        label: "원화 예수금",
        color: ALLOC_COLORS.cashKRW,
        pct: Math.round((summary.cashKRW / total) * 100),
      },
      {
        label: "달러 예수금",
        color: ALLOC_COLORS.cashUSD,
        pct: Math.round((summary.cashUSDinKRW / total) * 100),
      },
    ];
  }

  // ─── 로딩 상태 ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const summary = calcSummary();
  const accountSummaries = calcAccountSummaries();
  const allocation = calcAllocation(summary);

  const pnlPositive = summary.totalPnlRate >= 0;
  const dailyPositive = summary.dailyPnl >= 0;

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
      {/* 지연 시세 안내 */}
      {staleQuote && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-[#FFF8E8] dark:bg-[#2D2810] text-[#B8860B]">
          현재가 조회에 실패하여 마지막 저장값으로 표시 중입니다 (지연된 시세)
        </div>
      )}

      {/* ── 섹션 1: 인사말 + 환율 ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A]">
            안녕하세요, {userName}님 👋
          </p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8] mt-0.5">
            내 투자 현황
          </h1>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="text-right">
            <div className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A]">USD/KRW</div>
            <div className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">
              {usdRate.toLocaleString()}
            </div>
          </div>
          <button
            onClick={refreshFx}
            disabled={fxRefreshing}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#F0F4F0] dark:bg-[#2D3D30] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors cursor-pointer disabled:cursor-default"
            style={{ opacity: fxRefreshing ? 0.5 : 1 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-[#6B7B6B] dark:text-[#7A8A7A] ${fxRefreshing ? "animate-spin" : ""}`}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 히어로 그라디언트 카드 */}
      <div
        className="rounded-[20px] p-6 mb-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #027A47 0%, #05C072 100%)",
        }}
      >
        {/* 데코 원 */}
        <div
          className="absolute -top-16 -right-16 w-52 h-52 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-sm"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            총 보유 자산
          </span>
          <button
            onClick={() => fetchData(true)}
            disabled={quotesRefreshing}
            className="w-5 h-5 rounded flex items-center justify-center transition-opacity cursor-pointer disabled:cursor-default"
            style={{ opacity: quotesRefreshing ? 0.4 : 0.6 }}
            title="주가 새로고침"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={quotesRefreshing ? "animate-spin" : ""}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
        <div className="text-[32px] md:text-[40px] font-extrabold text-white tracking-tight leading-tight">
          {summary.totalAsset.toLocaleString()}
          <span className="text-lg md:text-[22px] font-normal">원</span>
        </div>

        {/* 전일 대비 */}
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className="rounded-md px-2.5 py-0.5 text-xs font-bold text-white"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            {dailyPositive ? "+" : ""}
            {summary.dailyPnl.toLocaleString()}원{" "}
            {dailyPositive ? "+" : ""}
            {summary.dailyPnlRate.toFixed(2)}%
          </span>
          <span
            className="text-[11px]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            전일 대비
          </span>
        </div>

        {/* 미니 카드 3개 */}
        <div className="flex gap-2 mt-5">
          {[
            {
              label: "국내주식",
              value: formatCompact(summary.domesticStockValue, "KRW"),
            },
            {
              label: "해외주식",
              value: formatCompact(summary.foreignStockValue, "USD"),
            },
            {
              label: "예수금",
              value: formatCompact(
                summary.cashKRW + summary.cashUSDinKRW,
                "KRW"
              ),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex-1 rounded-xl px-2.5 py-3"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <div
                className="text-[11px] mb-1"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {item.label}
              </div>
              <div className="text-sm font-bold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 섹션 2: 요약 지표 + 자산 배분 ── */}

      {/* 요약 지표 2x2 */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          {
            label: "총 수익률",
            value: `${pnlPositive ? "+" : ""}${summary.totalPnlRate.toFixed(1)}%`,
            color: pnlPositive ? "#05C072" : "#F04452",
          },
          {
            label: "총 수익금",
            value: `${pnlPositive ? "+" : ""}₩${formatKRW(summary.totalPnl)}`,
            color: pnlPositive ? "#05C072" : "#F04452",
          },
          {
            label: "보유 종목",
            value: `${summary.holdingCount}종목`,
            color: undefined,
          },
          {
            label: "총 계좌",
            value: `${accounts.length}개`,
            color: undefined,
          },
        ].map((s) => (
          <Card key={s.label}>
            <div className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A] mb-1.5">
              {s.label}
            </div>
            <div
              className="text-[22px] font-extrabold tracking-tight"
              style={{
                color: s.color ?? undefined,
              }}
            >
              <span className={s.color ? "" : "text-[#1A221A] dark:text-[#E8EEE8]"}>
                {s.value}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* 자산 배분 카드 */}
      <Card>
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[15px] font-bold text-[#1A221A] dark:text-[#E8EEE8]">
            자산 배분
          </span>
          <button
            onClick={() => fetchData(true)}
            disabled={quotesRefreshing}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
          >
            {quotesRefreshing ? "조회 중..." : "새로고침"}
          </button>
        </div>

        {/* 가로 바 */}
        <div className="h-2.5 rounded-full overflow-hidden flex mb-3.5">
          {allocation.map((a) =>
            a.pct > 0 ? (
              <div
                key={a.label}
                style={{ width: `${a.pct}%`, backgroundColor: a.color }}
              />
            ) : null
          )}
          {summary.totalAsset === 0 && (
            <div className="w-full bg-[#E8EEE8] dark:bg-[#2D3D30]" />
          )}
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-3">
          {allocation.map((a) => (
            <div key={a.label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: a.color }}
              />
              <span className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A]">
                {a.label}
              </span>
              <span className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                {a.pct}%
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 섹션 3: 계좌 현황 ── */}
      <div className="mt-4">
        <SectionTitle title="계좌 현황" />

        {accountSummaries.length === 0 ? (
          <EmptyState message="아직 등록된 계좌가 없어요. 온보딩에서 추가해보세요." />
        ) : (
          <div className="space-y-2.5">
            {accountSummaries.map((acc) => (
              <div key={acc.id} onClick={() => router.push(`/accounts/${acc.id}`)}>
                <Card>
                  <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      {/* 아이콘 */}
                      <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl bg-[#E6F9F1] dark:bg-[#1D3D2A]">
                        💳
                      </div>
                      <div>
                        <div className="text-[15px] font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                          {acc.name}
                        </div>
                        <div className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-0.5">
                          {acc.type} · {acc.stockCount}종목
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <PnlTag value={acc.pnlRate} />
                      <span className="text-[#9AA99A] dark:text-[#5A6A5A] text-base">
                        ›
                      </span>
                    </div>
                  </div>

                  {/* 예수금 · 평가금 · 합산 */}
                  <div className="mt-3 pt-3 border-t border-[#F0F4F0] dark:border-[#2D3D30] space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A]">예수금</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A]">평가금</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A]">합산(원화)</div>
                      </div>
                    </div>
                    {/* 국내(원화) 행 */}
                    {(acc.cashKRW > 0 || acc.evalKRW > 0) && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                          {acc.cashKRW > 0 ? `₩${formatKRW(acc.cashKRW)}` : <span className="text-[#9AA99A]">-</span>}
                        </div>
                        <div className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                          {acc.evalKRW > 0 ? `₩${formatKRW(acc.evalKRW)}` : <span className="text-[#9AA99A]">-</span>}
                        </div>
                        {/* @ts-expect-error rowSpan은 div에 미적용 — 팀원 코드 유지 */}
                        <div className="text-xs font-bold text-[#05C072]" rowSpan={2}>
                          ₩{formatKRW(acc.totalKRW)}
                        </div>
                      </div>
                    )}
                    {/* 해외(달러) 행 */}
                    {(acc.cashUSD > 0 || acc.evalUSD > 0) && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                          {acc.cashUSD > 0 ? `$${acc.cashUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-[#9AA99A]">-</span>}
                        </div>
                        <div className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                          {acc.evalUSD > 0 ? `$${acc.evalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-[#9AA99A]">-</span>}
                        </div>
                        {acc.cashKRW === 0 && acc.evalKRW === 0 && (
                          <div className="text-xs font-bold text-[#05C072]">
                            ₩{formatKRW(acc.totalKRW)}
                          </div>
                        )}
                      </div>
                    )}
                    {/* 예수금·평가금 모두 없는 경우 */}
                    {acc.cashKRW === 0 && acc.cashUSD === 0 && acc.evalKRW === 0 && acc.evalUSD === 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-xs text-[#9AA99A]">-</div>
                        <div className="text-xs text-[#9AA99A]">-</div>
                        <div className="text-xs font-bold text-[#05C072]">₩0</div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
