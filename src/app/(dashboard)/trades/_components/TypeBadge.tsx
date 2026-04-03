"use client";

export function TypeBadge({ type }: { type: "BUY" | "SELL" }) {
  return (
    <span
      className="text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap"
      style={
        type === "BUY"
          ? { backgroundColor: "#E6F9F1", color: "#05C072" }
          : { backgroundColor: "#FFF3E8", color: "#F07D05" }
      }
    >
      {type === "BUY" ? "매수" : "매도"}
    </span>
  );
}
