"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui";
import { type Filters } from "./types";

interface TradeTopBarProps {
  totalCount: number;
  filters: Filters;
  onChange: (f: Filters) => void;
  filterOpen: boolean;
  onToggleFilter: () => void;
  onOpenModal: () => void;
  viewMode: "list" | "calendar";
  onToggleView: () => void;
}

export function TradeTopBar({ totalCount, filters, onChange, filterOpen, onToggleFilter, onOpenModal, viewMode, onToggleView }: TradeTopBarProps) {
  const router = useRouter();
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  const hasActiveFilter = !!(filters.dateFrom || filters.dateTo || filters.accountId || filters.keyword || filters.tagStatus);
  const isDividend = filters.tradeType === "DIVIDEND";

  return (
    <div className="sticky top-0 z-30 bg-[var(--color-bg)] dark:bg-[var(--color-bg)] border-b border-[var(--color-g200)] dark:border-[var(--color-border)]">
      {/* 타이틀 행 */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-transparent hover:bg-[var(--color-g200)] dark:hover:bg-[var(--color-border)] transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)] dark:text-[var(--color-text)]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] dark:text-[var(--color-text)]">
            매매일지
          </h1>
        </div>
        <ThemeToggle />
      </div>

      {/* 필터 행 */}
      <div className="flex items-center justify-between px-5 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {/* 구분 (전체/매수/매도/배당) */}
          <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5 shrink-0">
            {(["", "BUY", "SELL", "DIVIDEND"] as const).map((t) => {
              const active = filters.tradeType === t;
              const label = t === "" ? null : t === "BUY" ? "매수" : t === "SELL" ? "매도" : "배당";
              return (
                <button
                  key={t}
                  onClick={() => set("tradeType", t)}
                  className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                    active
                      ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] shadow-sm"
                      : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)] dark:hover:text-[var(--color-text)]"
                  }`}
                >
                  {label ?? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <rect x="0" y="0" width="5" height="5" rx="1"/>
                      <rect x="7" y="0" width="5" height="5" rx="1"/>
                      <rect x="0" y="7" width="5" height="5" rx="1"/>
                      <rect x="7" y="7" width="5" height="5" rx="1"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* 국내/해외 — 배당 모드 제외 */}
          {!isDividend && (
            <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5 shrink-0">
              {(["", "KR", "US"] as const).map((m) => {
                const active = filters.market === m;
                const label = m === "" ? null : m === "KR" ? "국내" : "해외";
                return (
                  <button
                    key={m}
                    onClick={() => set("market", m)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                      active
                        ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] shadow-sm"
                        : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)] dark:hover:text-[var(--color-text)]"
                    }`}
                  >
                    {label ?? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <rect x="0" y="0" width="5" height="5" rx="1"/>
                        <rect x="7" y="0" width="5" height="5" rx="1"/>
                        <rect x="0" y="7" width="5" height="5" rx="1"/>
                        <rect x="7" y="7" width="5" height="5" rx="1"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* 뷰 전환 */}
          <button
            onClick={onToggleView}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-g100)] dark:bg-transparent hover:bg-[var(--color-g200)] dark:hover:bg-[var(--color-border)] transition-colors cursor-pointer"
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
          {/* 필터 버튼 */}
          <button
            onClick={onToggleFilter}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${filterOpen ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035]"}`}
            aria-label="필터"
          >
            {hasActiveFilter && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
            )}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
