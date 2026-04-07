"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Input,
  Select,
  Toast,
  LoadingSpinner,
  EmptyState,
  BottomSheet,
  ConfirmDialog,
  Skeleton,
  ThemeToggle,
} from "@/components/ui";
import { TradeFilterCard } from "./_components/TradeFilterCard";
import { TradesTable } from "./_components/TradesTable";
import { TradeTopBar } from "./_components/TradeTopBar";
import { TradeFilterPanel } from "./_components/TradeFilterPanel";
import { TradesList } from "./_components/TradesList";
import { SummaryChips } from "./_components/SummaryChips";
import TradeCalendar from "@/components/trades/TradeCalendar";
import {
  type TradeLog,
  type AccountOption,
  type Filters,
  INITIAL_FILTERS,
  getCountryFromTicker,
} from "./_components/types";

// ─── 이유 태그 & 심리 상태 (공통 상수) ──────────────────

import {
  BUY_REASON_TAGS,
  SELL_REASON_TAGS,
  EMOTIONS as EMOTION_LABELS,
} from "@/lib/constants";

const EMOTION_ICONS: Record<string, React.ReactNode> = {
  확신: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20v-4"/><path d="M12 20V8"/><path d="M18 20V4"/><path d="M2 20h20"/></svg>,
  불안: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5-2 4-2 4 2 4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M9.5 15.5l-1 2"/><path d="M14.5 15.5l1 2"/></svg>,
  FOMO: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 9h2"/><path d="M14 9h2"/><path d="M9 15c.6-1 1.5-1.5 3-1.5s2.4.5 3 1.5"/><line x1="12" y1="4" x2="12" y2="2"/><line x1="8" y1="4.5" x2="7" y2="2.8"/><line x1="16" y1="4.5" x2="17" y2="2.8"/></svg>,
  손절: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/><path d="M2 20h20"/><line x1="2" y1="4" x2="22" y2="20" strokeWidth="2"/></svg>,
  기계적: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

const EMOTIONS = EMOTION_LABELS.map((e) => ({
  label: e.label,
  icon: EMOTION_ICONS[e.label] ?? null,
}));

import { fmtNum, stripNum } from "@/lib/format";


// ─── 메인 페이지 ─────────────────────────────────────────

export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // 필터: draft = 입력 중, applied = 조회 실행된 상태
  const [draftFilters, setDraftFilters] = useState<Filters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(INITIAL_FILTERS);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // 뷰 모드: 리스트 / 캘린더
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // 매매 상세 바텀시트
  const [detailTrade, setDetailTrade] = useState<TradeLog | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detailTags, setDetailTags] = useState<string[]>([]);
  const [detailEmotion, setDetailEmotion] = useState<string>("");
  const [detailMemo, setDetailMemo] = useState("");
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailDeleteConfirm, setDetailDeleteConfirm] = useState(false);
  const [detailDeleting, setDetailDeleting] = useState(false);

  // 모바일 필터 패널 토글
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // 매매 등록 폼
  const [formAccountId, setFormAccountId] = useState<number | null>(null);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formType, setFormType] = useState<"BUY" | "SELL">("BUY");
  const [formTicker, setFormTicker] = useState("");
  const [formName, setFormName] = useState("");
  const [formCountry, setFormCountry] = useState("KR");
  const [formPrice, setFormPrice] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formReasonTags, setFormReasonTags] = useState<string[]>([]);
  const [formEmotion, setFormEmotion] = useState<string>("");
  const [formMemo, setFormMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cashWarning, setCashWarning] = useState(false);
  const [cashConfirmOpen, setCashConfirmOpen] = useState(false);
  const [cashConfirmMsg, setCashConfirmMsg] = useState("");

  // 토스트
  const [toast, setToast] = useState<{ title: string; message: string; visible: boolean }>({ title: "", message: "", visible: false });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 이전 거래 불러오기
  const [showPrevTrades, setShowPrevTrades] = useState(false);

  // 가격 자동조회
  const [formPriceLoading, setFormPriceLoading] = useState(false);
  const formPriceRef = useRef<HTMLInputElement>(null);

  // 종목 검색 autocomplete
  const [stockQuery, setStockQuery] = useState("");
  const [stockResults, setStockResults] = useState<{ ticker: string; name: string; market: string; country?: string }[]>([]);
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const [stockActiveIndex, setStockActiveIndex] = useState(-1);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stockSearchRef = useRef<HTMLDivElement>(null);
  const stockInputRef = useRef<HTMLInputElement>(null);
  const stockItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // ─── 데이터 로딩 ───────────────────────────────────────

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedFilters.accountId) params.set("accountId", appliedFilters.accountId);
      if (appliedFilters.tradeType) params.set("type", appliedFilters.tradeType);
      if (appliedFilters.market) params.set("market", appliedFilters.market);
      if (appliedFilters.dateFrom) params.set("dateFrom", appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.set("dateTo", appliedFilters.dateTo);
      if (appliedFilters.keyword) params.set("keyword", appliedFilters.keyword);
      params.set("skip", String(page * pageSize));
      params.set("take", String(pageSize));

      const res = await fetch(`/api/trades?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data && typeof data.total === "number") {
          setTrades(data.data);
          setTotal(data.total);
        } else {
          // API가 아직 paginated 응답이 아닌 경우 호환
          const arr = Array.isArray(data) ? data : [];
          setTrades(arr);
          setTotal(arr.length);
        }
      }
    } catch {
      /* 조회 실패 */
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        const accList = Array.isArray(data) ? data : [];
        setAccounts(accList);
        if (accList.length > 0 && !formAccountId) {
          setFormAccountId(accList[0].id);
        }
      }
    } catch {
      /* 조회 실패 */
    }
  }, [formAccountId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (stockSearchRef.current && !stockSearchRef.current.contains(e.target as Node)) {
        setShowStockDropdown(false);
        setStockActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (stockActiveIndex === -1) stockInputRef.current?.focus();
    else stockItemRefs.current[stockActiveIndex]?.focus();
  }, [stockActiveIndex]);

  useEffect(() => {
    setStockActiveIndex(-1);
  }, [stockResults]);

  // draft 필터 변경 (입력 중 — fetch 안 함)
  function handleFilterChange(f: Filters) {
    // 매수/매도, 국내/해외 토글은 즉시 반영
    if (f.tradeType !== draftFilters.tradeType || f.market !== draftFilters.market) {
      setDraftFilters(f);
      setAppliedFilters(f);
      setPage(0);
    } else {
      setDraftFilters(f);
    }
  }

  // [조회] 버튼 — draft를 applied에 반영
  function handleSearch() {
    setAppliedFilters(draftFilters);
    setPage(0);
  }

  // ─── 요약 계산 ───────────────────────────────────────���─

  const buyKrw = trades
    .filter((t) => t.type === "BUY" && getCountryFromTicker(t.ticker) === "KR")
    .reduce((sum, t) => sum + t.price * t.quantity, 0);
  const buyUsd = trades
    .filter((t) => t.type === "BUY" && getCountryFromTicker(t.ticker) === "US")
    .reduce((sum, t) => sum + t.price * t.quantity, 0);
  const sellKrw = trades
    .filter((t) => t.type === "SELL" && getCountryFromTicker(t.ticker) === "KR")
    .reduce((sum, t) => sum + t.price * t.quantity, 0);
  const sellUsd = trades
    .filter((t) => t.type === "SELL" && getCountryFromTicker(t.ticker) === "US")
    .reduce((sum, t) => sum + t.price * t.quantity, 0);
  const sellTrades = trades.filter((t) => t.type === "SELL" && t.realizedPnlRate != null);
  const avgPnlRate = sellTrades.length > 0
    ? sellTrades.reduce((sum, t) => sum + (t.realizedPnlRate ?? 0), 0) / sellTrades.length
    : null;

  // ─── 매매 등록 ─────────────────────────────────────────

  function showToast(title: string, message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, message, visible: true });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3500);
  }

  function resetForm() {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormType("BUY");
    setFormTicker("");
    setFormName("");
    setFormCountry("KR");
    setFormPrice("");
    setFormQuantity("");
    setFormReasonTags([]);
    setFormEmotion("");
    setFormMemo("");
    setSubmitError("");
    setCashWarning(false);
    setShowPrevTrades(false);
    setStockQuery("");
    setStockResults([]);
    setShowStockDropdown(false);
    setFormPriceLoading(false);
  }

  function handleStockQueryChange(val: string) {
    setStockQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!val.trim()) {
      setStockResults([]);
      setShowStockDropdown(false);
      return;
    }
    setShowStockDropdown(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(val.trim())}&country=ALL`);
        if (res.ok) {
          const data = await res.json();
          setStockResults(Array.isArray(data) ? data : []);
        }
      } catch { /* 검색 실패 */ }
    }, 300);
  }

  async function selectStock(stock: { ticker: string; name: string; market: string; country?: string }) {
    setFormName(stock.name);
    setFormTicker(stock.ticker);
    setFormCountry(stock.country ?? (/^\d{6}$/.test(stock.ticker) ? "KR" : "US"));
    setStockQuery("");
    setShowStockDropdown(false);
    setStockResults([]);
    setFormPriceLoading(true);
    try {
      const res = await fetch(`/api/market/quote?tickers=${encodeURIComponent(stock.ticker)}`);
      if (res.ok) {
        const data = await res.json();
        const quote = data.quotes?.[0] ?? null;
        if (quote?.price) setFormPrice(String(quote.price));
      }
    } catch { /* 조회 실패 시 수동 입력 */ }
    finally {
      setFormPriceLoading(false);
      setTimeout(() => formPriceRef.current?.focus(), 50);
    }
  }

  function openModal() {
    resetForm();
    if (accounts.length > 0 && !formAccountId) setFormAccountId(accounts[0].id);
    setModalOpen(true);
  }

  function toggleReasonTag(tag: string) {
    setFormReasonTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function loadPrevTrade(trade: { ticker: string; name: string }) {
    setFormTicker(trade.ticker);
    setFormName(trade.name);
    setFormCountry(/^\d{6}$/.test(trade.ticker) ? "KR" : "US");
    setShowPrevTrades(false);
    setFormPriceLoading(true);
    try {
      const res = await fetch(`/api/market/quote?tickers=${encodeURIComponent(trade.ticker)}`);
      if (res.ok) {
        const data = await res.json();
        const quote = data.quotes?.[0] ?? null;
        if (quote?.price) setFormPrice(String(quote.price));
      }
    } catch { /* 조회 실패 시 수동 입력 */ }
    finally {
      setFormPriceLoading(false);
      setTimeout(() => formPriceRef.current?.focus(), 50);
    }
  }

  function checkAndSubmit() {
    if (!formAccountId || !formTicker || !formName || !formPrice || !formQuantity) {
      setSubmitError("필수 항목을 모두 입력해주세요.");
      return;
    }

    const price = parseFloat(formPrice);
    const quantity = parseInt(formQuantity, 10);

    if (isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
      setSubmitError("가격과 수량은 0보다 큰 값을 입력해주세요.");
      return;
    }
    const selectedAccount = accounts.find((a) => a.id === formAccountId);

    if (formType === "SELL" && selectedAccount) {
      const holding = selectedAccount.holdings.find((h) => h.ticker === formTicker);
      if (!holding) {
        showToast("미보유 종목", `${formName}(${formTicker})`);
        return;
      }
      if (quantity > holding.quantity) {
        showToast("보유 수량 부족", `매도 ${quantity.toLocaleString()}주 · 보유 ${holding.quantity.toLocaleString()}주`);
        return;
      }
    }

    // 매수 시 예수금 부족 확인
    if (formType === "BUY" && selectedAccount) {
      const totalAmount = price * quantity;
      const isForeign = !(/^\d{6}$/.test(formTicker));
      const currency = isForeign ? "USD" : "KRW";
      const cashBalance = selectedAccount.cashBalances.find((c) => c.currency === currency)?.amount ?? 0;
      if (totalAmount > cashBalance) {
        const sym = currency === "KRW" ? "₩" : "$";
        setCashConfirmMsg(`예수금이 부족합니다.\n필요 ${sym}${totalAmount.toLocaleString()} · 보유 ${sym}${cashBalance.toLocaleString()}\n\n그래도 등록하시겠습니까?`);
        setCashConfirmOpen(true);
        return;
      }
    }

    doSubmit();
  }

  async function doSubmit() {
    setSubmitting(true);
    setSubmitError("");
    setCashWarning(false);

    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: formAccountId,
          ticker: formTicker,
          name: formName,
          country: formCountry,
          date: formDate,
          type: formType,
          price: parseFloat(formPrice),
          quantity: parseInt(formQuantity, 10),
          reasonTags: formReasonTags,
          emotion: formEmotion || null,
          memo: formMemo || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "등록에 실패했습니다.");
        return;
      }
      if (data.cashWarning) setCashWarning(true);
      setModalOpen(false);
      resetForm();
      fetchTrades();
    } catch {
      setSubmitError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const reasonTagOptions = formType === "BUY" ? BUY_REASON_TAGS : SELL_REASON_TAGS;
  const selectedAccount = accounts.find((a) => a.id === formAccountId);

  // ─── 매매 상세 열기/수정/저장 ─────────────────────────────

  function openDetail(trade: TradeLog) {
    // trades 배열에서 최신 데이터 찾기
    const latest = trades.find((t) => t.id === trade.id) ?? trade;
    setDetailTrade(latest);
    setDetailTags(latest.reasonTags);
    setDetailEmotion(latest.emotion ?? "");
    setDetailMemo(latest.memo ?? "");
    setDetailEditing(false);
  }

  async function saveDetail() {
    if (!detailTrade) return;
    setDetailSaving(true);
    try {
      const res = await fetch(`/api/trades/${detailTrade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reasonTags: detailTags,
          emotion: detailEmotion || null,
          memo: detailMemo || null,
        }),
      });
      if (res.ok) {
        const updated = { ...detailTrade, reasonTags: detailTags, emotion: detailEmotion || null, memo: detailMemo || null };
        setDetailTrade(updated);
        setDetailEditing(false);
        // trades 배열 즉시 교체 + 백그라운드 갱신
        setTrades((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
        await fetchTrades();
      }
    } catch { /* 저장 실패 */ }
    finally { setDetailSaving(false); }
  }

  async function deleteDetail() {
    if (!detailTrade) return;
    setDetailDeleting(true);
    try {
      const res = await fetch(`/api/trades/${detailTrade.id}`, { method: "DELETE" });
      if (res.ok) {
        setDetailDeleteConfirm(false);
        setDetailTrade(null);
        fetchTrades();
      }
    } catch { /* 삭제 실패 */ }
    finally { setDetailDeleting(false); }
  }

  // ─── 로딩 ──────────────────────────────────────────────

  if (loading && trades.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto px-5 py-6 pb-28 md:pb-6">
        {/* Header (즉시 표시) */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-[var(--color-border)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)]"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">매매일지</h1>
          </div>
          <div className="md:hidden"><ThemeToggle /></div>
        </div>

        {/* Filter area */}
        <Skeleton className="w-full h-12 rounded-xl mb-4" />

        {/* 모바일: 리스트형 스켈레톤 */}
        <div className="md:hidden rounded-2xl overflow-hidden bg-[var(--color-surface)] dark:bg-[var(--color-card)]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`px-3.5 py-3 ${i < 5 ? "border-b border-[var(--color-g100)] dark:border-[var(--color-border)]" : ""}`}>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-8 h-[18px] rounded" />
                  <Skeleton className="w-6 h-[18px] rounded" />
                  <Skeleton className="w-20 h-4" />
                </div>
                <Skeleton className="w-16 h-4" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="w-44 h-3" />
                <Skeleton className="w-12 h-4 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* PC: 테이블형 스켈레톤 */}
        <div className="hidden md:block rounded-2xl overflow-hidden bg-[var(--color-surface)] dark:bg-[var(--color-card)]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="px-4 py-3 border-b border-[var(--color-g100)] dark:border-[var(--color-border)]">
            <div className="grid grid-cols-7 gap-2">
              {["w-12", "w-8", "w-6", "w-16", "w-14", "w-10", "w-12"].map((w, i) => (
                <Skeleton key={i} className={`${w} h-3`} />
              ))}
            </div>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`px-4 py-3 ${i < 5 ? "border-b border-[var(--color-g100)] dark:border-[var(--color-border)]" : ""}`}>
              <div className="grid grid-cols-7 gap-2 items-center">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-8 h-5 rounded" />
                <Skeleton className="w-6 h-5 rounded" />
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-10 h-4" />
                <Skeleton className="w-14 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="animate-[fadeIn_0.4s_ease-out]">
      {/* 토스트 */}
      <Toast
        title={toast.title}
        message={toast.message}
        visible={toast.visible}
        onClose={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* ══════════════════════════════════════════════════ */}
      {/* PC 버전 (md 이상) */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="hidden md:block w-full max-w-5xl mx-auto px-5 py-6">
        {/* 타이틀 — 계좌 관리와 동일 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-[var(--color-border)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)] dark:text-[var(--color-text)]"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] dark:text-[var(--color-text)]">
              매매일지
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 뷰 전환 아이콘 */}
            <button
              onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-g100)] dark:bg-[var(--color-border)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors cursor-pointer"
              aria-label="뷰 전환"
            >
              {viewMode === "list" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-g500)] dark:text-[var(--color-muted)]">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-g500)] dark:text-[var(--color-muted)]">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              )}
            </button>
            <Button size="sm" onClick={openModal}>
              + 매매 등록
            </Button>
          </div>
        </div>

        {viewMode === "list" ? (
          <>
            {/* 필터 — 타이틀 아래 */}
            <TradeFilterCard
              filters={draftFilters}
              onChange={handleFilterChange}
              onSearch={handleSearch}
              accounts={accounts}
            />

            {/* 요약 칩 */}
            <div className="mb-3">
              <SummaryChips totalCount={total} buyKrw={buyKrw} buyUsd={buyUsd} sellKrw={sellKrw} sellUsd={sellUsd} avgPnlRate={avgPnlRate} />
            </div>

            {/* 테이블 or 빈 상태 */}
            {trades.length === 0 ? (
              <EmptyState message={total === 0 ? "아직 매매 기록이 없어요. 첫 매매를 등록해보세요." : "조건에 맞는 매매 기록이 없어요."} />
            ) : (
              <TradesTable
                trades={trades}
                page={page}
                total={total}
                pageSize={pageSize}
                onPageChange={setPage}
                onSelect={openDetail}
              />
            )}
          </>
        ) : (
          <>
            {/* 캘린더용 세그먼트 필터 */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5">
                {(["", "BUY", "SELL"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleFilterChange({ ...appliedFilters, tradeType: t })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      appliedFilters.tradeType === t
                        ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] shadow-sm"
                        : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {t === "" ? "전체" : t === "BUY" ? "매수" : "매도"}
                  </button>
                ))}
              </div>
              <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5">
                {(["", "KR", "US"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleFilterChange({ ...appliedFilters, market: m })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      appliedFilters.market === m
                        ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] shadow-sm"
                        : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    {m === "" ? "전체" : m === "KR" ? "국내" : "해외"}
                  </button>
                ))}
              </div>
            </div>
            <Card><TradeCalendar tradeType={appliedFilters.tradeType} market={appliedFilters.market} onSelect={(t) => openDetail(t as unknown as TradeLog)} /></Card>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 모바일 버전 (md 미만) */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="block md:hidden pb-28">
        {/* 상단 고정 바 */}
        <TradeTopBar
          totalCount={total}
          filters={draftFilters}
          onChange={handleFilterChange}
          filterOpen={mobileFilterOpen}
          onToggleFilter={() => setMobileFilterOpen((v) => !v)}
          onOpenModal={openModal}
          viewMode={viewMode}
          onToggleView={() => setViewMode(viewMode === "list" ? "calendar" : "list")}
        />


        {viewMode === "list" ? (
          <>
            {/* 필터 패널 (토글) */}
            {mobileFilterOpen && (
              <TradeFilterPanel
                filters={draftFilters}
                onChange={handleFilterChange}
                onSearch={() => { handleSearch(); setMobileFilterOpen(false); }}
                accounts={accounts}
              />
            )}

            {/* 요약 칩 */}
            <div className="px-4 py-2.5">
              <SummaryChips totalCount={total} buyKrw={buyKrw} buyUsd={buyUsd} sellKrw={sellKrw} sellUsd={sellUsd} avgPnlRate={avgPnlRate} />
            </div>

            {/* 리스트 or 빈 상태 */}
            <div className="px-4">
              {trades.length === 0 ? (
                <EmptyState message={total === 0 ? "아직 매매 기록이 없어요. 첫 매매를 등록해보세요." : "조건에 맞는 매매 기록이 없어요."} />
              ) : (
                <TradesList trades={trades} onSelect={openDetail} />
              )}
            </div>
          </>
        ) : (
          <div className="px-4 py-2.5">
            <Card><TradeCalendar tradeType={appliedFilters.tradeType} market={appliedFilters.market} onSelect={(t) => openDetail(t as unknown as TradeLog)} /></Card>
          </div>
        )}

        {/* FAB 버튼 */}
        <button
          onClick={openModal}
          className="fixed bottom-24 right-5 w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white text-2xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/30 z-40 active:scale-95 transition-transform"
        >
          +
        </button>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 매매 상세 바텀시트 */}
      {/* ══════════════════════════════════════════════════ */}
      <BottomSheet open={!!detailTrade} onClose={() => setDetailTrade(null)} title="매매 상세">
        {detailTrade && (() => {
          const country = getCountryFromTicker(detailTrade.ticker);
          const accountName = `${detailTrade.account.brokerageCompany.name}${detailTrade.account.memo ? ` · ${detailTrade.account.memo}` : ""}`;
          const emotionData = EMOTIONS.find((e) => e.label === detailTrade.emotion);
          const isBuy = detailTrade.type === "BUY";
          const total = detailTrade.price * detailTrade.quantity;
          const isForeign = country !== "KR";
          const priceStr = isForeign
            ? `$${detailTrade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `₩${detailTrade.price.toLocaleString()}`;
          const totalStr = isForeign
            ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `₩${total.toLocaleString()}`;

          return (
            <div className="space-y-4">
              {/* 종목 + 유형 */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${isBuy ? "bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-positive)]" : "bg-[#FFFBF5] dark:bg-[rgba(255,123,0,0.15)] text-[var(--color-warning)]"}`}>
                  {isBuy ? "매수" : "매도"}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${country === "KR" ? "bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-positive)]" : "bg-[#E8F0FE] dark:bg-[rgba(66,133,244,0.15)] text-[#4285F4]"}`}>
                  {country === "KR" ? "국내" : "해외"}
                </span>
                <span className="text-base font-bold text-[var(--color-text)]">{detailTrade.name}</span>
                <span className="text-xs text-[var(--color-g400)]">{detailTrade.ticker}</span>
              </div>

              {/* 매매 정보 */}
              <div className="py-3 border-y border-[var(--color-g200)] dark:border-[var(--color-border)] space-y-2">
                {/* 1행: 매매일 · 계좌 */}
                <div className="flex items-center gap-1.5 text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">
                  <span>{new Date(detailTrade.date).toLocaleDateString("ko-KR")}</span>
                  <span>·</span>
                  <span>{accountName}</span>
                </div>
                {/* 2행: 단가 × 수량 = 체결금액 (+ 수익률) */}
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-[var(--color-text)]">{priceStr}</span>
                  <span className="text-[var(--color-g400)]">×</span>
                  <span className="text-[var(--color-text)]">{detailTrade.quantity.toLocaleString()}주</span>
                  <span className="text-[var(--color-g400)]">=</span>
                  <span className="font-bold text-[var(--color-text)]">{totalStr}</span>
                  {detailTrade.type === "SELL" && detailTrade.realizedPnlRate != null && (
                    <span className={`font-bold ml-1 ${detailTrade.realizedPnlRate >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>
                      ({detailTrade.realizedPnlRate >= 0 ? "+" : ""}{detailTrade.realizedPnlRate.toFixed(2)}%)
                    </span>
                  )}
                </div>
              </div>

              {/* 이유 태그 */}
              <div>
                <div className="text-[11px] font-medium text-[var(--color-g400)] mb-2">이유 태그</div>
                {detailEditing ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(isBuy ? BUY_REASON_TAGS : SELL_REASON_TAGS).map((tag) => (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => setDetailTags((prev) => prev.includes(tag.label) ? prev.filter((t) => t !== tag.label) : [...prev, tag.label])}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          detailTags.includes(tag.label)
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-text)]"
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                ) : detailTrade.reasonTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detailTrade.reasonTags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-text)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-g400)]">없음</span>
                )}
              </div>

              {/* 심리 상태 */}
              <div>
                <div className="text-[11px] font-medium text-[var(--color-g400)] mb-2">심리 상태</div>
                {detailEditing ? (
                  <div className="flex gap-2">
                    {EMOTIONS.map((em) => (
                      <button
                        key={em.label}
                        type="button"
                        onClick={() => setDetailEmotion(detailEmotion === em.label ? "" : em.label)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          detailEmotion === em.label
                            ? "bg-[#F5F0FF] dark:bg-[rgba(139,92,246,0.15)] text-[#8B5CF6] ring-1 ring-[#8B5CF6]"
                            : "bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-text)]"
                        }`}
                      >
                        <span>{em.icon}</span>
                        <span className="font-medium">{em.label}</span>
                      </button>
                    ))}
                  </div>
                ) : emotionData ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F0FF] dark:bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]">
                    <span className="[&>svg]:w-[14px] [&>svg]:h-[14px]">{emotionData.icon}</span>
                    <span className="text-xs font-medium">{detailTrade.emotion}</span>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-g400)]">없음</span>
                )}
              </div>

              {/* 메모 */}
              <div>
                <div className="text-[11px] font-medium text-[var(--color-g400)] mb-2">메모</div>
                {detailEditing ? (
                  <textarea
                    value={detailMemo}
                    onChange={(e) => setDetailMemo(e.target.value)}
                    placeholder="매매 이유나 메모를 남겨보세요"
                    rows={3}
                    className="w-full p-3 text-sm bg-[var(--color-g100)] dark:bg-[var(--color-border)] rounded-xl outline-none resize-none text-[var(--color-text)] placeholder:text-[var(--color-g400)] border border-[var(--color-g200)] dark:border-[var(--color-border)] focus:border-[var(--color-primary)] transition-colors"
                  />
                ) : detailTrade.memo ? (
                  <p className="text-sm text-[var(--color-text)] leading-relaxed">
                    {detailTrade.memo}
                  </p>
                ) : (
                  <span className="text-xs text-[var(--color-g400)]">없음</span>
                )}
              </div>

              {/* 수정/삭제/저장 버튼 */}
              {!detailEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailEditing(true)}
                    className="flex-1 py-3 text-sm font-semibold rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-text)] hover:bg-[var(--color-g200)] dark:hover:bg-[var(--color-card)] transition-colors cursor-pointer"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => setDetailDeleteConfirm(true)}
                    className="flex-1 py-3 text-sm font-semibold rounded-xl bg-[var(--color-negative-soft)] dark:bg-[rgba(240,68,82,0.15)] text-[var(--color-negative)] hover:bg-[var(--color-negative-soft)] dark:hover:bg-[rgba(240,68,82,0.25)] transition-colors cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDetailEditing(false); setDetailTags(detailTrade.reasonTags); setDetailEmotion(detailTrade.emotion ?? ""); setDetailMemo(detailTrade.memo ?? ""); }}
                    className="flex-1 py-3 text-sm font-semibold rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-text)] hover:bg-[var(--color-g200)] dark:hover:bg-[var(--color-card)] transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    onClick={saveDetail}
                    disabled={detailSaving}
                    className="flex-1 py-3 text-sm font-semibold rounded-xl text-white cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  >
                    {detailSaving ? "저장 중..." : "저장"}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </BottomSheet>

      {/* 매매 삭제 확인 모달 */}
      <ConfirmDialog
        open={detailDeleteConfirm}
        title="매매 기록을 삭제할까요?"
        message="이 매매 기록은 삭제되며 복구할 수 없습니다."
        confirmLabel="삭제"
        destructive
        confirmLoading={detailDeleting}
        onConfirm={deleteDetail}
        onCancel={() => setDetailDeleteConfirm(false)}
      />

      {/* ══════════════════════════════════════════════════ */}
      {/* 매매 등록 바텀시트 (공용) */}
      {/* ══════════════════════════════════════════════════ */}
      <BottomSheet open={modalOpen} onClose={() => setModalOpen(false)} title="매매 등록">
        <div className="space-y-5">
          {/* 계좌 선택 */}
          <Select
            label="계좌"
            value={String(formAccountId ?? "")}
            onChange={(val) => setFormAccountId(Number(val))}
            options={accounts.map((acc) => ({
              value: String(acc.id),
              label: `${acc.brokerageCompany.name}${acc.memo ? ` · ${acc.memo}` : ""}`,
            }))}
            placeholder="계좌를 선택하세요"
          />

          {/* 매매 날짜 */}
          <Input
            label="매매 날짜"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />

          {/* 매수/매도 토글 */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--color-g200)] dark:border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => {
                setFormType("BUY");
                setFormReasonTags([]);
                setFormName(""); setFormTicker(""); setFormPrice(""); setFormQuantity("");
                setStockQuery(""); setStockResults([]); setShowStockDropdown(false); setShowPrevTrades(false);
              }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                formType === "BUY" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-g400)] dark:text-[var(--color-muted)]"
              }`}
            >
              매수
            </button>
            <button
              type="button"
              onClick={() => {
                setFormType("SELL");
                setFormReasonTags([]);
                setFormName(""); setFormTicker(""); setFormPrice(""); setFormQuantity("");
                setStockQuery(""); setStockResults([]); setShowStockDropdown(false); setShowPrevTrades(false);
              }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                formType === "SELL" ? "bg-[var(--color-negative)] text-white" : "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-g400)] dark:text-[var(--color-muted)]"
              }`}
            >
              매도
            </button>
          </div>

          {/* ── 필수 입력 ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--color-primary)] tracking-wider uppercase">필수</span>
              {selectedAccount && selectedAccount.holdings.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPrevTrades(!showPrevTrades)}
                  className="text-[11px] font-medium text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
                >
                  {formType === "SELL" ? "보유 종목 불러오기" : "이전 종목 불러오기"}
                </button>
              )}
            </div>

            {/* 종목 목록 */}
            {showPrevTrades && selectedAccount && (
              <div className="rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] p-2 max-h-32 overflow-y-auto space-y-1">
                {selectedAccount.holdings.map((h) => (
                  <button
                    key={h.ticker}
                    type="button"
                    onClick={() => loadPrevTrade({ ticker: h.ticker, name: h.name })}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors text-[var(--color-text)] dark:text-[var(--color-text)] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">{h.name}</span>
                      <span className="text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2 text-xs">{h.ticker}</span>
                    </div>
                    {formType === "SELL" && (
                      <span className="text-xs text-[var(--color-g500)] dark:text-[var(--color-muted)] shrink-0">{h.quantity.toLocaleString()}주</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 종목 검색 */}
            <div ref={stockSearchRef} className="relative">
              <label className="block text-xs font-medium mb-1 text-[var(--color-g500)] dark:text-[var(--color-muted)]">종목 *</label>
              {formName && formTicker ? (
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-g200)] dark:border-[var(--color-border)]">
                  <div>
                    <span className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">{formName}</span>
                    <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">{formTicker}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFormName(""); setFormTicker(""); setFormPrice(""); setFormQuantity(""); }}
                    className="text-lg leading-none text-[var(--color-g400)] dark:text-[var(--color-muted)] hover:text-[var(--color-negative)] transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={stockInputRef}
                    type="text"
                    value={stockQuery}
                    onChange={(e) => handleStockQueryChange(e.target.value)}
                    onFocus={() => { if (stockQuery) setShowStockDropdown(true); }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" && showStockDropdown && stockResults.length > 0) { e.preventDefault(); setStockActiveIndex(0); }
                      else if (e.key === "Escape") { setShowStockDropdown(false); setStockActiveIndex(-1); }
                    }}
                    placeholder="종목명 또는 티커 검색"
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[#4A5A4A]"
                  />
                  {showStockDropdown && (
                    <div className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg overflow-hidden">
                      {stockResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {stockResults.map((s, i) => (
                            <button
                              key={s.ticker}
                              ref={(el) => { stockItemRefs.current[i] = el; }}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectStock(s); }}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowDown") { e.preventDefault(); setStockActiveIndex(Math.min(i + 1, stockResults.length - 1)); }
                                else if (e.key === "ArrowUp") { e.preventDefault(); if (i === 0) setStockActiveIndex(-1); else setStockActiveIndex(i - 1); }
                                else if (e.key === "Enter") { e.preventDefault(); selectStock(s); }
                                else if (e.key === "Escape") { setShowStockDropdown(false); setStockActiveIndex(-1); }
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] focus:bg-[var(--color-g100)] dark:focus:bg-[var(--color-border)] outline-none transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text)]">{s.name}</span>
                                <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">{s.ticker}</span>
                              </div>
                              <span className="text-[10px] text-[var(--color-g400)] dark:text-[#4A5A4A]">{s.market}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-[var(--color-g400)] dark:text-[var(--color-muted)]">검색 결과가 없습니다</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 가격 / 수량 */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                ref={formPriceRef}
                label="가격 *"
                inputMode="decimal"
                value={fmtNum(formPrice)}
                onChange={(e) => setFormPrice(stripNum(e.target.value, true))}
                placeholder={formPriceLoading ? "조회 중..." : "72,000"}
                disabled={formPriceLoading}
              />
              <Input
                label="수량 *"
                inputMode="numeric"
                value={fmtNum(formQuantity)}
                onChange={(e) => setFormQuantity(stripNum(e.target.value))}
                placeholder="10"
              />
            </div>
          </div>

          {/* ── 구분선 ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
            <span className="text-[11px] font-bold text-[var(--color-g400)] dark:text-[var(--color-muted)] tracking-wider uppercase">선택</span>
            <div className="flex-1 h-px bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
          </div>

          {/* 이유 태그 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-[var(--color-g500)] dark:text-[var(--color-muted)]">이유 태그</label>
            <div className="flex flex-wrap gap-1.5">
              {reasonTagOptions.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => toggleReasonTag(tag.label)}
                  className={`group relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    formReasonTags.includes(tag.label)
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-text)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035]"
                  }`}
                  title={tag.desc}
                >
                  {tag.label}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-[#1A221A] dark:bg-[var(--color-g400)] text-white text-[10px] px-2 py-1 rounded-md shadow-lg">{tag.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 심리 상태 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-[var(--color-g500)] dark:text-[var(--color-muted)]">심리 상태</label>
            <div className="flex gap-2">
              {EMOTIONS.map((em) => (
                <button
                  key={em.label}
                  type="button"
                  onClick={() => setFormEmotion(formEmotion === em.label ? "" : em.label)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-colors ${
                    formEmotion === em.label
                      ? "bg-[#F5F0FF] dark:bg-[rgba(139,92,246,0.15)] text-[#8B5CF6] ring-1 ring-[#8B5CF6]"
                      : "bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-text)]"
                  }`}
                >
                  <span>{em.icon}</span>
                  <span className="font-medium">{em.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--color-g500)] dark:text-[var(--color-muted)]">메모</label>
            <textarea
              value={formMemo}
              onChange={(e) => setFormMemo(e.target.value)}
              placeholder="매매 이유나 메모를 남겨보세요"
              rows={2}
              className="w-full p-3 text-sm bg-[#F8FAF8] dark:bg-[var(--color-card)] rounded-xl outline-none resize-none text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[#4A5A4A] border border-[var(--color-g200)] dark:border-[var(--color-border)]"
            />
          </div>

          {/* 에러/경고 */}
          {submitError && (
            <div className="rounded-xl px-4 py-2.5 text-sm bg-[#FEE8EA] dark:bg-[#3D1519] text-[var(--color-negative)]">{submitError}</div>
          )}
          {cashWarning && (
            <div className="rounded-xl px-4 py-2.5 text-sm bg-[#FFF8E8] dark:bg-[#2D2810] text-[#B8860B]">예수금이 부족하지만 매매가 등록되었습니다.</div>
          )}

          {/* 등록 버튼 */}
          <Button size="lg" onClick={checkAndSubmit} disabled={submitting}>
            {submitting ? "등록 중..." : "매매 등록"}
          </Button>
        </div>
      </BottomSheet>

      {/* 예수금 부족 확인 모달 */}
      <ConfirmDialog
        open={cashConfirmOpen}
        title="예수금 부족"
        message={cashConfirmMsg}
        confirmLabel="등록"
        onConfirm={() => { setCashConfirmOpen(false); doSubmit(); }}
        onCancel={() => setCashConfirmOpen(false)}
      />
    </div>
  );
}
