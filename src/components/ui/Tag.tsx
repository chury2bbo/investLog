interface TagProps {
  label: string;
  color?: "green" | "gray" | "blue" | "orange";
}

export function Tag({ label, color = "gray" }: TagProps) {
  const styles: Record<string, string> = {
    green: "bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.15)] text-[var(--color-primary)]",
    gray: "bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)]",
    blue: "bg-(--color-foreign-bg) dark:bg-[rgba(66,133,244,0.15)] text-(--color-foreign)",
    orange: "bg-(--color-sell-bg) dark:bg-[rgba(255,123,0,0.15)] text-(--color-warning)",
  };

  return (
    <span className={`text-[11px] font-bold px-[7px] py-[2px] rounded-[5px] tracking-wide ${styles[color]}`}>
      {label}
    </span>
  );
}
