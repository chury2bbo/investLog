"use client";

import { TypeBadge } from "./TypeBadge";
import { MarketBadge } from "./MarketBadge";
import { ReasonTagChip } from "./ReasonTagChip";
import { type TradeLog, getCountryFromTicker, formatTradeDate, formatPrice, formatTotal } from "./types";

interface TradesListProps {
  trades: TradeLog[];
  onSelect?: (trade: TradeLog) => void;
}

function PnlText({ value }: { value: number }) {
  return (
    <span
      className={`text-[11px] font-medium tabular-nums ${
        value >= 0
          ? "text-[var(--color-positive)]"
          : "text-[var(--color-negative)]"
      }`}
    >
      {value >= 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export function TradesList({ trades, onSelect }: TradesListProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[var(--color-surface)] dark:bg-[var(--color-card)]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
      {trades.map((trade, idx) => {
        const market = getCountryFromTicker(trade.ticker);
        const accountName = `${trade.account.brokerageCompany.name}${trade.account.memo ? ` · ${trade.account.memo}` : ""}`;
        const isLast = idx === trades.length - 1;

        return (
          <div
            key={trade.id}
            onClick={() => onSelect?.(trade)}
            className={`px-3.5 py-3 active:bg-[var(--color-g100)] dark:active:bg-[var(--color-border)] transition-colors cursor-pointer ${
              !isLast ? "border-b border-[var(--color-g100)] dark:border-[var(--color-border)]" : ""
            }`}
          >
            {/* 1행 */}
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <TypeBadge type={trade.type} />
                <MarketBadge market={market} />
                <span className="text-[14px] font-medium text-[var(--color-text)] truncate">
                  {trade.name}
                </span>
              </div>
              <span className="text-[14px] font-medium text-[var(--color-text)] shrink-0 ml-2 tabular-nums">
                {formatTotal(trade)}
              </span>
            </div>
            {/* 2행 */}
            <div className="flex justify-between items-center">
              <span className="text-[12px] text-[var(--color-g400)] dark:text-[var(--color-muted)] truncate">
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
