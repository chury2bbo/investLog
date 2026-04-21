"use client";

import { useState } from "react";
import { StockSearchInput } from "./StockSearchInput";
import { type Filters, type AccountOption, QUICK_DATE_OPTIONS, getDateFrom } from "./types";

interface TradeFilterPanelProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onSearch: () => void;
  accounts: AccountOption[];
}

export function TradeFilterPanel({ filters, onChange, onSearch, accounts }: TradeFilterPanelProps) {
  const [quickDropOpen, setQuickDropOpen] = useState(false);

  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="px-4 py-3 space-y-2.5 border-b border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[#F8FAF8] dark:bg-[#111A14]">
      {/* 1행: from~to + 기간선택 */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => set("dateFrom", e.target.value)}
          className="flex-1 min-w-0 px-2 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        />
        <span className="shrink-0 text-xs text-[var(--color-g400)]">~</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => set("dateTo", e.target.value)}
          className="flex-1 min-w-0 px-2 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        />
        <div className="relative shrink-0">
          <button
            onClick={() => setQuickDropOpen((v) => !v)}
            className="px-2.5 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-g500)] dark:text-[var(--color-muted)] whitespace-nowrap cursor-pointer"
          >
            기간 ▾
          </button>
          {quickDropOpen && (
            <div className="absolute top-full right-0 mt-1 min-w-[120px] rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg z-50 overflow-hidden">
              {QUICK_DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    onChange({
                      ...filters,
                      dateFrom: getDateFrom(opt.days),
                      dateTo: new Date().toISOString().slice(0, 10),
                    });
                    setQuickDropOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] text-[var(--color-text)] dark:text-[var(--color-text)] transition-colors cursor-pointer"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2행: 계좌선택 | 미입력 필터 */}
      <div className="flex items-center gap-2">
        <select
          value={filters.accountId}
          onChange={(e) => set("accountId", e.target.value)}
          className="flex-1 px-2.5 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] outline-none cursor-pointer"
        >
          <option value="">전체 계좌</option>
          {accounts.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.brokerageCompany.name}{a.memo ? ` · ${a.memo}` : ""}
            </option>
          ))}
        </select>

        <span className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] shrink-0">미입력</span>
        <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5 shrink-0">
          {(["", "noTag", "noEmotion"] as const).map((s) => {
            const active = filters.tagStatus === s;
            const label = s === "" ? null : s === "noTag" ? "태그" : "심리";
            return (
              <button
                key={s}
                onClick={() => set("tagStatus", s)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center ${
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
      </div>

      {/* 3행: 종목 검색 */}
      <StockSearchInput
        value={filters.keyword}
        onChange={(v) => set("keyword", v)}
        onEnter={onSearch}
        placeholder="종목명 또는 티커 검색"
        className="w-full px-2.5 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[#4A5A4A] outline-none"
      />

      {/* 버튼 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange({ dateFrom: "", dateTo: "", accountId: "", tradeType: "", market: "", keyword: "", tagStatus: "" })}
          className="flex-1 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] cursor-pointer"
        >
          초기화
        </button>
        <button
          onClick={onSearch}
          className="flex-1 py-2.5 text-xs font-medium rounded-lg bg-[var(--color-primary)] hover:bg-[#03A862] text-white transition-colors cursor-pointer"
        >
          조회
        </button>
      </div>
    </div>
  );
}
