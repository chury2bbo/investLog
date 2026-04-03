"use client";

import { type Filters } from "./types";

interface TradeTopBarProps {
  totalCount: number;
  filters: Filters;
  onChange: (f: Filters) => void;
  filterOpen: boolean;
  onToggleFilter: () => void;
  onOpenModal: () => void;
}

export function TradeTopBar({ totalCount, filters, onChange, filterOpen, onToggleFilter, onOpenModal }: TradeTopBarProps) {
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  const hasActiveFilter = !!(filters.dateFrom || filters.dateTo || filters.accountId || filters.keyword);

  return (
    <div className="sticky top-0 z-30 bg-[#F5F7F5] dark:bg-[#0D1210] border-b border-[#E8EEE8] dark:border-[#2D3D30]">
      {/* 타이틀 행 — 계좌 관리와 동일 */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4F0] dark:bg-[#2D3D30] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A221A] dark:text-[#E8EEE8]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
            매매일지
          </h1>
        </div>
      </div>

      {/* 필터 행 — 타이틀 아래 */}
      <div className="flex items-center justify-between px-5 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {/* 매수/매도 */}
          <div className="flex rounded-xl overflow-hidden border border-[#E8EEE8] dark:border-[#2D3D30] shrink-0">
            {(["", "BUY", "SELL"] as const).map((t) => {
              const active = filters.tradeType === t;
              const label = t === "" ? "전체" : t === "BUY" ? "매수" : "매도";
              return (
                <button
                  key={t}
                  onClick={() => set("tradeType", t)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-[#1A221A] dark:bg-[#E8EEE8] text-white dark:text-[#1A221A]"
                      : "bg-white dark:bg-[#1D2720] text-[#6B7B6B] dark:text-[#7A8A7A]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 국내/해외 */}
          <div className="flex rounded-xl overflow-hidden border border-[#E8EEE8] dark:border-[#2D3D30] shrink-0">
            {(["", "KR", "US"] as const).map((m) => {
              const active = filters.market === m;
              const label = m === "" ? "전체" : m === "KR" ? "국내" : "해외";
              return (
                <button
                  key={m}
                  onClick={() => set("market", m)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-[#1A221A] dark:bg-[#E8EEE8] text-white dark:text-[#1A221A]"
                      : "bg-white dark:bg-[#1D2720] text-[#6B7B6B] dark:text-[#7A8A7A]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 필터 버튼 */}
        <button
          onClick={onToggleFilter}
          className="relative shrink-0 ml-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors"
        >
          필터
          {hasActiveFilter && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#05C072]" />
          )}
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform ${filterOpen ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
