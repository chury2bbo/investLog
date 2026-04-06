interface TagProps {
  label: string;
  color?: "green" | "gray" | "blue" | "orange";
}

export function Tag({ label, color = "gray" }: TagProps) {
  const styles: Record<string, string> = {
    green: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
    gray: "bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)]",
    blue: "bg-[#E8F0FE] text-[#4285F4]",
    orange: "bg-[#FFFBF5] text-[var(--color-warning)]",
  };

  return (
    <span className={`text-[11px] font-bold px-[7px] py-[2px] rounded-[5px] tracking-wide ${styles[color]}`}>
      {label}
    </span>
  );
}
