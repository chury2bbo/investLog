"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
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
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => set("dateFrom", e.target.value)}
              className="px-2 py-1.5 text-xs rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-transparent text-[#1A221A] dark:text-[#E8EEE8] outline-none"
            />
            <span className="text-xs text-[#9AA99A]">~</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => set("dateTo", e.target.value)}
              className="px-2 py-1.5 text-xs rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-transparent text-[#1A221A] dark:text-[#E8EEE8] outline-none"
            />
          </div>

          {/* 빠른선택 */}
          <div className="relative">
            <button
              onClick={() => setQuickDropOpen((v) => !v)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] transition-colors"
            >
              빠른선택 ▾
            </button>
            {quickDropOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[120px] rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] shadow-lg z-50 overflow-hidden">
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
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] transition-colors"
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
            className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] text-[#1A221A] dark:text-[#E8EEE8] outline-none"
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
            onClick={() => onChange({ dateFrom: "", dateTo: "", accountId: "", tradeType: "", market: "", keyword: "" })}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors"
          >
            초기화
          </button>
          <button
            onClick={onSearch}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#05C072] hover:bg-[#03A862] text-white transition-colors cursor-pointer"
          >
            조회
          </button>
        </div>

        {/* 2행: 종목 검색 + 매수/매도 + 국내/해외 세그먼트 */}
        <div className="flex items-center gap-4 pt-2 border-t border-[#F0F4F0] dark:border-[#2D3D30]">
          {/* 종목 검색 */}
          <div className="flex-1 min-w-[200px]">
            <StockSearchInput
              value={filters.keyword}
              onChange={(v) => set("keyword", v)}
              onEnter={onSearch}
              placeholder="종목명 또는 티커 검색"
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-transparent text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A] outline-none"
            />
          </div>

          <div className="w-px h-5 bg-[#E8EEE8] dark:bg-[#2D3D30]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A] mr-1">매수/매도</span>
            <div className="flex gap-0.5 rounded-xl bg-[#F0F4F0] dark:bg-[#2D3D30] p-0.5">
              {(["", "BUY", "SELL"] as const).map((t) => {
                const active = filters.tradeType === t;
                const label = t === "" ? "전체" : t === "BUY" ? "매수" : "매도";
                return (
                  <button
                    key={t}
                    onClick={() => set("tradeType", t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      active
                        ? "bg-white dark:bg-[#1D2720] text-[#1A221A] dark:text-[#E8EEE8] shadow-sm"
                        : "text-[#6B7B6B] dark:text-[#7A8A7A] hover:text-[#1A221A] dark:hover:text-[#E8EEE8]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px h-5 bg-[#E8EEE8] dark:bg-[#2D3D30]" />

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A] mr-1">국내/해외</span>
            <div className="flex gap-0.5 rounded-xl bg-[#F0F4F0] dark:bg-[#2D3D30] p-0.5">
              {(["", "KR", "US"] as const).map((m) => {
                const active = filters.market === m;
                const label = m === "" ? "전체" : m === "KR" ? "국내" : "해외";
                return (
                  <button
                    key={m}
                    onClick={() => set("market", m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      active
                        ? "bg-white dark:bg-[#1D2720] text-[#1A221A] dark:text-[#E8EEE8] shadow-sm"
                        : "text-[#6B7B6B] dark:text-[#7A8A7A] hover:text-[#1A221A] dark:hover:text-[#E8EEE8]"
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
