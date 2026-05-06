"use client";

export function MarketBadge({ market }: { market: "KR" | "US" }) {
  const styles =
    market === "KR"
      ? "bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-positive)]"
      : "bg-(--color-foreign-bg) dark:bg-[rgba(66,133,244,0.15)] text-(--color-foreign)";

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${styles}`}>
      {market === "KR" ? "국내" : "해외"}
    </span>
  );
}
