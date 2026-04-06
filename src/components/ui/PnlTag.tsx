interface PnlTagProps {
  value: number;
}

export function PnlTag({ value }: PnlTagProps) {
  const positive = value >= 0;
  return (
    <span
      className="text-[11px] font-bold px-[10px] py-[3px] rounded-[6px]"
      style={{
        backgroundColor: positive ? "var(--color-positive-soft)" : "var(--color-negative-soft)",
        color: positive ? "var(--color-positive)" : "var(--color-negative)",
      }}
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
