"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  Button,
  Tag,
  PnlTag,
  LoadingSpinner,
  EmptyState,
  BottomSheet,
} from "@/components/ui";

// ─── 타입 ────────────────────────────────────────────────

interface TradeLog {
  id: number;
  date: string;
  ticker: string;
  name: string;
  type: "BUY" | "SELL";
  price: number;
  quantity: number;
  reasonTags: string[];
  emotion: string | null;
  memo: string | null;
  account: {
    brokerageCompany: { name: string };
  };
}

interface AccountOption {
  id: number;
  brokerageCompany: { code: string; name: string };
  holdings: { ticker: string; name: string; country: string; avgPrice: number; quantity: number }[];
  cashBalances: { currency: string; amount: number }[];
}

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}.${day}`;
}

function formatPrice(price: number, country?: string) {
  if (country === "US" || country === "Foreign") {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₩${price.toLocaleString()}`;
}

function fmtNum(val: string) {
  if (!val) return "";
  const [int, dec] = val.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

function stripNum(val: string, allowDot = false) {
  return allowDot ? val.replace(/[^0-9.]/g, "") : val.replace(/[^0-9]/g, "");
}

function getCountryFromTicker(ticker: string) {
  return ticker.length <= 6 && /^\d+$/.test(ticker) ? "KR" : "US";
}

// ─── 메인 페이지 ─────────────────────────────────────────

export default function TradesPage() {
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // 필터
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");

  // 매매 등록 폼
  const [formAccountId, setFormAccountId] = useState<number | null>(null);
  const [accountDropOpen, setAccountDropOpen] = useState(false);
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

  // 이전 거래 불러오기
  const [showPrevTrades, setShowPrevTrades] = useState(false);

  // 종목 검색 autocomplete
  const [stockQuery, setStockQuery] = useState("");
  const [stockResults, setStockResults] = useState<{ ticker: string; name: string; market: string; country?: string }[]>([]);
  const [showStockDropdown, setShowStockDropdown] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stockSearchRef = useRef<HTMLDivElement>(null);

  // ─── 데이터 로딩 ───────────────────────────────────────

  const fetchTrades = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterAccount !== "all") params.set("accountId", filterAccount);
      if (filterType !== "all") params.set("type", filterType);
      if (filterTag !== "all") params.set("reasonTag", filterTag);

      const res = await fetch(`/api/trades?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTrades(Array.isArray(data) ? data : []);
      }
    } catch {
      /* 조회 실패 */
    } finally {
      setLoading(false);
    }
  }, [filterAccount, filterType, filterTag]);

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

  // ─── 매매 등록 ─────────────────────────────────────────

  function resetForm() {
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
        // 국내 + 해외 동시 검색, 서버에서 합쳐서 반환
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(val.trim())}&country=ALL`);
        if (res.ok) {
          const data = await res.json();
          setStockResults(Array.isArray(data) ? data : []);
        }
      } catch {
        /* 검색 실패 */
      }
    }, 300);
  }

  function selectStock(stock: { ticker: string; name: string; market: string; country?: string }) {
    setFormName(stock.name);
    setFormTicker(stock.ticker);
    setFormCountry(stock.country ?? (/^\d{6}$/.test(stock.ticker) ? "KR" : "US"));
    setStockQuery("");
    setShowStockDropdown(false);
    setStockResults([]);
  }

  function openModal() {
    resetForm();
    if (accounts.length > 0 && !formAccountId) {
      setFormAccountId(accounts[0].id);
    }
    setModalOpen(true);
  }

  function toggleReasonTag(tag: string) {
    setFormReasonTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function loadPrevTrade(trade: TradeLog) {
    setFormTicker(trade.ticker);
    setFormName(trade.name);
    setShowPrevTrades(false);
  }

  async function handleSubmit() {
    if (!formAccountId || !formTicker || !formName || !formPrice || !formQuantity) {
      setSubmitError("필수 항목을 모두 입력해주세요.");
      return;
    }

    const price = parseFloat(formPrice);
    const quantity = parseInt(formQuantity, 10);
    const selectedAccount = accounts.find((a) => a.id === formAccountId);

    if (formType === "BUY" && selectedAccount) {
      const totalAmount = price * quantity;
      const isForeign = !(/^\d{6}$/.test(formTicker));
      const currency = isForeign ? "USD" : "KRW";
      const cashBalance = selectedAccount.cashBalances.find((c) => c.currency === currency)?.amount ?? 0;
      if (totalAmount > cashBalance) {
        alert(`예수금이 부족하여 저장할 수 없습니다.\n필요: ${currency === "KRW" ? "₩" : "$"}${totalAmount.toLocaleString()} / 보유: ${currency === "KRW" ? "₩" : "$"}${cashBalance.toLocaleString()}`);
        return;
      }
    }

    if (formType === "SELL" && selectedAccount) {
      const holding = selectedAccount.holdings.find((h) => h.ticker === formTicker);
      const holdingQty = holding?.quantity ?? 0;
      if (quantity > holdingQty) {
        alert(`보유 수량보다 커서 저장할 수 없습니다.\n매도 수량: ${quantity.toLocaleString()}주 / 보유 수량: ${holdingQty.toLocaleString()}주`);
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

      if (data.cashWarning) {
        setCashWarning(true);
      }

      setModalOpen(false);
      resetForm();
      fetchTrades();
    } catch {
      setSubmitError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 필터용 태그 목록 ──────────────────────────────────

  const allReasonTags = Array.from(
    new Set(trades.flatMap((t) => t.reasonTags))
  );

  const reasonTagOptions =
    formType === "BUY" ? BUY_REASON_TAGS : SELL_REASON_TAGS;

  // 선택된 계좌의 보유 종목 (이전 거래 불러오기용)
  const selectedAccount = accounts.find((a) => a.id === formAccountId);

  // ─── 로딩 ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4F0] dark:bg-[#2D3D30] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A221A] dark:text-[#E8EEE8]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
            매매일지
          </h1>
        </div>
        <div className="hidden md:block">
          <Button size="sm" onClick={openModal}>
            + 매매 등록
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* 계좌 필터 */}
        <select
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] text-[#1A221A] dark:text-[#E8EEE8] outline-none"
        >
          <option value="all">전체 계좌</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.brokerageCompany.name}
            </option>
          ))}
        </select>

        {/* 매수/매도 필터 */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] text-[#1A221A] dark:text-[#E8EEE8] outline-none"
        >
          <option value="all">전체</option>
          <option value="BUY">매수</option>
          <option value="SELL">매도</option>
        </select>

        {/* 이유 태그 필터 */}
        {allReasonTags.length > 0 && (
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] text-[#1A221A] dark:text-[#E8EEE8] outline-none"
          >
            <option value="all">전체 태그</option>
            {allReasonTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 매매 기록 카드 목록 */}
      {trades.length === 0 ? (
        <EmptyState message="아직 매매 기록이 없어요. 첫 매매를 등록해보세요." />
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => {
            const isBuy = trade.type === "BUY";
            const country = getCountryFromTicker(trade.ticker);
            const totalAmount = trade.price * trade.quantity;

            return (
              <Card key={trade.id}>
                <div className="flex items-start justify-between">
                  {/* 좌측: 종목 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {/* 매수/매도 태그 */}
                      <Tag
                        label={isBuy ? "매수" : "매도"}
                        color={isBuy ? "green" : "orange"}
                      />
                      <span className="text-[15px] font-bold text-[#1A221A] dark:text-[#E8EEE8] truncate">
                        {trade.name}
                      </span>
                    </div>

                    {/* 날짜 · 계좌 */}
                    <div className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mb-2">
                      {formatDate(trade.date)} · {trade.account.brokerageCompany.name}
                    </div>

                    {/* 가격 · 수량 · 금액 */}
                    <div className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A]">
                      {formatPrice(trade.price, country)} × {trade.quantity.toLocaleString()}주
                      <span className="ml-2 font-semibold text-[#1A221A] dark:text-[#E8EEE8]">
                        = {formatPrice(totalAmount, country)}
                      </span>
                    </div>

                    {/* 이유 태그 + 심리 */}
                    {(trade.reasonTags.length > 0 || trade.emotion) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {trade.reasonTags.map((tag) => (
                          <Tag key={tag} label={tag} color="gray" />
                        ))}
                        {trade.emotion && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-[#F5F0FF] dark:bg-[#2A1D3D] text-[#8B5CF6]">
                            {EMOTIONS.find((e) => e.label === trade.emotion)?.emoji}{" "}
                            {trade.emotion}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 메모 */}
                    {trade.memo && (
                      <p className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-2 line-clamp-2">
                        💬 {trade.memo}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 모바일 FAB */}
      <button
        onClick={openModal}
        className="fixed bottom-24 right-5 md:hidden w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg z-40 active:scale-95 transition-transform"
        style={{ backgroundColor: "#05C072" }}
      >
        +
      </button>

      {/* ─── 매매 등록 바텀시트 ─────────────────────────── */}
      <BottomSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="매매 등록"
      >
        <div className="space-y-5">
          {/* 계좌 선택 */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
              계좌
            </label>
            <button
              type="button"
              onClick={() => setAccountDropOpen(!accountDropOpen)}
              className="w-full flex items-center justify-between pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] cursor-pointer"
            >
              <span>{accounts.find((a) => a.id === formAccountId)?.brokerageCompany.name ?? "계좌를 선택하세요"}</span>
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
                    <span>{acc.brokerageCompany.name}</span>
                    {formAccountId === acc.id && <span className="text-[#05C072]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 매수/매도 토글 */}
          <div className="flex rounded-xl overflow-hidden border border-[#E8EEE8] dark:border-[#2D3D30]">
            <button
              type="button"
              onClick={() => {
                setFormType("BUY");
                setFormReasonTags([]);
              }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                formType === "BUY"
                  ? "bg-[#05C072] text-white"
                  : "bg-white dark:bg-[#1D2720] text-[#9AA99A] dark:text-[#5A6A5A]"
              }`}
            >
              매수
            </button>
            <button
              type="button"
              onClick={() => {
                setFormType("SELL");
                setFormReasonTags([]);
              }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                formType === "SELL"
                  ? "bg-[#F04452] text-white"
                  : "bg-white dark:bg-[#1D2720] text-[#9AA99A] dark:text-[#5A6A5A]"
              }`}
            >
              매도
            </button>
          </div>

          {/* ── 필수 입력 ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#05C072] tracking-wider uppercase">
                필수
              </span>
              {/* 이전 거래 불러오기 */}
              {selectedAccount && selectedAccount.holdings.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPrevTrades(!showPrevTrades)}
                  className="text-[11px] font-medium text-[#6B7B6B] dark:text-[#7A8A7A] hover:text-[#05C072] transition-colors"
                >
                  이전 종목 불러오기
                </button>
              )}
            </div>

            {/* 이전 종목 목록 */}
            {showPrevTrades && selectedAccount && (
              <div className="rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] p-2 max-h-32 overflow-y-auto space-y-1">
                {selectedAccount.holdings.map((h) => (
                  <button
                    key={h.ticker}
                    type="button"
                    onClick={() =>
                      loadPrevTrade({
                        ticker: h.ticker,
                        name: h.name,
                      } as TradeLog)
                    }
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] transition-colors text-[#1A221A] dark:text-[#E8EEE8]"
                  >
                    <span className="font-medium">{h.name}</span>
                    <span className="text-[#9AA99A] dark:text-[#5A6A5A] ml-2 text-xs">
                      {h.ticker}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 종목 검색 */}
            <div ref={stockSearchRef} className="relative">
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
                종목 *
              </label>
              {formName && formTicker ? (
                <div className="flex items-center justify-between pb-2 border-b border-[#D4DDD4] dark:border-[#2D3D30]">
                  <div>
                    <span className="text-sm font-semibold text-[#1A221A] dark:text-[#E8EEE8]">
                      {formName}
                    </span>
                    <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] ml-2">
                      {formTicker}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFormName(""); setFormTicker(""); }}
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

            {/* 가격 / 수량 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
                  가격 *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fmtNum(formPrice)}
                  onChange={(e) => setFormPrice(stripNum(e.target.value, true))}
                  placeholder="72,000"
                  className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
                  수량 *
                </label>
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
            <span className="text-[11px] font-bold text-[#9AA99A] dark:text-[#5A6A5A] tracking-wider uppercase">
              선택
            </span>
            <div className="flex-1 h-px bg-[#E8EEE8] dark:bg-[#2D3D30]" />
          </div>

          {/* 이유 태그 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-[#6B7B6B] dark:text-[#7A8A7A]">
              이유 태그
            </label>
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
                  {/* 호버 시 설명 툴팁 */}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-[#1A221A] text-white text-[10px] px-2 py-1 rounded-md">
                    {tag.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 심리 상태 */}
          <div>
            <label className="block text-xs font-medium mb-2 text-[#6B7B6B] dark:text-[#7A8A7A]">
              심리 상태
            </label>
            <div className="flex gap-2">
              {EMOTIONS.map((em) => (
                <button
                  key={em.label}
                  type="button"
                  onClick={() =>
                    setFormEmotion(formEmotion === em.label ? "" : em.label)
                  }
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
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
              메모
            </label>
            <textarea
              value={formMemo}
              onChange={(e) => setFormMemo(e.target.value)}
              placeholder="매매 이유나 메모를 남겨보세요"
              rows={2}
              className="w-full p-3 text-sm bg-[#F8FAF8] dark:bg-[#253028] rounded-xl outline-none resize-none text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A] border border-[#E8EEE8] dark:border-[#2D3D30]"
            />
          </div>

          {/* 에러 메시지 */}
          {submitError && (
            <div className="rounded-xl px-4 py-2.5 text-sm bg-[#FEE8EA] dark:bg-[#3D1519] text-[#F04452]">
              {submitError}
            </div>
          )}

          {/* 예수금 부족 경고 */}
          {cashWarning && (
            <div className="rounded-xl px-4 py-2.5 text-sm bg-[#FFF8E8] dark:bg-[#2D2810] text-[#B8860B]">
              ⚠️ 예수금이 부족하지만 매매가 등록되었습니다.
            </div>
          )}

          {/* 등록 버튼 */}
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "등록 중..." : "매매 등록"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
