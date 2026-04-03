"use client";

import { TypeBadge } from "./TypeBadge";
import { MarketBadge } from "./MarketBadge";
import { ReasonTagChip } from "./ReasonTagChip";
import { type TradeLog, getCountryFromTicker, formatTradeDate, formatPrice, formatTotal } from "./types";

interface TradesListProps {
  trades: TradeLog[];
}

function TagPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A]">
      {children}
    </span>
  );
}

function PnlText({ value }: { value: number }) {
  return (
    <span
      className={`text-[11px] font-medium tabular-nums ${
        value >= 0
          ? "text-[#3B6D11] dark:text-[#7BC043]"
          : "text-[#A32D2D] dark:text-[#F08080]"
      }`}
    >
      {value >= 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export function TradesList({ trades }: TradesListProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#1D2720]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
      {trades.map((trade, idx) => {
        const market = getCountryFromTicker(trade.ticker);
        const accountName = `${trade.account.brokerageCompany.name}${trade.account.memo ? ` · ${trade.account.memo}` : ""}`;
        const isFirst = idx === 0;
        const isLast = idx === trades.length - 1;

        return (
          <div
            key={trade.id}
            className={`px-3.5 py-3 active:bg-[#F8FAF8] dark:active:bg-[#253028] transition-colors cursor-pointer ${
              !isLast ? "border-b border-[#F0F4F0] dark:border-[#2D3D30]" : ""
            }`}
          >
            {/* 1행 */}
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <TypeBadge type={trade.type} />
                <MarketBadge market={market} />
                <span className="text-[14px] font-medium text-[#1A221A] dark:text-[#E8EEE8] truncate">
                  {trade.name}
                </span>
              </div>
              <span className="text-[14px] font-medium text-[#1A221A] dark:text-[#E8EEE8] shrink-0 ml-2 tabular-nums">
                {formatTotal(trade)}
              </span>
            </div>
            {/* 2행 */}
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-[#9AA99A] dark:text-[#5A6A5A] truncate">
                {formatTradeDate(trade.date, true)} · {formatPrice(trade)} × {trade.quantity}주 · {accountName}
              </span>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <ReasonTagChip tags={trade.reasonTags} />
                {trade.type === "SELL" && trade.realizedPnlRate != null && (
                  <PnlText value={trade.realizedPnlRate} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
