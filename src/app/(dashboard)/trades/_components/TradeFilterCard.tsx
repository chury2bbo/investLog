"use client";

import { useState } from "react";
import { Card, DatePicker } from "@/components/ui";
import { StockSearchInput } from "./StockSearchInput";
import { type Filters, type AccountOption, QUICK_DATE_OPTIONS, getDateFrom } from "./types";

interface TradeFilterCardProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onSearch: () => void;
  accounts: AccountOption[];
}

export function TradeFilterCard({ filters, onChange, onSearch, accounts }: TradeFilterCardProps) {
  const [quickDropOpen, setQuickDropOpen] = useState(false);

  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <Card className="!p-4 mb-4">
      <div className="space-y-3">
        {/* 1행: 날짜 + 빠른선택 + 계좌 + 종목검색 + 버튼 */}
        <div className="flex flex-wrap items-end gap-2.5">
          {/* 기간 */}
          <div className="flex items-center gap-1.5">
            <DatePicker
              value={filters.dateFrom}
              onChange={(v) => set("dateFrom", v)}
              inputClassName="px-2 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] outline-none cursor-pointer w-[120px]"
              wrapperClassName=""
            />
            <span className="text-xs text-[var(--color-g400)]">~</span>
            <DatePicker
              value={filters.dateTo}
              onChange={(v) => set("dateTo", v)}
              inputClassName="px-2 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] outline-none cursor-pointer w-[120px]"
              wrapperClassName=""
            />
          </div>

          {/* 빠른선택 */}
          <div className="relative">
            <button
              onClick={() => setQuickDropOpen((v) => !v)}
              className="px-2.5 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors cursor-pointer"
            >
              빠른선택 ▾
            </button>
            {quickDropOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[120px] rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg z-50 overflow-hidden">
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

          {/* 계좌 */}
          <select
            value={filters.accountId}
            onChange={(e) => set("accountId", e.target.value)}
            className="px-2.5 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] outline-none cursor-pointer"
          >
            <option value="">전체 계좌</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.brokerageCompany.name}{a.memo ? ` · ${a.memo}` : ""}
              </option>
            ))}
          </select>

          {/* 버튼 */}
          <button
            onClick={() => onChange({ dateFrom: "", dateTo: "", accountId: "", tradeType: "", market: "", keyword: "", tagStatus: "" })}
            className="px-2.5 py-2 text-xs font-semibold rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors cursor-pointer"
          >
            초기화
          </button>
          <button
            onClick={onSearch}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[#03A862] text-white transition-colors cursor-pointer"
          >
            조회
          </button>
        </div>

        {/* 2행: 종목 검색 + 매수/매도 + 국내/해외 세그먼트 */}
        <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-g100)] dark:border-[var(--color-border)]">
          {/* 종목 검색 */}
          <div className="flex-1 min-w-[200px]">
            <StockSearchInput
              value={filters.keyword}
              onChange={(v) => set("keyword", v)}
              onEnter={onSearch}
              placeholder="종목명 또는 티커 검색"
              className="w-full px-2.5 py-2.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[#4A5A4A] outline-none"
            />
          </div>

          <div className="w-px h-5 bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mr-1">매수/매도</span>
            <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5">
              {(["", "BUY", "SELL"] as const).map((t) => {
                const active = filters.tradeType === t;
                const label = t === "" ? "전체" : t === "BUY" ? "매수" : "매도";
                return (
                  <button
                    key={t}
                    onClick={() => set("tradeType", t)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] shadow-sm"
                        : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)] dark:hover:text-[var(--color-text)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px h-5 bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mr-1">국내/해외</span>
            <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5">
              {(["", "KR", "US"] as const).map((m) => {
                const active = filters.market === m;
                const label = m === "" ? "전체" : m === "KR" ? "국내" : "해외";
                return (
                  <button
                    key={m}
                    onClick={() => set("market", m)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] shadow-sm"
                        : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)] dark:hover:text-[var(--color-text)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px h-5 bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mr-1">미입력</span>
            <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5">
              {(["", "noTag", "noEmotion"] as const).map((s) => {
                const active = filters.tagStatus === s;
                const label = s === "" ? "전체" : s === "noTag" ? "태그" : "심리";
                return (
                  <button
                    key={s}
                    onClick={() => set("tagStatus", s)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] dark:text-[var(--color-text)] shadow-sm"
                        : "text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:text-[var(--color-text)] dark:hover:text-[var(--color-text)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
