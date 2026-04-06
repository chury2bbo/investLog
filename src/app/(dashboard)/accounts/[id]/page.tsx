"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Button,
  Tag,
  PnlTag,
  SectionTitle,
  Input,
  LoadingSpinner,
  EmptyState,
  BottomSheet,
  Divider,
  ConfirmDialog,
  ThemeToggle,
} from "@/components/ui";
import SectorDonutChart from "@/components/SectorDonutChart";
import { ImportModal } from "@/components/ImportModal";

import { formatKRW, fmtNum, stripNum } from "@/lib/format";

// ─── 타입 ────────────────────────────────────────────────

interface Holding {
  id: number;
  ticker: string;
  name: string;
  country: string;
  avgPrice: number;
  quantity: number;
  sectorAuto: string | null;
  sectorManual: string | null;
  tags: string[];
}

interface QuoteResult {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

interface CashBalance {
  id: number;
  currency: string;
  amount: number;
}

interface TradeLog {
  id: number;
  date: string;
  ticker: string;
  name: string;
  type: string;
  price: number;
  quantity: number;
}

interface CashLog {
  id: number;
  date: string;
  type: string;
  currency: string;
  amount: number;
  memo: string | null;
}

interface AccountDetail {
  id: number;
  accountCode: string;
  memo: string | null;
  brokerageCompany: { code: string; name: string };
  holdings: Holding[];
  cashBalances: CashBalance[];
  tradeLogs: TradeLog[];
  cashLogs: CashLog[];
}

// ─── 메인 페이지 ─────────────────────────────────────────

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [usdRate, setUsdRate] = useState(1400);

  // 통화 표시 토글 (외화 원본 / 원화 환산)
  const [displayCurrency, setDisplayCurrency] = useState<"original" | "KRW">("original");

  // 입출금 모달
  const [cashModal, setCashModal] = useState<"deposit" | "withdraw" | null>(null);
  const [cashCurrency, setCashCurrency] = useState("KRW");
  const [cashAmount, setCashAmount] = useState("");
  const [cashSubmitting, setCashSubmitting] = useState(false);

  // 계좌 삭제 모달
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 종목 등록 모달
  const [holdingModal, setHoldingModal] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [hTicker, setHTicker] = useState("");
  const [hName, setHName] = useState("");
  const [hCountry, setHCountry] = useState("KR");
  const [hAvgPrice, setHAvgPrice] = useState("");
  const [hQuantity, setHQuantity] = useState("");
  const [hSubmitting, setHSubmitting] = useState(false);
  const [hError, setHError] = useState("");
  const [hPriceLoading, setHPriceLoading] = useState(false);

  // 섹터 편집 모달
  const [sectorEditModal, setSectorEditModal] = useState(false);
  const [sectorEditHolding, setSectorEditHolding] = useState<Holding | null>(null);
  const [sectorEditValue, setSectorEditValue] = useState("");
  const [sectorEditTags, setSectorEditTags] = useState<string[]>([]);
  const [sectorEditTagInput, setSectorEditTagInput] = useState("");
  const [sectorEditSubmitting, setSectorEditSubmitting] = useState(false);

  // 국내 종목 검색 autocomplete
  const [hStockQuery, setHStockQuery] = useState("");
  const [hStockResults, setHStockResults] = useState<{ ticker: string; name: string; market: string }[]>([]);
  const [hShowDropdown, setHShowDropdown] = useState(false);
  const hSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hStockSearchRef = useRef<HTMLDivElement>(null);
  const hAvgPriceRef = useRef<HTMLInputElement>(null);

  // ─── 데이터 로딩 ───────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts`);
      if (!res.ok) return;
      const accounts = await res.json();
      if (!Array.isArray(accounts)) return;
      const acc = accounts.find((a: AccountDetail) => a.id === parseInt(accountId, 10));
      if (!acc) return;

      // 매매 이력 조회
      const tradesRes = await fetch(`/api/trades?accountId=${accountId}`);
      const trades = tradesRes.ok ? await tradesRes.json() : [];

      // 입출금 이력 조회
      const cashLogsRes = await fetch(`/api/cash?accountId=${accountId}`);
      const cashLogs = cashLogsRes.ok ? await cashLogsRes.json() : [];

      const accountData = {
        ...acc,
        tradeLogs: Array.isArray(trades) ? trades.slice(0, 5) : [],
        cashLogs: Array.isArray(cashLogs) ? cashLogs : [],
      };
      setAccount(accountData);

      // 현재가 + 환율 병렬 조회
      const tickers = acc.holdings.map((h: Holding) => h.ticker);
      setQuotesLoading(true);
      try {
        const [qRes, fxRes] = await Promise.all([
          tickers.length > 0
            ? fetch(`/api/market/quote?tickers=${tickers.join(",")}`)
            : null,
          fetch("/api/market/quote?ticker=USDKRW"),
        ]);
        if (qRes?.ok) {
          const qData = await qRes.json();
          const map: Record<string, QuoteResult> = {};
          (qData.quotes ?? []).forEach((q: QuoteResult) => {
            map[q.ticker] = q;
          });
          setQuotes(map);
        }
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          if (fxData.price) setUsdRate(fxData.price);
        }
      } catch {
        /* 조회 실패 */
      } finally {
        setQuotesLoading(false);
      }
    } catch {
      /* 조회 실패 */
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (hStockSearchRef.current && !hStockSearchRef.current.contains(e.target as Node)) {
        setHShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── 입출금 처리 ───────────────────────────────────────

  async function handleCashSubmit() {
    if (!cashAmount || !account) return;
    setCashSubmitting(true);

    const amount = parseFloat(cashAmount.replace(/,/g, ""));
    const type = cashModal === "deposit" ? "DEPOSIT" : "WITHDRAW";

    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          type,
          currency: cashCurrency,
          amount,
        }),
      });

      if (res.ok) {
        setCashModal(null);
        setCashAmount("");
        fetchAccount();
      }
    } catch {
      /* 실패 */
    } finally {
      setCashSubmitting(false);
    }
  }

  // ─── 종목 등록 처리 ────────────────────────────────────

  function resetHoldingForm() {
    setHTicker("");
    setHName("");
    setHCountry("KR");
    setHAvgPrice("");
    setHQuantity("");
    setHError("");
    setHStockQuery("");
    setHStockResults([]);
    setHShowDropdown(false);
    setHPriceLoading(false);
  }

  function handleHStockQueryChange(val: string) {
    setHStockQuery(val);

    if (hSearchTimerRef.current) clearTimeout(hSearchTimerRef.current);

    if (!val.trim()) {
      setHStockResults([]);
      setHShowDropdown(false);
      return;
    }

    setHShowDropdown(true);
    hSearchTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: val.trim() });
        if (hCountry === "US") params.set("country", "US");
        const res = await fetch(`/api/market/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setHStockResults(Array.isArray(data) ? data : []);
        }
      } catch {
        /* 검색 실패 */
      }
    }, 300);
  }

  async function selectHStock(stock: { ticker: string; name: string; market: string }) {
    setHTicker(stock.ticker);
    setHName(stock.name);
    setHStockQuery("");
    setHShowDropdown(false);
    setHStockResults([]);

    // 현재가 조회 → 평단가 자동 입력
    setHPriceLoading(true);
    try {
      const res = await fetch(`/api/market/quote?tickers=${encodeURIComponent(stock.ticker)}`);
      if (res.ok) {
        const data = await res.json();
        const quote = (data.quotes ?? [])[0];
        if (quote?.price && quote.price > 0) {
          setHAvgPrice(String(quote.price));
        }
      }
    } catch {
      /* 현재가 조회 실패 시 빈칸 유지 */
    } finally {
      setHPriceLoading(false);
      setTimeout(() => hAvgPriceRef.current?.focus(), 50);
    }
  }

  async function handleAddHolding() {
    if (!hTicker || !hName || !hAvgPrice || !hQuantity) {
      setHError("필수 항목을 모두 입력해주세요.");
      return;
    }

    setHSubmitting(true);
    setHError("");

    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: parseInt(accountId, 10),
          ticker: hTicker,
          name: hName,
          country: hCountry,
          avgPrice: parseFloat(hAvgPrice),
          quantity: parseInt(hQuantity, 10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setHError(data.error || "등록에 실패했습니다.");
        return;
      }

      setHoldingModal(false);
      resetHoldingForm();
      fetchAccount();
    } catch {
      setHError("네트워크 오류가 발생했습니다.");
    } finally {
      setHSubmitting(false);
    }
  }

  // ─── 섹터 편집 ─────────────────────────────────────────

  function openSectorEdit(h: Holding) {
    setSectorEditHolding(h);
    setSectorEditValue(h.sectorManual ?? "");
    setSectorEditTags(h.tags ?? []);
    setSectorEditTagInput("");
    setSectorEditModal(true);
  }

  async function handleSectorEditSubmit() {
    if (!sectorEditHolding) return;
    setSectorEditSubmitting(true);
    try {
      const res = await fetch(`/api/holdings/${sectorEditHolding.id}/sector`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorManual: sectorEditValue || null,
          tags: sectorEditTags,
        }),
      });
      if (res.ok) {
        setSectorEditModal(false);
        fetchAccount();
      }
    } catch {
      /* 실패 */
    } finally {
      setSectorEditSubmitting(false);
    }
  }

  function addSectorTag() {
    const tag = sectorEditTagInput.trim();
    if (tag && !sectorEditTags.includes(tag)) {
      setSectorEditTags([...sectorEditTags, tag]);
    }
    setSectorEditTagInput("");
  }

  // ─── 섹터 분포 계산 ───────────────────────────────────

  // ─── 계좌 삭제 처리 ────────────────────────────────────

  async function handleDeleteAccount() {
    if (!account) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/accounts");
      }
    } catch {
      /* 삭제 실패 */
    } finally {
      setDeleting(false);
    }
  }

  // ─── 캡처 불러오기 확인 ────────────────────────────────

  async function handleImportConfirm(
    importedHoldings: { ticker: string; name: string; avgPrice: string; quantity: string; country: string }[]
  ) {
    for (const h of importedHoldings) {
      await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: parseInt(accountId, 10),
          ticker: h.ticker,
          name: h.name,
          country: h.country,
          avgPrice: parseFloat(h.avgPrice),
          quantity: parseInt(h.quantity, 10),
          replace: true,
        }),
      });
    }
    fetchAccount();
  }

  // ─── 섹터 분포: SectorDonutChart 컴포넌트 내부에서 계산 ───

  // ─── 로딩 / 에러 ──────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="w-full max-w-2xl mx-auto px-5 py-6">
        <EmptyState message="계좌를 찾을 수 없습니다." />
      </div>
    );
  }

  const cashKRW = account.cashBalances.find((c) => c.currency === "KRW")?.amount ?? 0;
  const cashUSD = account.cashBalances.find((c) => c.currency === "USD")?.amount ?? 0;

  // 평가금 계산
  let evalKRW = 0;
  let evalUSD = 0;
  account.holdings.forEach((h) => {
    const quote = quotes[h.ticker];
    const curPrice = quote?.price || h.avgPrice;
    if (h.country !== "KR") evalUSD += curPrice * h.quantity;
    else evalKRW += curPrice * h.quantity;
  });
  const totalKRW = cashKRW + cashUSD * usdRate + evalKRW + evalUSD * usdRate;

  // 총 투자금 (원화 환산) + 수익률
  let totalInvested = 0;
  account.holdings.forEach((h) => {
    const isForeign = h.country !== "KR";
    totalInvested += h.avgPrice * h.quantity * (isForeign ? usdRate : 1);
  });
  const totalEvalKRW = evalKRW + evalUSD * usdRate;
  const totalPnl = totalEvalKRW - totalInvested;
  const totalPnlRate = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl md:max-w-5xl mx-auto px-5 py-6 pb-28 md:pb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/accounts")} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-[var(--color-border)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)] dark:text-[var(--color-text)]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">계좌 상세</p>
            <h1 className="text-[26px] font-extrabold tracking-tight text-[var(--color-text)] dark:text-[var(--color-text)]">
              {account.brokerageCompany.name}
              {account.memo && (
                <span className="ml-2 text-sm font-normal text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                  {account.memo}
                </span>
              )}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const hasKR = account.holdings.some((h) => h.country === "KR");
            const hasForeign = account.holdings.some((h) => h.country !== "KR");
            const label = hasKR && hasForeign ? "국내·해외" : hasKR ? "국내" : hasForeign ? "해외" : "";
            return label ? <Tag label={label} color={hasForeign && hasKR ? "blue" : hasForeign ? "blue" : "green"} /> : null;
          })()}
          <div className="md:hidden"><ThemeToggle /></div>
        </div>
      </div>

      {/* ── ② 자산 요약 카드 ── */}
      <div
        className="rounded-[20px] p-5 mb-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)",
        }}
      >
        {/* 데코 — 오른쪽 상단 밝은 영역 */}
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />

        <div className="relative flex justify-between items-start">
          <div>
            <div className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
              합산 (원화)
            </div>
            <div className="text-[28px] font-extrabold text-white tracking-tight">
              ₩{Math.floor(totalKRW).toLocaleString()}
            </div>
          </div>
          <div
            className="rounded-xl px-3 py-2 text-right"
            style={{ backgroundColor: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <div className="flex items-center gap-1 justify-end">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                stroke={totalPnlRate >= 0 ? "var(--color-positive)" : "var(--color-negative)"}
              >
                {totalPnlRate >= 0
                  ? <><path d="M7 17L17 7" /><path d="M7 7h10v10" /></>
                  : <><path d="M7 7l10 10" /><path d="M17 7v10H7" /></>
                }
              </svg>
              <span className="text-[15px] font-bold" style={{ color: totalPnlRate >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                {totalPnlRate >= 0 ? "+" : ""}{totalPnlRate.toFixed(2)}%
              </span>
            </div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color: totalPnlRate >= 0 ? "var(--color-positive)" : "var(--color-negative)", opacity: 0.7 }}>
              {totalPnl >= 0 ? "+" : "-"}₩{Math.floor(Math.abs(totalPnl)).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 예수금 · 평가금 · 합산 테이블 */}
        <div className="relative mt-3 space-y-1.5">
          {/* 헤더 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>예수금</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>평가금</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>합산(원화)</div>
          </div>
          {/* 원화 행 */}
          {(cashKRW > 0 || evalKRW > 0) && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs font-bold text-white">
                {cashKRW > 0 ? `₩${formatKRW(cashKRW)}` : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              <div className="text-xs font-bold text-white">
                {evalKRW > 0 ? `₩${formatKRW(evalKRW)}` : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              <div className="text-xs font-bold text-white">
                ₩{formatKRW(Math.floor(totalKRW))}
              </div>
            </div>
          )}
          {/* 달러 행 */}
          {(cashUSD > 0 || evalUSD > 0) && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs font-bold text-white">
                {cashUSD > 0 ? `$${cashUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              <div className="text-xs font-bold text-white">
                {evalUSD > 0 ? `$${evalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span style={{ color: "rgba(255,255,255,0.3)" }}>-</span>}
              </div>
              {cashKRW === 0 && evalKRW === 0 && (
                <div className="text-xs font-bold text-white">
                  ₩{formatKRW(Math.floor(totalKRW))}
                </div>
              )}
            </div>
          )}
          {/* 모두 없는 경우 */}
          {cashKRW === 0 && cashUSD === 0 && evalKRW === 0 && evalUSD === 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>-</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>-</div>
              <div className="text-xs font-bold text-white">₩0</div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3.5">
          <button
            onClick={() => {
              setCashCurrency("KRW");
              setCashModal("deposit");
            }}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            + 입금
          </button>
          <button
            onClick={() => {
              setCashCurrency("KRW");
              setCashModal("withdraw");
            }}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-white cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            출금
          </button>
        </div>
      </div>

      {/* PC 2컬럼 / 모바일 1컬럼 */}
      <div className="md:grid md:grid-cols-[1fr_340px] md:gap-5">
      {/* 좌측: 종목 + 매매 이력 */}
      <div>
      {/* ── ① 보유 종목 리스트 ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">보유 종목</span>
          {/* 원화/외화 토글 */}
          {account.holdings.some((h) => h.country !== "KR") && (
            <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5">
              <button
                onClick={() => setDisplayCurrency("original")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  displayCurrency === "original"
                    ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] shadow-sm"
                    : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                외화
              </button>
              <button
                onClick={() => setDisplayCurrency("KRW")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  displayCurrency === "KRW"
                    ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] shadow-sm"
                    : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                원화
              </button>
            </div>
          )}
        </div>
        <Button size="sm" onClick={() => { resetHoldingForm(); setHoldingModal(true); }}>
          + 종목 등록
        </Button>
      </div>

      {account.holdings.length === 0 ? (
        <EmptyState message="보유 종목이 없습니다." />
      ) : (
        <div className="space-y-2.5 mb-4">
          {account.holdings.map((h) => {
            const isForeign = h.country !== "KR";
            const quote = quotes[h.ticker];
            const currentPrice = quote?.price || h.avgPrice;
            const evalValue = currentPrice * h.quantity;
            const investedValue = h.avgPrice * h.quantity;
            const pnl = evalValue - investedValue;
            const pnlRate = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
            const hasQuote = !!quote;

            const fmtPrice = (v: number) => {
              const sign = v < 0 ? "-" : "";
              const abs = Math.abs(v);
              if (isForeign && displayCurrency === "KRW") {
                return `${sign}₩${Math.round(abs * usdRate).toLocaleString()}`;
              }
              return isForeign
                ? `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${sign}₩${abs.toLocaleString()}`;
            };
            const pnlColor = pnl > 0 ? "var(--color-positive)" : pnl < 0 ? "var(--color-negative)" : "var(--color-g400)";

            return (
              <Card key={h.id}>
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Tag label={isForeign ? "해외" : "국내"} color={isForeign ? "blue" : "green"} />
                      <span className="text-[15px] font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {h.name}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] mt-0.5">
                      {h.ticker} · {h.quantity}주
                    </div>
                  </div>
                  <div className="text-right">
                    {/* 현재가 */}
                    <div className="flex items-center gap-1.5 justify-end">
                      {quotesLoading ? (
                        <div className="w-16 h-4 rounded bg-[var(--color-g200)] dark:bg-[var(--color-border)] animate-pulse" />
                      ) : (
                        <span className="text-[15px] font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                          {fmtPrice(currentPrice)}
                        </span>
                      )}
                    </div>
                    {/* 수익률 */}
                    {hasQuote && !quotesLoading && (
                      <div className="text-xs font-semibold mt-0.5" style={{ color: pnlColor }}>
                        {pnl >= 0 ? "+" : ""}{fmtPrice(pnl)} ({pnlRate >= 0 ? "+" : ""}{pnlRate.toFixed(2)}%)
                      </div>
                    )}
                  </div>
                </div>

                {/* 평단가 · 평가금액 */}
                <div className="flex justify-between text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-2.5">
                  <span>평단가 {fmtPrice(h.avgPrice)}</span>
                  <span>평가금액 {fmtPrice(evalValue)}</span>
                </div>

                <Divider />

                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-1 flex-wrap">
                    {h.sectorManual ? (
                      <Tag label={h.sectorManual} color="gray" />
                    ) : (
                      <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] px-2 py-1 rounded-md border border-dashed border-[var(--color-g200)] dark:border-[var(--color-border)]">
                        내섹터 미지정
                      </span>
                    )}
                    {h.sectorAuto && (
                      <Tag label={h.sectorAuto} color="gray" />
                    )}
                  </div>
                  <button
                    onClick={() => openSectorEdit(h)}
                    className="text-[11px] font-medium text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors shrink-0 ml-2"
                  >
                    편집
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── ③ 매매 이력 (최근 5건) ── */}
      <SectionTitle title="최근 매매" />

      {account.tradeLogs.length === 0 ? (
        <Card>
          <p className="text-sm text-center py-4 text-[var(--color-g400)]">매매 기록이 없습니다.</p>
        </Card>
      ) : (
        <Card>
          {account.tradeLogs.map((t, i) => {
            const date = new Date(t.date);
            const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
            const isBuy = t.type === "BUY";

            return (
              <div
                key={t.id}
                className="flex justify-between items-center py-2.5"
                style={{
                  borderBottom:
                    i < account.tradeLogs.length - 1
                      ? "1px solid var(--color-g100)"
                      : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-g400)] w-9">
                    {dateStr}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-[var(--color-g400)]">
                      {t.quantity}주 · {t.ticker.length <= 6 && /^\d+$/.test(t.ticker) ? `₩${t.price.toLocaleString()}` : `$${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>
                <Tag
                  label={isBuy ? "매수" : "매도"}
                  color={isBuy ? "green" : "orange"}
                />
              </div>
            );
          })}

          <button
            onClick={() => router.push(`/trades?accountId=${account.id}`)}
            className="w-full text-sm font-bold pt-3 pb-1 text-center cursor-pointer"
            style={{ color: "var(--color-primary)" }}
          >
            전체 매매일지 보기 →
          </button>
        </Card>
      )}

      </div>{/* 좌측 끝 */}

      {/* 우측: 섹터 분포 (PC) / 하단 (모바일) */}
      <div>
      {/* ── ④ 섹터 분포 차트 ── */}
      <div className="mt-4 md:mt-0">
        <SectionTitle title="섹터 분포" />
        <Card>
          <SectorDonutChart
            holdings={account.holdings.map((h) => ({
              ...h,
              currentPrice: quotes[h.ticker]?.price ?? undefined,
              exchangeRate: h.country !== "KR" ? usdRate : 1,
            }))}
          />
        </Card>
      </div>
      </div>{/* 우측 끝 */}
      </div>{/* 2컬럼 그리드 끝 */}

      {/* ── 계좌 삭제 ── */}
      <div className="mt-4">
        <button
          onClick={() => setDeleteConfirm(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-negative)" }}
        >
          계좌 삭제
        </button>
      </div>

      {/* 삭제 확인 모달 */}
      <ConfirmDialog
        open={deleteConfirm}
        title="계좌를 삭제할까요?"
        message={`${account.brokerageCompany.name} 계좌의 보유 종목, 매매 기록, 예수금이\n모두 삭제되며 복구할 수 없습니다.`}
        confirmLabel="삭제"
        destructive
        confirmLoading={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteConfirm(false)}
      />

      {/* ── 입출금 바텀시트 ── */}
      <BottomSheet
        open={cashModal !== null}
        onClose={() => setCashModal(null)}
        title={cashModal === "deposit" ? "입금" : "출금"}
      >
        <div className="space-y-5">
          {/* 통화 선택 */}
          <div className="flex gap-2">
            {["KRW", "USD"].map((c) => (
              <button
                key={c}
                onClick={() => setCashCurrency(c)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor:
                    cashCurrency === c ? "var(--color-primary)" : "var(--color-g100)",
                  color: cashCurrency === c ? "#fff" : "var(--color-g500)",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* 금액 */}
          <Input
            label="금액"
            inputMode="numeric"
            value={fmtNum(cashAmount)}
            onChange={(e) => setCashAmount(stripNum(e.target.value, true))}
            placeholder={cashCurrency === "KRW" ? "1,000,000" : "1,000"}
          />

          <Button
            size="lg"
            onClick={handleCashSubmit}
            disabled={cashSubmitting || !cashAmount}
          >
            {cashSubmitting
              ? "처리 중..."
              : cashModal === "deposit"
                ? "입금하기"
                : "출금하기"}
          </Button>
        </div>
      </BottomSheet>

      {/* ── 종목 등록 바텀시트 ── */}
      <BottomSheet
        open={holdingModal}
        onClose={() => setHoldingModal(false)}
        title="보유 종목 등록"
      >
        <div className="space-y-5">
          {/* 캡처 불러오기 */}
          <button
            type="button"
            onClick={() => { setHoldingModal(false); setImportModalOpen(true); }}
            className="w-full py-3 rounded-xl border-2 border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[var(--color-primary-soft)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
            캡처로 불러오기
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)]">또는 직접 입력</span>
            <div className="flex-1 h-px bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
          </div>

          {/* 국내/해외 토글 */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--color-g200)] dark:border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => { setHCountry("KR"); setHTicker(""); setHName(""); setHAvgPrice(""); setHQuantity(""); setHStockQuery(""); setHStockResults([]); setHShowDropdown(false); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                hCountry === "KR"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white dark:bg-[var(--color-card)] text-[var(--color-g400)] dark:text-[var(--color-muted)]"
              }`}
            >
              국내
            </button>
            <button
              type="button"
              onClick={() => { setHCountry("US"); setHTicker(""); setHName(""); setHAvgPrice(""); setHQuantity(""); setHStockQuery(""); setHStockResults([]); setHShowDropdown(false); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                hCountry === "US"
                  ? "bg-[#4285F4] text-white"
                  : "bg-white dark:bg-[var(--color-card)] text-[var(--color-g400)] dark:text-[var(--color-muted)]"
              }`}
            >
              해외
            </button>
          </div>

          {/* 종목 검색 (국내: autocomplete / 해외: 직접 입력) */}
          {hCountry === "KR" ? (
            <div ref={hStockSearchRef}>
              <label className="block text-xs font-medium mb-1 text-[var(--color-g500)] dark:text-[var(--color-muted)]">
                종목 *
              </label>
              {hName && hTicker ? (
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-g200)] dark:border-[var(--color-border)]">
                  <div>
                    <span className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">
                      {hName}
                    </span>
                    <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">
                      {hTicker}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setHName(""); setHTicker(""); setHAvgPrice(""); setHQuantity(""); }}
                    className="text-lg leading-none text-[var(--color-g400)] dark:text-[var(--color-muted)] hover:text-[var(--color-negative)] transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={hStockQuery}
                    onChange={(e) => handleHStockQueryChange(e.target.value)}
                    onFocus={() => { if (hStockQuery) setHShowDropdown(true); }}
                    placeholder="종목명 또는 티커 검색 (예: 삼성전자, 005930)"
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[var(--color-muted)]"
                  />
                  {hShowDropdown && (
                    <div className="mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)] shadow-lg overflow-hidden">
                      {hStockResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {hStockResults.map((s) => (
                            <button
                              key={s.ticker}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectHStock(s); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text)]">
                                  {s.name}
                                </span>
                                <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">
                                  {s.ticker}
                                </span>
                              </div>
                              <span className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                                {s.market}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                          검색 결과가 없습니다
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div ref={hStockSearchRef}>
              <label className="block text-xs font-medium mb-1 text-[var(--color-g500)] dark:text-[var(--color-muted)]">
                종목 *
              </label>
              {hName && hTicker ? (
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-g200)] dark:border-[var(--color-border)]">
                  <div>
                    <span className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">
                      {hName}
                    </span>
                    <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">
                      {hTicker}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setHName(""); setHTicker(""); setHAvgPrice(""); setHQuantity(""); }}
                    className="text-lg leading-none text-[var(--color-g400)] dark:text-[var(--color-muted)] hover:text-[var(--color-negative)] transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={hStockQuery}
                    onChange={(e) => handleHStockQueryChange(e.target.value)}
                    onFocus={() => { if (hStockQuery) setHShowDropdown(true); }}
                    placeholder="종목명 또는 티커 검색 (예: NVIDIA, NVDA)"
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[var(--color-muted)]"
                  />
                  {hShowDropdown && (
                    <div className="mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)] shadow-lg overflow-hidden">
                      {hStockResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {hStockResults.map((s) => (
                            <button
                              key={s.ticker}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectHStock(s); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text)]">
                                  {s.name}
                                </span>
                                <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">
                                  {s.ticker}
                                </span>
                              </div>
                              <span className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                                {s.market}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                          검색 결과가 없습니다
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 평단가 / 수량 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              ref={hAvgPriceRef}
              label={`평단가 * ${hPriceLoading ? "조회 중..." : ""}`}
              inputMode="decimal"
              value={fmtNum(hAvgPrice)}
              onChange={(e) => setHAvgPrice(stripNum(e.target.value, true))}
              placeholder={hPriceLoading ? "" : hCountry === "KR" ? "72,000" : "120.50"}
              disabled={hPriceLoading}
            />
            <Input
              label="수량 *"
              inputMode="numeric"
              value={fmtNum(hQuantity)}
              onChange={(e) => setHQuantity(stripNum(e.target.value))}
              placeholder="50"
            />
          </div>

          {/* 에러 */}
          {hError && (
            <div className="rounded-xl px-4 py-2.5 text-sm bg-[var(--color-negative-soft)] dark:bg-[#3D1519] text-[var(--color-negative)]">
              {hError}
            </div>
          )}

          <Button size="lg" onClick={handleAddHolding} disabled={hSubmitting}>
            {hSubmitting ? "등록 중..." : "종목 등록"}
          </Button>
        </div>
      </BottomSheet>

      {/* ─── 캡처 불러오기 모달 ────────────────────────────── */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onConfirm={(holdings) => handleImportConfirm(holdings)}
      />

      {/* ─── 섹터 편집 바텀시트 ───────────────────────────── */}
      <BottomSheet
        open={sectorEditModal}
        onClose={() => setSectorEditModal(false)}
        title={`섹터 편집 — ${sectorEditHolding?.name ?? ""}`}
      >
        <div className="space-y-5">
          {/* 기본 섹터 (읽기 전용) */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--color-g500)] dark:text-[var(--color-muted)]">기본 섹터</label>
            <div className="pb-2 text-sm border-b border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-g400)] dark:text-[var(--color-muted)]">
              {sectorEditHolding?.sectorAuto ?? "미분류"}
            </div>
          </div>

          {/* 내 섹터 */}
          <Input
            label="내 섹터"
            value={sectorEditValue}
            onChange={(e) => setSectorEditValue(e.target.value)}
            placeholder="예: AI 반도체, 배당주"
          />

          <Button size="lg" onClick={handleSectorEditSubmit} disabled={sectorEditSubmitting}>
            {sectorEditSubmitting ? "저장 중..." : "저장"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
