"use client";

export function TypeBadge({ type }: { type: "BUY" | "SELL" }) {
  const styles =
    type === "BUY"
      ? "bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-positive)]"
      : "bg-(--color-sell-bg) dark:bg-[rgba(255,123,0,0.15)] text-(--color-warning)";

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${styles}`}>
      {type === "BUY" ? "매수" : "매도"}
    </span>
  );
}
