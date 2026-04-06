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
      {/* 날짜 */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => set("dateFrom", e.target.value)}
          className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] outline-none"
        />
        <span className="text-xs text-[var(--color-g400)]">~</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => set("dateTo", e.target.value)}
          className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] outline-none"
        />
      </div>

      {/* 빠른선택 + 계좌 */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setQuickDropOpen((v) => !v)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-g500)] dark:text-[var(--color-muted)]"
          >
            기간 빠른선택 ▾
          </button>
          {quickDropOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[120px] rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg z-50 overflow-hidden">
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
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] text-[var(--color-text)] dark:text-[var(--color-text)] transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          value={filters.accountId}
          onChange={(e) => set("accountId", e.target.value)}
          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] outline-none"
        >
          <option value="">전체 계좌</option>
          {accounts.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.brokerageCompany.name}{a.memo ? ` · ${a.memo}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* 종목 검색 */}
      <StockSearchInput
        value={filters.keyword}
        onChange={(v) => set("keyword", v)}
        onEnter={onSearch}
        placeholder="종목명 또는 티커 검색"
        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[#4A5A4A] outline-none"
      />

      {/* 버튼 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange({ dateFrom: "", dateTo: "", accountId: "", tradeType: "", market: "", keyword: "" })}
          className="flex-1 py-1.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)]"
        >
          초기화
        </button>
        <button
          onClick={onSearch}
          className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-primary)] hover:bg-[#03A862] text-white transition-colors"
        >
          조회
        </button>
      </div>
    </div>
  );
}
