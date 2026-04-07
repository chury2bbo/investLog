"use client";

import { useState, useEffect, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import { LoadingSpinner, EmptyState } from "@/components/ui";
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
  tradeType?: "" | "BUY" | "SELL";
  market?: "" | "KR" | "US";
  onSelect?: (trade: Trade) => void;
}

export default function TradeCalendar({ tradeType = "", market = "", onSelect }: TradeCalendarProps) {
  const [month, setMonth] = useState(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(new Date()));

  // 월별 데이터 fetch
  const fetchMonthTrades = useCallback(async (d: Date) => {
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

  useEffect(() => {
    fetchMonthTrades(month);
  }, [month, fetchMonthTrades]);

  // 날짜별 매매 그룹
  const tradesByDate: Record<string, Trade[]> = {};
  trades.forEach((t) => {
    const key = toDateKey(t.date);
    if (!tradesByDate[key]) tradesByDate[key] = [];
    tradesByDate[key].push(t);
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

  // 선택된 날짜의 매매
  const selectedTrades = selectedDate ? tradesByDate[selectedDate] ?? [] : [];

  // 날짜 클릭
  function handleDayClick(day: Date) {
    const key = toDateKey(day);
    setSelectedDate(selectedDate === key ? null : key);
  }

  const monthLabel = `${month.getMonth() + 1}월`;

  return (
    <div>
      {/* 월간 요약 */}
      <div className="mb-4 px-1">
        <div className="text-[13px] text-[var(--color-g500)] dark:text-[var(--color-muted)]">
          <span className="font-bold text-[var(--color-text)]">{monthLabel}</span>
          {" — "}
          <span className="text-[var(--color-positive)]">매수 {buyCount}회</span>
          {" / "}
          <span className="text-[#F07D05]">매도 {sellCount}회</span>
          {" / "}
          순매수{" "}
          <span className={netBuy >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}>
            {netBuy >= 0 ? "+" : "-"}₩{formatKRW(Math.abs(netBuy))}
          </span>
        </div>
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
                const hasBuy = dayTrades?.some((t) => t.type === "BUY");
                const hasSell = dayTrades?.some((t) => t.type === "SELL");
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
                    {(hasBuy || hasSell) && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {hasBuy && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-positive)]" />}
                        {hasSell && <span className="w-1.5 h-1.5 rounded-full bg-[#F07D05]" />}
                      </span>
                    )}
                  </button>
                );
              },
            }}
          />

          {/* 선택된 날짜 매매 리스트 */}
          <div className="mt-4 border-t border-[var(--color-g100)] dark:border-[var(--color-border)] pt-4">
            {selectedDate ? (
              <>
                <div className="text-[13px] font-bold text-[var(--color-text)] mb-3 px-1">
                  {selectedDate.slice(5).replace("-", "월 ")}일
                  <span className="ml-1.5 text-[11px] font-medium text-[#9AA99A] dark:text-[#5A6A5A]">
                    {selectedTrades.length}건
                  </span>
                </div>
                {selectedTrades.length === 0 ? (
                  <EmptyState message="해당 날짜에 매매 기록이 없습니다." />
                ) : (
                  <div className="space-y-0">
                    {selectedTrades.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onSelect?.(t as unknown as Trade)}
                        className="px-1 py-2.5 border-b border-[var(--color-g100)] dark:border-[var(--color-border)] last:border-0 cursor-pointer active:bg-[var(--color-g100)] dark:active:bg-[var(--color-border)] transition-colors rounded-lg"
                      >
                        {/* 1행 */}
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
                        {/* 2행 */}
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
