"use client";

interface SummaryChipsProps {
  totalCount: number;
  buyKrw: number;
  buyUsd: number;
  sellKrw: number;
  sellUsd: number;
  avgPnlRate: number | null;
}

function shortKrw(n: number): string {
  if (Math.abs(n) >= 1_0000_0000) return `${Math.floor((n / 1_0000_0000) * 10) / 10}억`;
  if (Math.abs(n) >= 1_0000) return `${Math.floor((n / 10000) * 10) / 10}만`;
  return Math.floor(n).toLocaleString();
}

function shortUsd(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatAmounts(krw: number, usd: number): string {
  const parts: string[] = [];
  if (krw > 0) parts.push(`₩${shortKrw(krw)}`);
  if (usd > 0) parts.push(`$${shortUsd(usd)}`);
  if (parts.length === 0) return "₩0";
  return parts.join(" / ");
}

export function SummaryChips({ totalCount, buyKrw, buyUsd, sellKrw, sellUsd, avgPnlRate }: SummaryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none">
      <span className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)]">
        {totalCount}건
      </span>
      <span className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-positive)]">
        매수 <b>{formatAmounts(buyKrw, buyUsd)}</b>
      </span>
      <span className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FFFBF5] dark:bg-[rgba(255,123,0,0.15)] text-[var(--color-warning)]">
        매도 <b>{formatAmounts(sellKrw, sellUsd)}</b>
      </span>
      {avgPnlRate !== null && (
        <span
          className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium ${
            avgPnlRate >= 0
              ? "bg-[var(--color-positive-soft)] dark:bg-[rgba(5,192,114,0.15)] text-[var(--color-positive)]"
              : "bg-[var(--color-negative-soft)] dark:bg-[rgba(240,68,82,0.15)] text-[var(--color-negative)]"
          }`}
        >
          수익률 <b>{avgPnlRate >= 0 ? "+" : ""}{avgPnlRate.toFixed(1)}%</b>
        </span>
      )}
    </div>
  );
}
