"use client";

export function MarketBadge({ market }: { market: "KR" | "US" }) {
  return (
    <span
      className="text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap"
      style={
        market === "KR"
          ? { backgroundColor: "#E6F9F1", color: "#05C072" }
          : { backgroundColor: "#E8F0FE", color: "#4285F4" }
      }
    >
      {market === "KR" ? "국내" : "해외"}
    </span>
  );
}
