interface PnlTagProps {
  value: number;
}

export function PnlTag({ value }: PnlTagProps) {
  const positive = value >= 0;
  return (
    <span
      className={`text-[11px] font-bold px-[10px] py-[3px] rounded-[6px] ${
        positive
          ? "bg-[var(--color-positive-soft)] dark:bg-[rgba(5,192,114,0.15)] text-[var(--color-positive)]"
          : "bg-[var(--color-negative-soft)] dark:bg-[rgba(240,68,82,0.15)] text-[var(--color-negative)]"
      }`}
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
