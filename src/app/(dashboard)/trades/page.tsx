"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  LoadingSpinner,
  EmptyState,
  BottomSheet,
} from "@/components/ui";
import { TradeFilterCard } from "./_components/TradeFilterCard";
import { TradesTable } from "./_components/TradesTable";
import { TradeTopBar } from "./_components/TradeTopBar";
import { TradeFilterPanel } from "./_components/TradeFilterPanel";
import { TradesList } from "./_components/TradesList";
import { SummaryChips } from "./_components/SummaryChips";
import {
  type TradeLog,
  type AccountOption,
  type Filters,
  INITIAL_FILTERS,
  getCountryFromTicker,
} from "./_components/types";

// ─── 이유 태그 목록 ──────────────────────────────────────

const BUY_REASON_TAGS = [
  { label: "실적호조", desc: "실적 개선 기대" },
  { label: "기술적분석", desc: "차트·지표 기반" },
  { label: "저평가", desc: "내재가치 대비 할인" },
  { label: "테마·트렌드", desc: "산업 트렌드 수혜" },
  { label: "분할매수", desc: "나눠서 매수" },
  { label: "신규진입", desc: "처음 매수" },
  { label: "추가매수", desc: "보유 중 추가 매수" },
  { label: "배당목적", desc: "배당 수익 목적" },
  { label: "포트리밸런싱", desc: "비중 조절" },
  { label: "지인추천", desc: "추천 받아 매수" },
  { label: "뉴스·공시", desc: "뉴스/공시 반응" },
];

const SELL_REASON_TAGS = [
  { label: "목표가달성", desc: "목표 수익 도달" },
  { label: "손절", desc: "추가 손실 방지" },
  { label: "고평가판단", desc: "과대 평가 판단" },
  { label: "실적악화", desc: "실적 부진" },
  { label: "리스크헤지", desc: "리스크 축소" },
  { label: "포트리밸런싱", desc: "비중 조절" },
  { label: "현금필요", desc: "현금 확보" },
  { label: "테마종료", desc: "테마 소멸" },
  { label: "추세이탈", desc: "기술적 이탈" },
  { label: "장기미보유", desc: "장기 보유 불필요" },
];

const EMOTIONS = [
  { label: "확신", emoji: "😎" },
  { label: "불안", emoji: "😰" },
  { label: "FOMO", emoji: "🤯" },
  { label: "손절", emoji: "😣" },
  { label: "기계적", emoji: "🤖" },
];

// ─── 유틸 ────────────────────────────────────────────────

function fmtNum(val: string) {
  if (!val) return "";
  const [int, dec] = val.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

function stripNum(val: string, allowDot = false) {
  return allowDot ? val.replace(/[^0-9.]/g, "") : val.replace(/[^0-9]/g, "");
}

function formatPriceDisplay(price: number, country?: string) {
  if (country === "US" || country === "Foreign") {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₩${price.toLocaleString()}`;
}

// ─── 메인 페이지 ─────────────────────────────────────────

export default function TradesPage() {
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

  // 모바일 필터 패널 토글
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // 매매 등록 폼
  const [formAccountId, setFormAccountId] = useState<number | null>(null);
  const [accountDropOpen, setAccountDropOpen] = useState(false);
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
  const [formSectorManual, setFormSectorManual] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cashWarning, setCashWarning] = useState(false);

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
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stockSearchRef = useRef<HTMLDivElement>(null);

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
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setFormSectorManual("");
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

  async function handleSubmit() {
    if (!formAccountId || !formTicker || !formName || !formPrice || !formQuantity) {
      setSubmitError("필수 항목을 모두 입력해주세요.");
      return;
    }

    const price = parseFloat(formPrice);
    const quantity = parseInt(formQuantity, 10);
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

  // ─── 로딩 ──────────────────────────────────────────────

  if (loading && trades.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <>
      {/* 토스트 */}
      <div
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl bg-[#F04452] min-w-[260px] max-w-[calc(100vw-40px)] transition-all duration-300 ${
          toast.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
        }`}
      >
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-tight">{toast.title}</p>
          <p className="text-xs text-white/80 mt-0.5 leading-tight">{toast.message}</p>
        </div>
        <button onClick={() => setToast((p) => ({ ...p, visible: false }))} className="text-white/60 hover:text-white transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* PC 버전 (md 이상) */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="hidden md:block w-full max-w-5xl mx-auto px-5 py-6">
        {/* 타이틀 — 계좌 관리와 동일 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4F0] dark:bg-[#2D3D30] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A221A] dark:text-[#E8EEE8]"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
              매매일지
            </h1>
          </div>
          <Button size="sm" onClick={openModal}>
            + 매매 등록
          </Button>
        </div>

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
          <EmptyState message="조건에 맞는 매매 기록이 없어요." />
        ) : (
          <TradesTable
            trades={trades}
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
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
        />

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
            <TradesList trades={trades} />
          )}
        </div>

        {/* FAB 버튼 */}
        <button
          onClick={openModal}
          className="fixed bottom-24 right-5 w-12 h-12 rounded-2xl bg-[#05C072] text-white text-2xl flex items-center justify-center shadow-lg shadow-[#05C072]/30 z-40 active:scale-95 transition-transform"
        >
          +
        </button>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 매매 등록 바텀시트 (공용) */}
      {/* ══════════════════════════════════════════════════ */}
      <BottomSheet open={modalOpen} onClose={() => setModalOpen(false)} title="매매 등록">
        <div className="space-y-5">
          {/* 계좌 선택 */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">계좌</label>
            <button
              type="button"
              onClick={() => setAccountDropOpen(!accountDropOpen)}
              className="w-full flex items-center justify-between pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] cursor-pointer"
            >
              <span>{(() => { const a = accounts.find((a) => a.id === formAccountId); return a ? `${a.brokerageCompany.name}${a.memo ? ` · ${a.memo}` : ""}` : "계좌를 선택하세요"; })()}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9AA99A]" style={{ transform: accountDropOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {accountDropOpen && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#E4EAE4] dark:border-[#2A3828] bg-white dark:bg-[#1D2720] shadow-lg">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => { setFormAccountId(acc.id); setAccountDropOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between"
                    style={{
                      backgroundColor: formAccountId === acc.id ? "#E6F9F1" : "transparent",
                      color: formAccountId === acc.id ? "#05C072" : "#1A221A",
                      fontWeight: formAccountId === acc.id ? 600 : 400,
                      borderBottom: "1px solid #F0F4F0",
                    }}
                  >
                    <span>{acc.brokerageCompany.name}{acc.memo ? ` · ${acc.memo}` : ""}</span>
                    {formAccountId === acc.id && <span className="text-[#05C072]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 매매 날짜 */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">매매 날짜</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8]"
            />
          </div>

          {/* 매수/매도 토글 */}
          <div className="flex rounded-xl overflow-hidden border border-[#E8EEE8] dark:border-[#2D3D30]">
            <button
              type="button"
              onClick={() => {
                setFormType("BUY");
                setFormReasonTags([]);
                setFormName(""); setFormTicker(""); setFormPrice(""); setFormQuantity("");
                setStockQuery(""); setStockResults([]); setShowStockDropdown(false); setShowPrevTrades(false);
              }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                formType === "BUY" ? "bg-[#05C072] text-white" : "bg-white dark:bg-[#1D2720] text-[#9AA99A] dark:text-[#5A6A5A]"
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
                formType === "SELL" ? "bg-[#F04452] text-white" : "bg-white dark:bg-[#1D2720] text-[#9AA99A] dark:text-[#5A6A5A]"
              }`}
            >
              매도
            </button>
          </div>

          {/* ── 필수 입력 ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#05C072] tracking-wider uppercase">필수</span>
              {selectedAccount && selectedAccount.holdings.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPrevTrades(!showPrevTrades)}
                  className="text-[11px] font-medium text-[#6B7B6B] dark:text-[#7A8A7A] hover:text-[#05C072] transition-colors"
                >
                  {formType === "SELL" ? "보유 종목 불러오기" : "이전 종목 불러오기"}
                </button>
              )}
            </div>

            {/* 종목 목록 */}
            {showPrevTrades && selectedAccount && (
              <div className="rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] p-2 max-h-32 overflow-y-auto space-y-1">
                {selectedAccount.holdings.map((h) => (
                  <button
                    key={h.ticker}
                    type="button"
                    onClick={() => loadPrevTrade({ ticker: h.ticker, name: h.name })}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] transition-colors text-[#1A221A] dark:text-[#E8EEE8] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">{h.name}</span>
                      <span className="text-[#9AA99A] dark:text-[#5A6A5A] ml-2 text-xs">{h.ticker}</span>
                    </div>
                    {formType === "SELL" && (
                      <span className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A] shrink-0">{h.quantity.toLocaleString()}주</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 종목 검색 */}
            <div ref={stockSearchRef} className="relative">
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">종목 *</label>
              {formName && formTicker ? (
                <div className="flex items-center justify-between pb-2 border-b border-[#D4DDD4] dark:border-[#2D3D30]">
                  <div>
                    <span className="text-sm font-semibold text-[#1A221A] dark:text-[#E8EEE8]">{formName}</span>
                    <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] ml-2">{formTicker}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFormName(""); setFormTicker(""); setFormPrice(""); setFormQuantity(""); }}
                    className="text-lg leading-none text-[#9AA99A] dark:text-[#5A6A5A] hover:text-[#F04452] transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={stockQuery}
                    onChange={(e) => handleStockQueryChange(e.target.value)}
                    onFocus={() => { if (stockQuery) setShowStockDropdown(true); }}
                    placeholder="종목명 또는 티커 검색"
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A]"
                  />
                  {showStockDropdown && (
                    <div className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] shadow-lg overflow-hidden">
                      {stockResults.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {stockResults.map((s) => (
                            <button
                              key={s.ticker}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectStock(s); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] transition-colors flex items-center justify-between"
                            >
                              <div>
                                <span className="text-sm font-medium text-[#1A221A] dark:text-[#E8EEE8]">{s.name}</span>
                                <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] ml-2">{s.ticker}</span>
                              </div>
                              <span className="text-[10px] text-[#B4C4B4] dark:text-[#4A5A4A]">{s.market}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-3 text-sm text-[#9AA99A] dark:text-[#5A6A5A]">검색 결과가 없습니다</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 가격 / 수량 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">가격 *</label>
                <input
                  ref={formPriceRef}
                  type="text"
                  inputMode="decimal"
                  value={fmtNum(formPrice)}
                  onChange={(e) => setFormPrice(stripNum(e.target.value, true))}
                  placeholder={formPriceLoading ? "조회 중..." : "72,000"}
                  disabled={formPriceLoading}
                  className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">수량 *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fmtNum(formQuantity)}
                  onChange={(e) => setFormQuantity(stripNum(e.target.value))}
                  placeholder="10"
                  className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A]"
                />
              </div>
            </div>
          </div>

          {/* ── 구분선 ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E8EEE8] dark:bg-[#2D3D30]" />
            <span className="text-[11px] font-bold text-[#9AA99A] dark:text-[#5A6A5A] tracking-wider uppercase">선택</span>
            <div className="flex-1 h-px bg-[#E8EEE8] dark:bg-[#2D3D30]" />
          </div>

          {/* 이유 태그 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-[#6B7B6B] dark:text-[#7A8A7A]">이유 태그</label>
            <div className="flex flex-wrap gap-1.5">
              {reasonTagOptions.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => toggleReasonTag(tag.label)}
                  className={`group relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    formReasonTags.includes(tag.label)
                      ? "bg-[#05C072] text-white"
                      : "bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#E8EEE8] dark:hover:bg-[#354035]"
                  }`}
                  title={tag.desc}
                >
                  {tag.label}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-[#1A221A] text-white text-[10px] px-2 py-1 rounded-md">{tag.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 심리 상태 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-[#6B7B6B] dark:text-[#7A8A7A]">심리 상태</label>
            <div className="flex gap-2">
              {EMOTIONS.map((em) => (
                <button
                  key={em.label}
                  type="button"
                  onClick={() => setFormEmotion(formEmotion === em.label ? "" : em.label)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-colors ${
                    formEmotion === em.label
                      ? "bg-[#F5F0FF] dark:bg-[#2A1D3D] text-[#8B5CF6] ring-1 ring-[#8B5CF6]"
                      : "bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A]"
                  }`}
                >
                  <span className="text-base">{em.emoji}</span>
                  <span className="font-medium">{em.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">메모</label>
            <textarea
              value={formMemo}
              onChange={(e) => setFormMemo(e.target.value)}
              placeholder="매매 이유나 메모를 남겨보세요"
              rows={2}
              className="w-full p-3 text-sm bg-[#F8FAF8] dark:bg-[#253028] rounded-xl outline-none resize-none text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A] border border-[#E8EEE8] dark:border-[#2D3D30]"
            />
          </div>

          {/* 에러/경고 */}
          {submitError && (
            <div className="rounded-xl px-4 py-2.5 text-sm bg-[#FEE8EA] dark:bg-[#3D1519] text-[#F04452]">{submitError}</div>
          )}
          {cashWarning && (
            <div className="rounded-xl px-4 py-2.5 text-sm bg-[#FFF8E8] dark:bg-[#2D2810] text-[#B8860B]">예수금이 부족하지만 매매가 등록되었습니다.</div>
          )}

          {/* 등록 버튼 */}
          <Button size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "등록 중..." : "매매 등록"}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
