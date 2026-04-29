"use client";

interface SummaryChipsProps {
  totalCount: number;
  buyCount: number;
  sellCount: number;
  buyKrw: number;
  buyUsd: number;
  sellKrw: number;
  sellUsd: number;
  divCount?: number;
  divKrw?: number;
  divUsd?: number;
  isDividendMode?: boolean;
}

function formatAmounts(krw: number, usd: number): string {
  const parts: string[] = [];
  if (krw > 0) parts.push(`₩${Math.floor(krw).toLocaleString()}`);
  if (usd > 0) parts.push(`$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  if (parts.length === 0) return "₩0";
  return parts.join(" / ");
}

export function SummaryChips({ totalCount, buyCount, sellCount, buyKrw, buyUsd, sellKrw, sellUsd, divCount = 0, divKrw = 0, divUsd = 0, isDividendMode = false }: SummaryChipsProps) {
  const showDiv = isDividendMode || divCount > 0;

  return (
    <div className="rounded-2xl px-4 py-3.5 bg-[var(--color-surface)] dark:bg-[var(--color-card)] border border-[var(--color-g200)] dark:border-[var(--color-border)] shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* 총 매매 */}
        <div className="flex sm:flex-col items-center sm:items-center justify-between sm:justify-center sm:min-w-[64px]">
          <div className="text-[10px] text-[var(--color-g400)] sm:mb-0.5">{showDiv ? "총 배당" : "총 매매"}</div>
          <div className="text-sm font-bold text-[var(--color-text)]">{totalCount}{showDiv ? "회" : "건"}</div>
        </div>

        <div className="hidden sm:block w-px self-stretch bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
        <div className="sm:hidden h-px w-full bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />

        {showDiv ? (
          /* 배당 모드 */
          <>
            <div className="flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 sm:gap-0 flex-1 min-w-0">
              <div className="text-[10px] text-[#8B5CF6] shrink-0 sm:mb-0.5">원화 배당</div>
              <div className="text-sm font-bold text-[#8B5CF6] truncate sm:text-center text-right">
                ₩{Math.floor(divKrw).toLocaleString()}
              </div>
            </div>
            <div className="hidden sm:block w-px self-stretch bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
            <div className="sm:hidden h-px w-full bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />
            <div className="flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 sm:gap-0 flex-1 min-w-0">
              <div className="text-[10px] text-[#8B5CF6] shrink-0 sm:mb-0.5">달러 배당</div>
              <div className="text-sm font-bold text-[#8B5CF6] truncate sm:text-center text-right">
                ${divUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </>
        ) : (
          /* 매매 모드 */
          <>
            <div className="flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 sm:gap-0 flex-1 min-w-0">
              <div className="text-[10px] text-[var(--color-positive)] shrink-0 sm:mb-0.5">매수 {buyCount}건</div>
              <div className="text-sm font-bold text-[var(--color-positive)] truncate sm:text-center text-right">
                {formatAmounts(buyKrw, buyUsd)}
              </div>
            </div>

            <div className="hidden sm:block w-px self-stretch bg-[var(--color-g200)] dark:bg-[var(--color-border)]" />

            <div className="flex sm:flex-col items-center sm:items-center justify-between sm:justify-center gap-2 sm:gap-0 flex-1 min-w-0">
              <div className="text-[10px] text-[var(--color-warning)] shrink-0 sm:mb-0.5">매도 {sellCount}건</div>
              <div className="text-sm font-bold text-[var(--color-warning)] truncate sm:text-center text-right">
                {formatAmounts(sellKrw, sellUsd)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
