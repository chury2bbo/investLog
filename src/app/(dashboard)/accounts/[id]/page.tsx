"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Button,
  Tag,
  PnlTag,
  SectionTitle,
  LoadingSpinner,
  EmptyState,
  BottomSheet,
  Divider,
} from "@/components/ui";

function fmtNum(val: string) {
  if (!val) return "";
  const [int, dec] = val.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

function stripNum(val: string, allowDot = false) {
  return allowDot ? val.replace(/[^0-9.]/g, "") : val.replace(/[^0-9]/g, "");
}

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
  const [quotes, setQuotes] = useState<Record<string, { price: number; change: number; changePercent: number }>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [sectorTab, setSectorTab] = useState<"auto" | "manual">("auto");

  // 입출금 모달
  const [cashModal, setCashModal] = useState<"deposit" | "withdraw" | null>(null);
  const [cashCurrency, setCashCurrency] = useState("KRW");
  const [cashAmount, setCashAmount] = useState("");
  const [cashSubmitting, setCashSubmitting] = useState(false);

  // 계좌 삭제 모달
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 현재가
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});

  // 종목 등록 모달
  const [holdingModal, setHoldingModal] = useState(false);
  const [hTicker, setHTicker] = useState("");
  const [hName, setHName] = useState("");
  const [hCountry, setHCountry] = useState("KR");
  const [hAvgPrice, setHAvgPrice] = useState("");
  const [hQuantity, setHQuantity] = useState("");
  const [hSubmitting, setHSubmitting] = useState(false);
  const [hError, setHError] = useState("");
  const [hPriceLoading, setHPriceLoading] = useState(false);

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

      // 현재가 조회
      const tickers = acc.holdings.map((h: Holding) => h.ticker);
      if (tickers.length > 0) {
        setQuotesLoading(true);
        try {
          const qRes = await fetch(`/api/market/quote?tickers=${tickers.join(",")}`);
          if (qRes.ok) {
            const qData = await qRes.json();
            const map: Record<string, { price: number; change: number; changePercent: number }> = {};
            (qData.quotes ?? []).forEach((q: { ticker: string; price: number; change: number; changePercent: number }) => {
              map[q.ticker] = q;
            });
            setQuotes(map);
          }
        } catch {
          /* 현재가 조회 실패 */
        } finally {
          setQuotesLoading(false);
        }
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

  // ─── 섹터 분포 계산 (원본) ─────────────────────────────

  function calcSectorDistribution(type: "auto" | "manual") {
    if (!account) return [];
    const map: Record<string, number> = {};
    let total = 0;

    account.holdings.forEach((h) => {
      const sector =
        type === "auto"
          ? h.sectorAuto ?? "미분류"
          : h.sectorManual ?? "미지정";
      const value = h.avgPrice * h.quantity;
      map[sector] = (map[sector] ?? 0) + value;
      total += value;
    });

    const colors = ["#05C072", "#34D399", "#F07D05", "#4285F4", "#9AA99A", "#F04452"];
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
        color: colors[i % colors.length],
      }));
  }

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
  // TODO: 환율 API 완성 후 실시간 환율로 교체
  const usdRate = 1400;
  const totalCashKRW = cashKRW + cashUSD * usdRate;
  const hasManualSector = account.holdings.some((h) => h.sectorManual);
  const sectorData = calcSectorDistribution(sectorTab);

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/accounts")} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4F0] dark:bg-[#2D3D30] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A221A] dark:text-[#E8EEE8]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div>
            <p className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A]">계좌 상세</p>
            <h1 className="text-[26px] font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
              {account.brokerageCompany.name}
              {account.memo && (
                <span className="ml-2 text-sm font-normal text-[#9AA99A] dark:text-[#5A6A5A]">
                  {account.memo}
                </span>
              )}
            </h1>
          </div>
        </div>
        <Tag
          label={
            account.holdings.some((h) => h.country !== "KR")
              ? "해외주식"
              : "국내주식"
          }
          color={account.holdings.some((h) => h.country !== "KR") ? "blue" : "green"}
        />
      </div>

      {/* ── ② 예수금 관리 ── */}
      <div
        className="rounded-[20px] p-5 mb-4"
        style={{
          background: "linear-gradient(135deg, #05C072, #34D399)",
        }}
      >
        <div className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
          총 예수금
        </div>
        <div className="text-[28px] font-extrabold text-white tracking-tight">
          ₩{totalCashKRW.toLocaleString()}
        </div>

        {/* 원화 / 외화 내역 */}
        <div className="flex gap-3 mt-2">
          {cashKRW > 0 && (
            <div className="rounded-lg px-3 py-1.5" style={{ background: "rgba(255,255,255,0.15)" }}>
              <span className="text-[11px] text-white/50">원화</span>
              <span className="text-xs font-bold text-white ml-1.5">₩{cashKRW.toLocaleString()}</span>
            </div>
          )}
          {cashUSD > 0 && (
            <div className="rounded-lg px-3 py-1.5" style={{ background: "rgba(255,255,255,0.15)" }}>
              <span className="text-[11px] text-white/50">외화</span>
              <span className="text-xs font-bold text-white ml-1.5">${cashUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

      {/* ── ① 보유 종목 리스트 ── */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">보유 종목</span>
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

            const fmtPrice = (v: number) =>
              isForeign
                ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `₩${v.toLocaleString()}`;

            const pnlColor = pnl > 0 ? "#F04452" : pnl < 0 ? "#4285F4" : "#9AA99A";

            return (
              <Card key={h.id}>
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Tag label={isForeign ? "해외" : "국내"} color={isForeign ? "blue" : "green"} />
                      <span className="text-[15px] font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                        {h.name}
                      </span>
                    </div>
                    <div className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-0.5">
                      {h.ticker} · {h.quantity}주
                    </div>
                  </div>
                  <div className="text-right">
                    {/* 현재가 */}
                    <div className="flex items-center gap-1.5 justify-end">
                      {quotesLoading ? (
                        <div className="w-16 h-4 rounded bg-[#E8EEE8] dark:bg-[#2D3D30] animate-pulse" />
                      ) : (
                        <span className="text-[15px] font-bold text-[#1A221A] dark:text-[#E8EEE8]">
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
                <div className="flex justify-between text-xs text-[#9AA99A] dark:text-[#5A6A5A] mb-2.5">
                  <span>평단가 {fmtPrice(h.avgPrice)}</span>
                  <span>평가금액 {fmtPrice(evalValue)}</span>
                </div>

                <Divider />

                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-1 flex-wrap">
                    {h.sectorAuto && (
                      <Tag label={h.sectorAuto} color="gray" />
                    )}
                    {h.sectorManual && (
                      <Tag label={h.sectorManual} color="green" />
                    )}
                    {h.tags.map((t) => (
                      <Tag key={t} label={t} color="blue" />
                    ))}
                  </div>
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
          <p className="text-sm text-center py-4 text-[#9AA99A]">매매 기록이 없습니다.</p>
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
                      ? "1px solid #F0F4F0"
                      : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#9AA99A] w-9">
                    {dateStr}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[#1A221A] dark:text-[#E8EEE8]">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-[#9AA99A]">
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
            style={{ color: "#05C072" }}
          >
            전체 매매일지 보기 →
          </button>
        </Card>
      )}

      {/* ── ④ 섹터 분포 차트 ── */}
      <div className="mt-4">
        <SectionTitle title="섹터 분포" />

        {account.holdings.length === 0 ? (
          <Card>
            <p className="text-sm text-center py-4 text-[#9AA99A]">보유 종목이 없습니다.</p>
          </Card>
        ) : (
          <Card>
            {/* 탭 */}
            <div
              className="flex rounded-[10px] p-0.5 mb-4"
              style={{ backgroundColor: "#F0F4F0" }}
            >
              <button
                onClick={() => setSectorTab("auto")}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: sectorTab === "auto" ? "#FFFFFF" : "transparent",
                  color: sectorTab === "auto" ? "#1A221A" : "#9AA99A",
                  boxShadow:
                    sectorTab === "auto"
                      ? "0 1px 4px rgba(0,0,0,0.08)"
                      : "none",
                }}
              >
                기본 섹터
              </button>
              {hasManualSector && (
                <button
                  onClick={() => setSectorTab("manual")}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background:
                      sectorTab === "manual" ? "#FFFFFF" : "transparent",
                    color: sectorTab === "manual" ? "#1A221A" : "#9AA99A",
                    boxShadow:
                      sectorTab === "manual"
                        ? "0 1px 4px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  내 섹터
                </button>
              )}
            </div>

            {/* 바 차트 */}
            {sectorData.map((item) => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm text-[#1A221A] dark:text-[#E8EEE8]">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                    {item.pct}%
                  </span>
                </div>
                <div
                  className="h-2 rounded"
                  style={{ backgroundColor: "#F0F4F0" }}
                >
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* ── 계좌 삭제 ── */}
      <div className="mt-4">
        <button
          onClick={() => setDeleteConfirm(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#F04452" }}
        >
          계좌 삭제
        </button>
      </div>

      {/* 삭제 확인 모달 */}
      <BottomSheet
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="계좌를 삭제할까요?"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#6B7B6B] leading-relaxed">
            <strong>{account.brokerageCompany.name}</strong> 계좌와 관련된
            보유 종목, 예수금, 매매 기록이 모두 삭제됩니다.
            이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: "#F04452" }}
            >
              {deleting ? "삭제 중..." : "삭제하기"}
            </button>
          </div>
        </div>
      </BottomSheet>

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
                    cashCurrency === c ? "#05C072" : "#F0F4F0",
                  color: cashCurrency === c ? "#fff" : "#6B7B6B",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* 금액 */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B]">
              금액
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={fmtNum(cashAmount)}
              onChange={(e) => setCashAmount(stripNum(e.target.value, true))}
              placeholder={cashCurrency === "KRW" ? "1,000,000" : "1,000"}
              className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] text-[#1A221A]"
            />
          </div>

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
          {/* 국내/해외 토글 */}
          <div className="flex rounded-xl overflow-hidden border border-[#E8EEE8] dark:border-[#2D3D30]">
            <button
              type="button"
              onClick={() => { setHCountry("KR"); setHTicker(""); setHName(""); setHAvgPrice(""); setHQuantity(""); setHStockQuery(""); setHStockResults([]); setHShowDropdown(false); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                hCountry === "KR"
                  ? "bg-[#05C072] text-white"
                  : "bg-white dark:bg-[#1D2720] text-[#9AA99A] dark:text-[#5A6A5A]"
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
                  : "bg-white dark:bg-[#1D2720] text-[#9AA99A] dark:text-[#5A6A5A]"
              }`}
            >
              해외
            </button>
          </div>

          {/* 종목 검색 (국내: autocomplete / 해외: 직접 입력) */}
          {hCountry === "KR" ? (
            <div ref={hStockSearchRef}>
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
                종목 *
              </label>
              {hName && hTicker ? (
                <div className="flex items-center justify-between pb-2 border-b border-[#D4DDD4] dark:border-[#2D3D30]">
                  <div>
                    <span className="text-sm font-semibold text-[#1A221A] dark:text-[#E8EEE8]">
                      {hName}
                    </span>
                    <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] ml-2">
                      {hTicker}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setHName(""); setHTicker(""); setHAvgPrice(""); setHQuantity(""); }}
                    className="text-lg leading-none text-[#9AA99A] dark:text-[#5A6A5A] hover:text-[#F04452] transition-colors"
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
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A]"
                  />
                  {hShowDropdown && (
                    <div className="mt-1 rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] shadow-lg overflow-hidden">
                      {hStockResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {hStockResults.map((s) => (
                            <button
                              key={s.ticker}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectHStock(s); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium text-[#1A221A] dark:text-[#E8EEE8]">
                                  {s.name}
                                </span>
                                <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] ml-2">
                                  {s.ticker}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#B4C4B4] dark:text-[#4A5A4A]">
                                {s.market}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-[#9AA99A] dark:text-[#5A6A5A]">
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
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
                종목 *
              </label>
              {hName && hTicker ? (
                <div className="flex items-center justify-between pb-2 border-b border-[#D4DDD4] dark:border-[#2D3D30]">
                  <div>
                    <span className="text-sm font-semibold text-[#1A221A] dark:text-[#E8EEE8]">
                      {hName}
                    </span>
                    <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] ml-2">
                      {hTicker}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setHName(""); setHTicker(""); setHAvgPrice(""); setHQuantity(""); }}
                    className="text-lg leading-none text-[#9AA99A] dark:text-[#5A6A5A] hover:text-[#F04452] transition-colors"
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
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A]"
                  />
                  {hShowDropdown && (
                    <div className="mt-1 rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] shadow-lg overflow-hidden">
                      {hStockResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {hStockResults.map((s) => (
                            <button
                              key={s.ticker}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectHStock(s); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium text-[#1A221A] dark:text-[#E8EEE8]">
                                  {s.name}
                                </span>
                                <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] ml-2">
                                  {s.ticker}
                                </span>
                              </div>
                              <span className="text-[10px] text-[#B4C4B4] dark:text-[#4A5A4A]">
                                {s.market}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-[#9AA99A] dark:text-[#5A6A5A]">
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
            <div>
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
                평단가 * {hPriceLoading && <span className="text-[#9AA99A]">조회 중...</span>}
              </label>
              <input
                ref={hAvgPriceRef}
                type="text"
                inputMode="decimal"
                value={fmtNum(hAvgPrice)}
                onChange={(e) => setHAvgPrice(stripNum(e.target.value, true))}
                placeholder={hPriceLoading ? "" : hCountry === "KR" ? "72,000" : "120.50"}
                disabled={hPriceLoading}
                className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
                수량 *
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={fmtNum(hQuantity)}
                onChange={(e) => setHQuantity(stripNum(e.target.value))}
                placeholder="50"
                className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A]"
              />
            </div>
          </div>

          {/* 에러 */}
          {hError && (
            <div className="rounded-xl px-4 py-2.5 text-sm bg-[#FEE8EA] dark:bg-[#3D1519] text-[#F04452]">
              {hError}
            </div>
          )}

          <Button size="lg" onClick={handleAddHolding} disabled={hSubmitting}>
            {hSubmitting ? "등록 중..." : "종목 등록"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
