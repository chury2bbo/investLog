interface PnlTagProps {
  value: number;
}

export function PnlTag({ value }: PnlTagProps) {
  const positive = value >= 0;
  return (
    <span
      className="text-xs font-semibold px-2 py-1 rounded-md"
      style={{
        backgroundColor: positive ? "#E6F9F1" : "#FEE8EA",
        color: positive ? "#05C072" : "#F04452",
      }}
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
