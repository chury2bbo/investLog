"use client";

interface SummaryChipsProps {
  totalCount: number;
  buyCount: number;
  sellCount: number;
  buyKrw: number;
  buyUsd: number;
  sellKrw: number;
  sellUsd: number;
}

function formatAmounts(krw: number, usd: number): string {
  const parts: string[] = [];
  if (krw > 0) parts.push(`₩${Math.floor(krw).toLocaleString()}`);
  if (usd > 0) parts.push(`$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  if (parts.length === 0) return "₩0";
  return parts.join(" / ");
}

export function SummaryChips({ totalCount, buyCount, sellCount, buyKrw, buyUsd, sellKrw, sellUsd }: SummaryChipsProps) {
  return (
    <div className="rounded-2xl px-5 py-3.5 bg-[var(--color-surface)] dark:bg-[var(--color-card)] border border-[var(--color-g200)] dark:border-[var(--color-border)] shadow-sm">
      <div className="flex gap-3 flex-wrap">
        <div className="text-center">
          <div className="text-[10px] text-[var(--color-g400)] mb-0.5">총 매매</div>
          <div className="text-sm font-bold text-[var(--color-text)]">{totalCount}건</div>
        </div>
        <div className="w-px bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
        <div className="text-center">
          <div className="text-[10px] text-[var(--color-positive)] mb-0.5">매수 {buyCount}건</div>
          <div className="text-sm font-bold text-[var(--color-positive)]">{formatAmounts(buyKrw, buyUsd)}</div>
        </div>
        <div className="w-px bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
        <div className="text-center">
          <div className="text-[10px] text-[var(--color-warning)] mb-0.5">매도 {sellCount}건</div>
          <div className="text-sm font-bold text-[var(--color-warning)]">{formatAmounts(sellKrw, sellUsd)}</div>
        </div>
      </div>
    </div>
  );
}
