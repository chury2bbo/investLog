"use client";

import { useState } from "react";
import { TypeBadge } from "./TypeBadge";
import { MarketBadge } from "./MarketBadge";
import { ReasonTagChip } from "./ReasonTagChip";
import { type TradeLog, getCountryFromTicker, formatTradeDate, formatPrice, formatTotal } from "./types";

interface TradesTableProps {
  trades: TradeLog[];
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

type SortCol = "date" | "price" | "total";

export function TradesTable({ trades, page, total, pageSize, onPageChange }: TradesTableProps) {
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d * -1) as 1 | -1);
    else {
      setSortCol(col);
      setSortDir(-1);
    }
  };

  const sortIcon = (col: SortCol) => {
    if (sortCol !== col) return "↕";
    return sortDir === -1 ? "↓" : "↑";
  };

  const sorted = [...trades].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case "date":
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case "price":
        cmp = a.price - b.price;
        break;
      case "total":
        cmp = a.price * a.quantity - b.price * b.quantity;
        break;
    }
    return cmp * sortDir;
  });

  const totalPages = Math.ceil(total / pageSize);
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-[#1D2720]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#E8EEE8] dark:border-[#2D3D30] text-[11px] text-[#9AA99A] dark:text-[#5A6A5A] uppercase tracking-wider">
              <th className="px-3 py-2.5 w-[86px] font-medium">
                <button onClick={() => handleSort("date")} className="flex items-center gap-1 hover:text-[#6B7B6B] dark:hover:text-[#7A8A7A] cursor-pointer">
                  일자 <span className="text-[10px]">{sortIcon("date")}</span>
                </button>
              </th>
              <th className="px-2 py-2.5 w-[64px] font-medium">구분</th>
              <th className="px-2 py-2.5 w-[64px] font-medium">시장</th>
              <th className="px-2 py-2.5 font-medium">종목</th>
              <th className="px-3 py-2.5 w-[88px] text-right font-medium">
                <button onClick={() => handleSort("price")} className="flex items-center gap-1 ml-auto hover:text-[#6B7B6B] dark:hover:text-[#7A8A7A] cursor-pointer">
                  단가 <span className="text-[10px]">{sortIcon("price")}</span>
                </button>
              </th>
              <th className="px-2 py-2.5 w-[50px] text-right font-medium">수량</th>
              <th className="px-3 py-2.5 w-[104px] text-right font-medium">
                <button onClick={() => handleSort("total")} className="flex items-center gap-1 ml-auto hover:text-[#6B7B6B] dark:hover:text-[#7A8A7A] cursor-pointer">
                  체결금액 <span className="text-[10px]">{sortIcon("total")}</span>
                </button>
              </th>
              <th className="px-2 py-2.5 w-[110px] font-medium">이유태그</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((trade) => {
              const market = getCountryFromTicker(trade.ticker);
              const accountName = `${trade.account.brokerageCompany.name}${trade.account.memo ? ` · ${trade.account.memo}` : ""}`;
              return (
                <tr
                  key={trade.id}
                  className="border-b border-[#F0F4F0]/60 dark:border-[#2D3D30]/60 hover:bg-[#F8FAF8] dark:hover:bg-[#253028] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2.5 text-xs text-[#1A221A] dark:text-[#E8EEE8]">
                    {formatTradeDate(trade.date)}
                  </td>
                  <td className="px-2 py-2.5">
                    <TypeBadge type={trade.type} />
                  </td>
                  <td className="px-2 py-2.5">
                    <MarketBadge market={market} />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="text-[13px] font-medium text-[#1A221A] dark:text-[#E8EEE8] leading-tight">
                      {trade.name}
                    </div>
                    <div className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A] leading-tight">
                      {trade.ticker} · {accountName}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right text-[#1A221A] dark:text-[#E8EEE8] tabular-nums">
                    {formatPrice(trade)}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-right text-[#1A221A] dark:text-[#E8EEE8] tabular-nums">
                    {trade.quantity.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right font-medium text-[#1A221A] dark:text-[#E8EEE8] tabular-nums">
                    {formatTotal(trade)}
                  </td>
                  <td className="px-2 py-2.5">
                    {trade.reasonTags.length > 0 ? (
                      <ReasonTagChip tags={trade.reasonTags} />
                    ) : (
                      <span className="text-[11px] text-[#D4DDD4] dark:text-[#3D4D40]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A]">
            총 {total}건 중 {from}–{to} 표시
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="px-2.5 py-1 text-xs rounded-lg border border-[#E8EEE8] dark:border-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              이전
            </button>
            <span className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A]">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page + 1 >= totalPages}
              className="px-2.5 py-1 text-xs rounded-lg border border-[#E8EEE8] dark:border-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
