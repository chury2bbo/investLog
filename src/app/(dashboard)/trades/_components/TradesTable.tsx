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
      <div className="overflow-x-auto rounded-2xl bg-[var(--color-surface)] dark:bg-[var(--color-card)]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--color-g200)] dark:border-[var(--color-border)] text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] uppercase tracking-wider">
              <th className="px-3 py-2.5 w-[86px] font-medium">
                <button onClick={() => handleSort("date")} className="flex items-center gap-1 hover:text-[var(--color-g500)] dark:hover:text-[var(--color-muted)] cursor-pointer">
                  일자 <span className="text-[10px]">{sortIcon("date")}</span>
                </button>
              </th>
              <th className="px-2 py-2.5 w-[64px] font-medium">구분</th>
              <th className="px-2 py-2.5 w-[64px] font-medium">시장</th>
              <th className="px-2 py-2.5 font-medium">종목</th>
              <th className="px-3 py-2.5 w-[88px] text-right font-medium">
                <button onClick={() => handleSort("price")} className="flex items-center gap-1 ml-auto hover:text-[var(--color-g500)] dark:hover:text-[var(--color-muted)] cursor-pointer">
                  단가 <span className="text-[10px]">{sortIcon("price")}</span>
                </button>
              </th>
              <th className="px-2 py-2.5 w-[50px] text-right font-medium">수량</th>
              <th className="px-3 py-2.5 w-[104px] text-right font-medium">
                <button onClick={() => handleSort("total")} className="flex items-center gap-1 ml-auto hover:text-[var(--color-g500)] dark:hover:text-[var(--color-muted)] cursor-pointer">
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
                  className="border-b border-[var(--color-g100)]/60 dark:border-[var(--color-border)]/60 hover:bg-[#F8FAF8] dark:hover:bg-[var(--color-card)] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2.5 text-xs text-[var(--color-text)] dark:text-[var(--color-text)]">
                    {formatTradeDate(trade.date)}
                  </td>
                  <td className="px-2 py-2.5">
                    <TypeBadge type={trade.type} />
                  </td>
                  <td className="px-2 py-2.5">
                    <MarketBadge market={market} />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="text-[13px] font-medium text-[var(--color-text)] dark:text-[var(--color-text)] leading-tight">
                      {trade.name}
                    </div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] leading-tight">
                      {trade.ticker} · {accountName}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right text-[var(--color-text)] dark:text-[var(--color-text)] tabular-nums">
                    {formatPrice(trade)}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-right text-[var(--color-text)] dark:text-[var(--color-text)] tabular-nums">
                    {trade.quantity.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right font-medium text-[var(--color-text)] dark:text-[var(--color-text)] tabular-nums">
                    {formatTotal(trade)}
                  </td>
                  <td className="px-2 py-2.5">
                    {trade.reasonTags.length > 0 ? (
                      <ReasonTagChip tags={trade.reasonTags} />
                    ) : (
                      <span className="text-[11px] text-[var(--color-g200)] dark:text-[#3D4D40]">—</span>
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
          <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)]">
            총 {total}건 중 {from}–{to} 표시
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="px-2.5 py-1 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              이전
            </button>
            <span className="text-xs text-[var(--color-g500)] dark:text-[var(--color-muted)]">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page + 1 >= totalPages}
              className="px-2.5 py-1 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
