"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  SectionTitle,
  PnlTag,
  Tag,
  LoadingSpinner,
  EmptyState,
  ThemeToggle,
  Skeleton,
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
  investedKRW: number;
  investedUSD: number;
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
  memo: string | null;
  type: string;
  stockCount: number;
  cashKRW: number;
  cashUSD: number;
  evalKRW: number;
  evalUSD: number;
  totalKRW: number;
  pnlRate: number;
}

import { formatKRW, formatCompact } from "@/lib/format";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

// ─── 자산 배분 바 차트 색상 ──────────────────────────────

const ALLOC_COLORS = {
  domestic: "var(--color-primary)",      // #2DB87A
  foreign: "var(--color-primary-mid)",   // #1F9E64
  cashKRW: "var(--color-g300)",          // #C8D1C8
  cashUSD: "var(--color-g400)",          // #9DAD9D
};

// ─── 총 자산 추이 더미 데이터 ─────────────────────────────
const DUMMY_SNAPSHOTS = [
  { month: "24.11", invested: 3200, evaluated: 3150 },
  { month: "24.12", invested: 3400, evaluated: 3520 },
  { month: "25.01", invested: 3600, evaluated: 3480 },
  { month: "25.02", invested: 3800, evaluated: 3950 },
  { month: "25.03", invested: 4000, evaluated: 4280 },
  { month: "25.04", invested: 4200, evaluated: 4530 },
];

// ─── 종목별 비중 도넛 컬러 ───────────────────────────────
const DONUT_COLORS = [
  "#2DB87A", "#1F9E64", "#4285F4", "#F07D05", "#9DAD9D",
  "#05C072", "#7C3AED", "#E8553D", "#C8D1C8", "#16754A",
];

// ─── 메인 페이지 ─────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  // TODO: /api/market/quote API 완성 후 실시간 환율 조회로 교체
  const [usdRate, setUsdRate] = useState(1400);
  const [loading, setLoading] = useState(true);
  const [quotesRefreshing, setQuotesRefreshing] = useState(false);
  const [staleQuote, setStaleQuote] = useState(false);
  const [fxRefreshing, setFxRefreshing] = useState(false);
  const [snapshots, setSnapshots] = useState<{ month: string; invested: number; evaluated: number }[]>([]);

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

      // 현재가 + 환율 병렬 조회
      const tickerList = [...tickers];
      try {
        const [fxRes, quoteRes] = await Promise.all([
          fetch("/api/market/quote?ticker=USDKRW"),
          tickerList.length > 0
            ? fetch(`/api/market/quote?tickers=${tickerList.join(",")}`)
            : null,
        ]);

        if (fxRes.ok) {
          const fxData = await fxRes.json();
          if (fxData.price) setUsdRate(fxData.price);
        }

        if (quoteRes?.ok) {
          const quoteData = await quoteRes.json();
          const quoteMap: Record<string, QuoteResult> = {};
          (quoteData.quotes ?? []).forEach((q: QuoteResult) => {
            quoteMap[q.ticker] = q;
          });
          setQuotes(quoteMap);
        }
      } catch {
        setStaleQuote(true);
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

  // ─── 월별 스냅샷 기록 + 조회 ──────────────────────────────

  const saveAndFetchSnapshots = useCallback(async (
    accs: AccountData[],
    qts: Record<string, QuoteResult>,
    rate: number,
  ) => {
    // 스냅샷 데이터 계산
    let cashTotal = 0;
    let investedTotal = 0;
    let evaluatedTotal = 0;

    accs.forEach((acc) => {
      acc.cashBalances.forEach((cb) => {
        if (cb.currency === "KRW") cashTotal += cb.amount;
        if (cb.currency === "USD") cashTotal += cb.amount * rate;
      });

      acc.holdings.forEach((h) => {
        const quote = qts[h.ticker];
        const currentPrice = quote?.price || h.avgPrice;
        const isForeign = h.country !== "KR";
        const fx = isForeign ? rate : 1;
        investedTotal += h.avgPrice * h.quantity * fx;
        evaluatedTotal += currentPrice * h.quantity * fx;
      });
    });

    investedTotal += cashTotal;
    evaluatedTotal += cashTotal;

    // 종목이 있을 때만 기록
    if (accs.length > 0) {
      try {
        await fetch("/api/asset-snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cashTotal,
            investedAmount: investedTotal,
            evaluatedAmount: evaluatedTotal,
            usdRate: rate,
          }),
        });
      } catch { /* 기록 실패 무시 */ }
    }

    // 스냅샷 조회
    try {
      const res = await fetch("/api/asset-snapshot");
      if (res.ok) {
        const data = await res.json();
        const formatted = (Array.isArray(data) ? data : []).map((s: { date: string; investedAmount: number; evaluatedAmount: number }) => ({
          month: new Date(s.date).toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric" }).replace(". ", ".").replace(".", "."),
          invested: Math.round(s.investedAmount / 10000),
          evaluated: Math.round(s.evaluatedAmount / 10000),
        }));
        setSnapshots(formatted);
      }
    } catch { /* 조회 실패 무시 */ }
  }, []);

  // fetchData 완료 후 스냅샷 처리
  const snapshotSaved = useRef(false);
  useEffect(() => {
    if (!loading && accounts.length > 0 && !snapshotSaved.current) {
      snapshotSaved.current = true;
      saveAndFetchSnapshots(accounts, quotes, usdRate);
    }
  }, [loading, accounts, quotes, usdRate, saveAndFetchSnapshots]);

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
    let investedKRW = 0;
    let investedUSD = 0;
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
          investedKRW += invested;
          totalInvested += invested;
          if (quote) dailyPnl += quote.change * h.quantity;
        } else {
          foreignStockValue += value;
          investedUSD += invested;
          totalInvested += invested * usdRate;
          if (quote) dailyPnl += quote.change * h.quantity * usdRate;
        }
      });
    });

    const foreignStockKRW = foreignStockValue * usdRate;
    const cashUSDinKRW = cashUSD * usdRate;
    const totalAsset =
      domesticStockValue + foreignStockKRW + cashKRW + cashUSDinKRW;
    const totalPnl = (domesticStockValue + foreignStockKRW) - totalInvested;
    const totalPnlRate =
      totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const prevAsset = totalAsset - dailyPnl;
    const dailyPnlRate =
      prevAsset > 0 ? (dailyPnl / prevAsset) * 100 : 0;

    return {
      domesticStockValue,
      foreignStockValue,
      cashKRW,
      cashUSD,
      cashUSDinKRW,
      totalAsset,
      totalInvested,
      investedKRW,
      investedUSD,
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
        memo: acc.memo,
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
      <div className="w-full max-w-2xl md:max-w-5xl mx-auto px-5 py-6 pb-28 md:pb-6">
        {/* 인사말 + 다크모드 토글 (즉시 표시) */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">
              안녕하세요, {userName}님
            </p>
            <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-[var(--color-text)] mt-0.5">
              내 투자 현황
            </h1>
          </div>
          <div className="md:hidden mt-1"><ThemeToggle /></div>
        </div>

        {/* 히어로 카드 스켈레톤 */}
        <div className="rounded-[20px] p-5 mb-4" style={{ background: "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)" }}>
          <Skeleton className="h-4 w-24 mb-2 !bg-white/20" />
          <Skeleton className="h-10 w-56 mb-3 !bg-white/20" />
          <Skeleton className="h-5 w-40 mb-5 !bg-white/15" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 rounded-xl px-2.5 py-3" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Skeleton className="h-3 w-12 mb-2 !bg-white/20" />
                <Skeleton className="h-5 w-16 !bg-white/20" />
              </div>
            ))}
          </div>
        </div>

        {/* 요약 지표 스켈레톤 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="!p-3">
              <Skeleton className="h-3 w-14 mb-2" />
              <Skeleton className="h-5 w-16" />
            </Card>
          ))}
        </div>

        {/* 차트 영역 스켈레톤 */}
        <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5 mt-4">
          <div>
            <Skeleton className="h-4 w-20 mb-3" />
            <Card><Skeleton className="h-[160px] w-full" /></Card>
            <div className="mt-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Card><Skeleton className="h-[100px] w-full" /></Card>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <Skeleton className="h-4 w-24 mb-3" />
            <Card><Skeleton className="h-[200px] w-full" /></Card>
            <div className="mt-4">
              <Skeleton className="h-4 w-20 mb-3" />
              <Card><Skeleton className="h-[120px] w-full" /></Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = calcSummary();
  const accountSummaries = calcAccountSummaries();
  const allocation = calcAllocation(summary);

  // 종목별 비중 계산
  const holdingWeights = (() => {
    const items: { name: string; label: string; country: string; value: number }[] = [];
    accounts.forEach((acc) => {
      acc.holdings.forEach((h) => {
        const quote = quotes[h.ticker];
        const price = quote?.price || h.avgPrice;
        const evalKRW = h.country === "KR"
          ? price * h.quantity
          : price * h.quantity * usdRate;
        const label = h.country === "KR" ? h.name : h.ticker;
        const country = h.country;
        const existing = items.find((i) => i.name === h.name);
        if (existing) existing.value += evalKRW;
        else items.push({ name: h.name, label, country, value: evalKRW });
      });
    });
    return items.sort((a, b) => {
      // 국내(KR) 먼저, 그 다음 해외
      if (a.country === "KR" && b.country !== "KR") return -1;
      if (a.country !== "KR" && b.country === "KR") return 1;
      // 같은 그룹 내에서 비중 큰 순
      return b.value - a.value;
    });
  })();
  const holdingTotal = holdingWeights.reduce((s, h) => s + h.value, 0);

  const pnlPositive = summary.totalPnlRate >= 0;
  const dailyPositive = summary.dailyPnl >= 0;

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl md:max-w-5xl mx-auto px-5 py-6 pb-28 md:pb-6 animate-[fadeIn_0.4s_ease-out]">
      {/* 지연 시세 안내 */}
      {staleQuote && (
        <div className="rounded-lg px-3 py-2 text-xs mb-4 bg-[#FFF8E8] dark:bg-[#2D2810] text-[#B8860B]">
          현재가 조회에 실패하여 마지막 저장값으로 표시 중입니다 (지연된 시세)
        </div>
      )}

      {/* ── 섹션 1: 인사말 + 환율 ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">
            안녕하세요, {userName}님
          </p>
          <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-[var(--color-text)] dark:text-[var(--color-text)] mt-0.5">
            내 투자 현황
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="text-right">
            <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">USD/KRW</div>
            <div className="text-sm font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
              {usdRate.toLocaleString()}
            </div>
          </div>
          <button
            onClick={refreshFx}
            disabled={fxRefreshing}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-[var(--color-border)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors cursor-pointer disabled:cursor-default"
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
              className={`text-[var(--color-g500)] dark:text-[var(--color-muted)] ${fxRefreshing ? "animate-spin" : ""}`}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
          <div className="md:hidden"><ThemeToggle /></div>
        </div>
      </div>

      {/* 히어로 그라디언트 카드 */}
      <div
        className="rounded-[20px] p-6 mb-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)",
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
          {Math.floor(summary.totalAsset).toLocaleString()}
          <span className="text-lg md:text-[22px] font-normal">원</span>
        </div>

        {/* 전일 대비 */}
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className="rounded-md px-2.5 py-0.5 text-xs font-bold text-white"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            {dailyPositive ? "+" : ""}
            {Math.floor(summary.dailyPnl).toLocaleString()}원{" "}
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

        {/* 미니 카드 4개 */}
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
              label: "매수금",
              krw: summary.investedKRW > 0 ? formatCompact(summary.investedKRW, "KRW") : null,
              usd: summary.investedUSD > 0 ? `$${summary.investedUSD >= 1000 ? `${(summary.investedUSD / 1000).toFixed(1)}K` : summary.investedUSD.toFixed(0)}` : null,
            },
            {
              label: "예수금",
              krw: summary.cashKRW > 0 ? formatCompact(summary.cashKRW, "KRW") : null,
              usd: summary.cashUSD > 0 ? `$${summary.cashUSD >= 1000 ? `${(summary.cashUSD / 1000).toFixed(1)}K` : summary.cashUSD.toFixed(0)}` : null,
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
              {"value" in item ? (
                <div className="text-sm font-bold text-white">{item.value}</div>
              ) : (
                <div>
                  {item.krw && item.usd ? (
                    <>
                      <div className="text-[13px] font-bold text-white leading-tight">{item.krw}</div>
                      <div className="text-[13px] font-bold text-white leading-tight">{item.usd}</div>
                    </>
                  ) : item.krw ? (
                    <div className="text-sm font-bold text-white">{item.krw}</div>
                  ) : item.usd ? (
                    <div className="text-sm font-bold text-white">{item.usd}</div>
                  ) : (
                    <div className="text-sm font-bold text-white">-</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── 섹션 2: 요약 지표 + 자산 배분 ── */}

      {/* 요약 지표 4칸 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          {
            label: "총 수익률",
            value: `${pnlPositive ? "+" : ""}${summary.totalPnlRate.toFixed(1)}%`,
            color: pnlPositive ? "var(--color-positive)" : "var(--color-negative)",
          },
          {
            label: "총 수익금",
            value: `${pnlPositive ? "+" : ""}₩${formatKRW(summary.totalPnl)}`,
            color: pnlPositive ? "var(--color-positive)" : "var(--color-negative)",
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
          <Card key={s.label} className="!p-3">
            <div className="text-[11px] text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-1">
              {s.label}
            </div>
            <div
              className="flex items-center gap-1 text-[12px] md:text-[15px] font-extrabold tracking-tight leading-tight"
              style={{
                color: s.color ?? undefined,
              }}
            >
              {s.color && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke={s.color} className="shrink-0">
                  {s.color === "var(--color-positive)"
                    ? <><path d="M7 17L17 7" /><path d="M7 7h10v10" /></>
                    : <><path d="M7 7l10 10" /><path d="M17 7v10H7" /></>
                  }
                </svg>
              )}
              <span className={s.color ? "" : "text-[var(--color-text)] dark:text-[var(--color-text)]"}>
                {s.value}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* PC 2컬럼 / 모바일 1컬럼 */}
      <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5 mt-4">
      {/* 좌측: 자산 배분 + 총 자산 추이 */}
      <div>

      {/* 자산 배분 카드 */}
      <SectionTitle title="자산 배분" />
      <Card>
        {/* 가로 바 */}
        <div className="flex gap-0.5 mb-3.5">
          {allocation.map((a) =>
            a.pct > 0 ? (
              <div
                key={a.label}
                className="h-2 rounded-full"
                style={{ width: `${a.pct}%`, backgroundColor: a.color }}
              />
            ) : null
          )}
          {summary.totalAsset === 0 && (
            <div className="w-full h-2 rounded-full bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
          )}
        </div>

        {/* 범례 */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 md:flex md:items-center md:justify-between">
          {allocation.map((a) => (
            <div key={a.label} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: a.color }}
              />
              <span className="text-[11px] text-[var(--color-g500)] dark:text-[var(--color-muted)]">
                {a.label}
              </span>
              <span className="text-[11px] font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                {a.pct}%
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 총 자산 추이 차트 ── */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3 min-h-[28px]">
          <h2 className="text-[13px] font-bold text-[var(--color-text)]">총 자산 추이</h2>
          {snapshots.length < 2 && (
            <span className="text-[11px] text-[var(--color-g400)]">
              · {snapshots.length === 1 ? "다음 달부터 추이가 표시돼요" : "매월 접속 시 자동 기록돼요"}
            </span>
          )}
        </div>
        <Card>
          {/* 안내 문구 — 데이터 충분할 때만 */}
          {snapshots.length >= 2 && (
            <div className="flex items-center gap-1.5 mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-g400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span className="text-[11px] text-[var(--color-g400)]">
                대시보드 접속 시 월별 자산이 자동으로 기록됩니다
              </span>
            </div>
          )}

          {/* 범례 */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[2px] rounded" style={{ backgroundColor: "var(--color-primary)" }} />
              <span className="text-[11px] text-[var(--color-g500)]">평가금 기준</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="2" className="shrink-0"><line x1="0" y1="1" x2="16" y2="1" stroke="var(--color-g300)" strokeWidth="2" strokeDasharray="3 2" /></svg>
              <span className="text-[11px] text-[var(--color-g500)]">원금 기준</span>
            </div>
          </div>

          {/* 차트 */}
          {snapshots.length >= 2 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={snapshots} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-g200)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-g400)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-g400)" }} tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${(Math.round(v / 10) * 10).toLocaleString()}만`} axisLine={false} tickLine={false} domain={["dataMin - 200", "dataMax + 200"]} />
                <Tooltip formatter={(v: unknown) => [`₩${formatKRW((v as number) * 10000)}`, ""]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--color-g200)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }} />
                <Line type="monotone" dataKey="evaluated" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3, fill: "var(--color-primary)" }} name="평가금 기준" />
                <Line type="monotone" dataKey="invested" stroke="var(--color-g300)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: "var(--color-g300)" }} name="원금 기준" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="relative">
              <div style={{ opacity: 0.25 }}>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={DUMMY_SNAPSHOTS} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-g200)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-g400)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={false} axisLine={false} tickLine={false} />
                    <Line type="monotone" dataKey="evaluated" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="invested" stroke="var(--color-g300)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs text-[var(--color-g400)]">{snapshots.length === 1 ? "다음 달부터 추이를 볼 수 있어요" : "접속할 때마다 자산이 기록돼요"}</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      </div>{/* 좌측 컬럼 끝 */}

      {/* 우측: 종목별 비중 + 계좌 현황 */}
      <div className="mt-4 md:mt-0">

      {/* ── 종목별 비중 도넛 ── */}
      {holdingWeights.length > 0 && (
        <div className="md:flex md:flex-col">
          <SectionTitle title="종목별 비중" />
          <Card className="md:flex-1">
            <div className="flex items-center gap-4 md:h-full">
              {/* 도넛 차트 */}
              <div className="w-[140px] h-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={holdingWeights}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={62}
                      dataKey="value"
                      stroke="none"
                    >
                      {holdingWeights.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload as { name: string; label: string; value: number };
                        const pct = holdingTotal > 0 ? Math.round((data.value / holdingTotal) * 100) : 0;
                        return (
                          <div className="px-3 py-2 rounded-xl bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-xs shadow-lg border border-[var(--color-g200)] dark:border-[var(--color-border)]">
                            <div className="font-bold text-[var(--color-text)] mb-0.5">{data.label}</div>
                            <div className="text-[var(--color-g500)]">₩{formatKRW(data.value)} ({pct}%)</div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 범례 */}
              <div className="flex-1 space-y-1.5">
                {holdingWeights.slice(0, 5).map((h, i) => {
                  const pct = holdingTotal > 0 ? Math.round((h.value / holdingTotal) * 100) : 0;
                  return (
                    <div key={h.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded shrink-0 ${h.country === "KR" ? "bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-primary)]" : "bg-[#E8F0FE] dark:bg-[rgba(66,133,244,0.15)] text-[#4285F4]"}`}>{h.country === "KR" ? "국내" : "해외"}</span>
                        <span
                          className="text-xs text-[var(--color-text)] truncate max-w-[80px] cursor-default"
                          onMouseEnter={(e) => {
                            if (h.name.length > 6) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredStock(`${h.name}::${rect.left}::${rect.top}`);
                            }
                          }}
                          onMouseLeave={() => setHoveredStock(null)}
                        >
                          {h.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[var(--color-text)]">{pct}%</span>
                    </div>
                  );
                })}
                {holdingWeights.length > 5 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: "var(--color-g300)" }} />
                      <span className="text-xs text-[var(--color-g400)]">외 {holdingWeights.length - 5}종목</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--color-g400)]">
                      {holdingTotal > 0 ? Math.round((holdingWeights.slice(5).reduce((s, h) => s + h.value, 0) / holdingTotal) * 100) : 0}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── 섹션 3: 계좌 현황 ── */}
      <div className="mt-4">
        <SectionTitle title="계좌 현황" />

        {accountSummaries.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-g300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" /><path d="M2 10h20" />
              </svg>
              <p className="text-sm text-[var(--color-g400)]">아직 등록된 계좌가 없어요</p>
              <button
                onClick={() => router.push("/accounts?add=true")}
                className="px-4 py-2 text-sm font-bold rounded-xl cursor-pointer transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--color-primary)", color: "#fff", boxShadow: "0 2px 12px color-mix(in srgb, var(--color-primary) 27%, transparent)" }}
              >
                계좌 관리에서 추가하기
              </button>
            </div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {accountSummaries.map((acc) => (
              <div key={acc.id} onClick={() => router.push(`/accounts/${acc.id}`)} className="cursor-pointer">
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h.01" /><path d="M2 10h20" /></svg>
                      </div>
                      <div>
                        <div className="text-[15px] font-bold text-[var(--color-text)]">
                          {acc.name}
                          {acc.memo && <span className="ml-1.5 text-xs font-normal text-[var(--color-g400)]">{acc.memo}</span>}
                        </div>
                        <div className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] mt-0.5">
                          {acc.type} · {acc.stockCount}종목
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PnlTag value={acc.pnlRate} />
                      <span className="text-[var(--color-g400)] dark:text-[var(--color-muted)] text-base">›</span>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      </div>{/* 우측 컬럼 끝 */}
      </div>{/* 2컬럼 그리드 끝 */}

      {/* 종목명 커스텀 툴팁 (fixed) */}
      {hoveredStock && (() => {
        const [name, left, top] = hoveredStock.split("::");
        return (
          <div
            className="fixed z-[9999] text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none"
            style={{
              left: `${parseFloat(left)}px`,
              top: `${parseFloat(top) - 32}px`,
              backgroundColor: "#fff",
              color: "#1A221A",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              border: "1px solid #E4EAE4",
            }}
          >
            {name}
          </div>
        );
      })()}
    </div>
  );
}
