"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import { LoadingSpinner, EmptyState, Button, Toast } from "@/components/ui";
import { ReasonTagChip } from "@/app/(dashboard)/trades/_components/ReasonTagChip";

// ── 타입 ────────────────────────────────────────────────────
interface Trade {
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
    memo: string | null;
    brokerageCompany: { name: string };
  };
}

interface DividendEntry {
  id: number;
  date: string;
  ticker: string | null;
  memo: string | null;
  currency: string;
  amount: number;
  accountId: number;
  account: {
    memo: string | null;
    brokerageCompany: { name: string };
  };
}

// ── 유틸 ────────────────────────────────────────────────────
function toDateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatKRW(n: number): string {
  if (Math.abs(n) >= 1_0000_0000) return `${Math.floor((n / 1_0000_0000) * 10) / 10}억`;
  if (Math.abs(n) >= 1_0000) return `${Math.floor((n / 10000) * 10) / 10}만`;
  return Math.floor(n).toLocaleString();
}

function getCountry(ticker: string): "KR" | "US" {
  return /^\d{6}$/.test(ticker) ? "KR" : "US";
}

function formatPrice(price: number, ticker: string): string {
  return getCountry(ticker) === "US"
    ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₩${price.toLocaleString()}`;
}

function formatTotal(price: number, quantity: number, ticker: string): string {
  const total = price * quantity;
  return getCountry(ticker) === "US"
    ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₩${total.toLocaleString()}`;
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
interface TradeCalendarProps {
  tradeType?: "" | "BUY" | "SELL" | "DIVIDEND";
  market?: "" | "KR" | "US";
  onSelect?: (trade: Trade) => void;
}

export default function TradeCalendar({ tradeType = "", market = "", onSelect }: TradeCalendarProps) {
  const [month, setMonth] = useState(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dividends, setDividends] = useState<DividendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(new Date()));

  // 월 전체 순매수 계산용 (BUY/SELL 필터 시 매도/매수 데이터가 없어서 별도 fetch)
  const [monthNetBuy, setMonthNetBuy] = useState(0);

  // 메모 states
  const [memoedDates, setMemoedDates] = useState<Set<string>>(new Set());
  const [memoContent, setMemoContent] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoLoaded, setMemoLoaded] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; title: string; message: string }>({ visible: false, title: "", message: "" });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 월별 매매 fetch
  const fetchMonthTrades = useCallback(async (d: Date) => {
    if (tradeType === "DIVIDEND") {
      setTrades([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: formatMonthParam(d) });
      if (tradeType) params.set("type", tradeType);
      if (market) params.set("market", market);
      const res = await fetch(`/api/trades?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTrades(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      /* fetch 실패 */
    } finally {
      setLoading(false);
    }
  }, [tradeType, market]);

  // BUY/SELL 필터 시 순매수 계산을 위해 전체 매매 summary fetch
  const fetchMonthNetBuy = useCallback(async (d: Date) => {
    if (tradeType !== "BUY" && tradeType !== "SELL") return;
    try {
      const params = new URLSearchParams({ month: formatMonthParam(d) });
      if (market) params.set("market", market);
      const res = await fetch(`/api/trades?${params}`);
      if (res.ok) {
        const data = await res.json();
        const all: Trade[] = Array.isArray(data) ? data : data.data ?? [];
        const bTotal = all.filter((t) => t.type === "BUY").reduce((sum, t) => {
          return sum + t.price * t.quantity * (getCountry(t.ticker) === "US" ? 1400 : 1);
        }, 0);
        const sTotal = all.filter((t) => t.type === "SELL").reduce((sum, t) => {
          return sum + t.price * t.quantity * (getCountry(t.ticker) === "US" ? 1400 : 1);
        }, 0);
        setMonthNetBuy(bTotal - sTotal);
      }
    } catch { /* */ }
  }, [tradeType, market]);

  // 월별 배당 fetch
  const fetchMonthDividends = useCallback(async (d: Date) => {
    try {
      const year = d.getFullYear();
      const month = d.getMonth();
      const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const dateTo = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const res = await fetch(`/api/cash?type=DIVIDEND&dateFrom=${dateFrom}&dateTo=${dateTo}`);
      if (res.ok) {
        const data = await res.json();
        setDividends(Array.isArray(data) ? data : []);
      }
    } catch { /* */ }
  }, []);

  // 월별 메모 있는 날짜 목록 fetch
  const fetchMemoedDates = useCallback(async (d: Date) => {
    try {
      const res = await fetch(`/api/trades/memo?month=${formatMonthParam(d)}`);
      if (res.ok) {
        const data = await res.json();
        setMemoedDates(new Set<string>(data.dates ?? []));
      }
    } catch { /* */ }
  }, []);

  // 선택된 날짜 메모 fetch
  const fetchMemo = useCallback(async (date: string) => {
    setMemoLoaded(false);
    setMemoContent("");
    try {
      const res = await fetch(`/api/trades/memo?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setMemoContent(data.content ?? "");
      }
    } catch { /* */ } finally {
      setMemoLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchMonthTrades(month);
    fetchMemoedDates(month);
    fetchMonthDividends(month);
    fetchMonthNetBuy(month);
  }, [month, fetchMonthTrades, fetchMemoedDates, fetchMonthDividends, fetchMonthNetBuy]);

  useEffect(() => {
    if (selectedDate) {
      fetchMemo(selectedDate);
    } else {
      setMemoContent("");
      setMemoLoaded(false);
    }
  }, [selectedDate, fetchMemo]);

  // 메모 저장
  async function saveMemo() {
    if (!selectedDate) return;
    setMemoSaving(true);
    try {
      const res = await fetch("/api/trades/memo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, content: memoContent }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[memo] PUT failed", res.status, err);
        return;
      }
      setMemoedDates((prev) => {
        const next = new Set(prev);
        if (memoContent.trim()) next.add(selectedDate);
        else next.delete(selectedDate);
        return next;
      });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ visible: true, title: "메모 저장 완료", message: "오늘의 메모가 저장되었습니다." });
      toastTimer.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3000);
    } catch (e) {
      console.error("[memo] PUT error", e);
    } finally {
      setMemoSaving(false);
    }
  }

  // 날짜별 매매 그룹
  const tradesByDate: Record<string, Trade[]> = {};
  trades.forEach((t) => {
    const key = toDateKey(t.date);
    if (!tradesByDate[key]) tradesByDate[key] = [];
    tradesByDate[key].push(t);
  });

  // 날짜별 배당 그룹
  const dividendsByDate: Record<string, DividendEntry[]> = {};
  dividends.forEach((d) => {
    const key = toDateKey(d.date);
    if (!dividendsByDate[key]) dividendsByDate[key] = [];
    dividendsByDate[key].push(d);
  });

  // 월간 요약
  const buyCount = trades.filter((t) => t.type === "BUY").length;
  const sellCount = trades.filter((t) => t.type === "SELL").length;
  const buyTotal = trades
    .filter((t) => t.type === "BUY")
    .reduce((sum, t) => {
      const rate = getCountry(t.ticker) === "US" ? 1400 : 1;
      return sum + t.price * t.quantity * rate;
    }, 0);
  const sellTotal = trades
    .filter((t) => t.type === "SELL")
    .reduce((sum, t) => {
      const rate = getCountry(t.ticker) === "US" ? 1400 : 1;
      return sum + t.price * t.quantity * rate;
    }, 0);
  const netBuy = buyTotal - sellTotal;
  const filteredDividends = dividends.filter((d) => {
    if (!market) return true;
    const isDomestic = d.ticker ? /^\d{6}$/.test(d.ticker) : d.currency === "KRW";
    return market === "KR" ? isDomestic : !isDomestic;
  });
  const divCount = filteredDividends.length;
  const divKrw = filteredDividends.filter((d) => d.currency === "KRW").reduce((s, d) => s + d.amount, 0);
  const divUsd = filteredDividends.filter((d) => d.currency === "USD").reduce((s, d) => s + d.amount, 0);

  // 선택된 날짜의 매매 / 배당
  const selectedTrades = selectedDate ? tradesByDate[selectedDate] ?? [] : [];
  const selectedDividends = (selectedDate ? dividendsByDate[selectedDate] ?? [] : []).filter((d) => {
    if (!market) return true;
    const isDomestic = d.ticker ? /^\d{6}$/.test(d.ticker) : d.currency === "KRW";
    return market === "KR" ? isDomestic : !isDomestic;
  });

  // 날짜 클릭
  function handleDayClick(day: Date) {
    const key = toDateKey(day);
    setSelectedDate(selectedDate === key ? null : key);
  }

  const monthLabel = `${month.getMonth() + 1}월`;

  return (
    <div>
      <Toast
        title={toast.title}
        message={toast.message}
        visible={toast.visible}
        variant="success"
        onClose={() => setToast((p) => ({ ...p, visible: false }))}
      />
      {/* 월간 요약 */}
      <div className="mb-4 px-1">
        <div className="text-[13px] text-[var(--color-g500)] dark:text-[var(--color-muted)]">
          <span className="font-bold text-[var(--color-text)]">{monthLabel}</span>
          {" — "}
          {tradeType === "BUY" ? (
            <>
              <span className="text-[var(--color-positive)]">매수 {buyCount}회, ₩{Math.floor(buyTotal).toLocaleString()}</span>
              {" / "}
              순매수{" "}
              <span className={monthNetBuy >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}>
                {monthNetBuy >= 0 ? "+" : "-"}₩{Math.floor(Math.abs(monthNetBuy)).toLocaleString()}
              </span>
            </>
          ) : tradeType === "SELL" ? (
            <span className="text-[#F07D05]">매도 {sellCount}회, ₩{Math.floor(sellTotal).toLocaleString()}</span>
          ) : tradeType === "DIVIDEND" ? (
            <>
              <span className="text-[#8B5CF6]">배당 {divCount}회{divCount === 0 && " 없음"}</span>
              {divKrw > 0 && <><span className="text-[var(--color-g300)] mx-1">·</span><span className="text-[#8B5CF6]">원화 ₩{Math.floor(divKrw).toLocaleString()}</span></>}
              {divUsd > 0 && <><span className="text-[var(--color-g300)] mx-1">·</span><span className="text-[#8B5CF6]">달러 ${divUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></>}
            </>
          ) : (
            <>
              <span className="text-[var(--color-positive)]">매수 {buyCount}회, ₩{Math.floor(buyTotal).toLocaleString()}</span>
              {" / "}
              <span className="text-[#F07D05]">매도 {sellCount}회, ₩{Math.floor(sellTotal).toLocaleString()}</span>
              {" / "}
              순매수{" "}
              <span className={netBuy >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}>
                {netBuy >= 0 ? "+" : "-"}₩{Math.floor(Math.abs(netBuy)).toLocaleString()}
              </span>
              {divCount > 0 && (
                <>
                  {" / "}
                  <span className="text-[#8B5CF6]">배당 {divCount}회</span>
                  {divKrw > 0 && <><span className="text-[var(--color-g300)] mx-1">·</span><span className="text-[#8B5CF6]">원화 ₩{Math.floor(divKrw).toLocaleString()}</span></>}
                  {divUsd > 0 && <><span className="text-[var(--color-g300)] mx-1">·</span><span className="text-[#8B5CF6]">달러 ${divUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></>}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-3 mb-4 px-1 flex-wrap">
        {[
          { color: "bg-[var(--color-positive)]", label: "매수", show: tradeType === "" || tradeType === "BUY" },
          { color: "bg-[#F07D05]", label: "매도", show: tradeType === "" || tradeType === "SELL" },
          { color: "bg-[#8B5CF6]", label: "배당", show: tradeType === "" || tradeType === "DIVIDEND" },
          { color: "bg-[#60A5FA]", label: "메모", show: tradeType === "" && market === "" },
        ].filter(({ show }) => show).map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">{label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size={24} />
        </div>
      ) : (
        <>
          <DayPicker
            mode="single"
            locale={ko}
            month={month}
            onMonthChange={setMonth}
            onDayClick={handleDayClick}
            selected={selectedDate ? new Date(selectedDate) : undefined}
            classNames={{
              root: "w-full",
              month_grid: "w-full",
              nav: "absolute top-0 left-0 right-0 flex items-center justify-between",
              button_previous: "p-1.5 rounded-lg hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] cursor-pointer z-10",
              button_next: "p-1.5 rounded-lg hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] cursor-pointer z-10",
              month_caption: "text-[15px] font-bold text-[var(--color-text)] text-center py-1",
              months: "w-full relative",
              weekdays: "grid grid-cols-7",
              weekday: "text-[11px] font-medium text-[#9AA99A] dark:text-[#5A6A5A] text-center py-2",
              week: "grid grid-cols-7",
              day: "relative text-center py-1",
              day_button: "w-10 h-10 rounded-lg text-[13px] text-[var(--color-text)] hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors cursor-pointer mx-auto flex items-center justify-center",
              today: "font-bold",
              selected: "",
              outside: "text-[#D4DDD4] dark:text-[#3D4D40]",
            }}
            components={{
              DayButton: ({ day, ...props }) => {
                const key = toDateKey(day.date);
                const dayTrades = tradesByDate[key];
                const hasBuy = (tradeType === "" || tradeType === "BUY") && dayTrades?.some((t) => t.type === "BUY");
                const hasSell = (tradeType === "" || tradeType === "SELL") && dayTrades?.some((t) => t.type === "SELL");
                const hasMemo = tradeType === "" && market === "" && memoedDates.has(key);
                const hasDividend = (tradeType === "" || tradeType === "DIVIDEND") && (dividendsByDate[key] ?? []).filter((d) => {
                  if (!market) return true;
                  const isDomestic = d.ticker ? /^\d{6}$/.test(d.ticker) : d.currency === "KRW";
                  return market === "KR" ? isDomestic : !isDomestic;
                }).length > 0;
                const isSelected = selectedDate === key;
                return (
                  <button
                    {...props}
                    className={`w-10 h-10 rounded-lg text-[13px] transition-colors cursor-pointer mx-auto flex items-center justify-center ${
                      isSelected
                        ? "bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-text)]"
                        : "text-[var(--color-text)] hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)]"
                    }`}
                  >
                    {day.date.getDate()}
                    {(hasBuy || hasSell || hasMemo || hasDividend) && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {hasBuy && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-positive)]" />}
                        {hasSell && <span className="w-1.5 h-1.5 rounded-full bg-[#F07D05]" />}
                        {hasDividend && <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />}
                        {hasMemo && <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />}
                      </span>
                    )}
                  </button>
                );
              },
            }}
          />

          {/* 선택된 날짜 섹션 */}
          <div className="mt-4 border-t border-[var(--color-g100)] dark:border-[var(--color-border)] pt-4">
            {selectedDate ? (
              <>
                <div className="text-[13px] font-bold text-[var(--color-text)] mb-3 px-1">
                  {selectedDate.slice(5).replace("-", "월 ")}일
                  <span className="ml-1.5 text-[11px] font-medium text-[#9AA99A] dark:text-[#5A6A5A]">
                    {tradeType === "DIVIDEND"
                      ? `배당 ${selectedDividends.length}건`
                      : `${selectedTrades.length}건${selectedDividends.length > 0 ? ` · 배당 ${selectedDividends.length}건` : ""}`}
                  </span>
                </div>

                {/* 배당 목록 */}
                {selectedDividends.length > 0 && (
                  <div className="mb-3">
                    <div className="space-y-0">
                      {selectedDividends.map((d) => {
                        const isDomestic = d.ticker
                          ? /^\d{6}$/.test(d.ticker)
                          : d.currency === "KRW";
                        return (
                        <div
                          key={d.id}
                          className="px-1 py-2.5 border-b border-[var(--color-g100)] dark:border-[var(--color-border)] last:border-0"
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap bg-[#F3F0FF] dark:bg-[rgba(139,92,246,0.15)] text-[#8B5CF6]">
                                배당
                              </span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${
                                isDomestic
                                  ? "bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-positive)]"
                                  : "bg-[#E8F0FE] dark:bg-[rgba(66,133,244,0.15)] text-[#4285F4]"
                              }`}>
                                {isDomestic ? "국내" : "해외"}
                              </span>
                              <span className="text-[14px] font-medium text-[var(--color-text)] truncate">
                                {(d.memo && d.memo !== "배당금") ? d.memo : (d.ticker ?? "배당금")}
                              </span>
                            </div>
                            <span className="text-[14px] font-medium text-[#8B5CF6] shrink-0 ml-2 tabular-nums">
                              {d.currency === "USD"
                                ? `$${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `₩${Math.floor(d.amount).toLocaleString()}`}
                            </span>
                          </div>
                          <div className="text-[12px] text-[#9AA99A] dark:text-[#5A6A5A] px-0.5">
                            {d.account.brokerageCompany.name}{d.account.memo ? ` · ${d.account.memo}` : ""}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 매매 목록 */}
                {selectedTrades.length === 0 && selectedDividends.length === 0 ? (
                  <EmptyState message="해당 날짜에 매매 기록이 없습니다." />
                ) : selectedTrades.length === 0 ? null : (
                  <div className="space-y-0">
                    {selectedTrades.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onSelect?.(t as unknown as Trade)}
                        className="px-1 py-2.5 border-b border-[var(--color-g100)] dark:border-[var(--color-border)] last:border-0 cursor-pointer active:bg-[var(--color-g100)] dark:active:bg-[var(--color-border)] transition-colors rounded-lg"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${
                                t.type === "BUY"
                                  ? "bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-positive)]"
                                  : "bg-[#FFFBF5] dark:bg-[rgba(255,123,0,0.15)] text-[var(--color-warning)]"
                              }`}
                            >
                              {t.type === "BUY" ? "매수" : "매도"}
                            </span>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${
                                getCountry(t.ticker) === "KR"
                                  ? "bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-positive)]"
                                  : "bg-[#E8F0FE] dark:bg-[rgba(66,133,244,0.15)] text-[#4285F4]"
                              }`}
                            >
                              {getCountry(t.ticker) === "KR" ? "국내" : "해외"}
                            </span>
                            <span className="text-[14px] font-medium text-[var(--color-text)] truncate">
                              {t.name}
                            </span>
                          </div>
                          <span className="text-[14px] font-medium text-[var(--color-text)] shrink-0 ml-2 tabular-nums">
                            {formatTotal(t.price, t.quantity, t.ticker)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-[#9AA99A] dark:text-[#5A6A5A] truncate">
                            {formatPrice(t.price, t.ticker)} × {t.quantity}주 · {t.account.brokerageCompany.name}
                          </span>
                          <div className="shrink-0 ml-2">
                            <ReasonTagChip tags={t.reasonTags} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 일별 메모 섹션 */}
                <div className="mt-4 pt-4 border-t border-[var(--color-g100)] dark:border-[var(--color-border)]">
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-[#9AA99A] dark:text-[#5A6A5A] shrink-0">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-[12px] font-medium text-[#9AA99A] dark:text-[#5A6A5A]">오늘의 메모</span>
                  </div>
                  {!memoLoaded ? (
                    <div className="px-1 space-y-2">
                      <div className="h-3.5 bg-[var(--color-g100)] dark:bg-[var(--color-border)] rounded animate-pulse w-3/4" />
                      <div className="h-3.5 bg-[var(--color-g100)] dark:bg-[var(--color-border)] rounded animate-pulse w-1/2" />
                    </div>
                  ) : (
                    <div className="px-1">
                      <textarea
                        value={memoContent}
                        onChange={(e) => setMemoContent(e.target.value)}
                        placeholder="이 날의 시장 흐름, 투자 일지, 감정 등을 자유롭게 기록하세요"
                        className="w-full text-[13px] text-[var(--color-text)] bg-transparent placeholder:text-[#C4CCC4] dark:placeholder:text-[#3D4D40] resize-none outline-none border-b border-[var(--color-g200)] dark:border-[var(--color-border)] pb-2 pt-1 min-h-[64px] leading-relaxed"
                        rows={3}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="black"
                          size="sm"
                          onClick={saveMemo}
                          disabled={memoSaving}
                        >
                          {memoSaving ? "저장 중..." : "저장"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[12px] text-center text-[#9AA99A] dark:text-[#5A6A5A] py-4">
                날짜를 선택하면 매매 기록이 표시됩니다
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
