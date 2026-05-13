interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  const interactive = onClick
    ? "cursor-pointer active:scale-[0.96] active:opacity-70 transition-all"
    : "";
  return (
    <div
      onClick={onClick}
      className={`rounded-[18px] p-[22px] bg-[var(--color-surface)] dark:bg-[var(--color-card)] dark:border dark:border-[var(--color-border)] ${interactive} ${className}`}
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
      }}
    >
      {children}
    </div>
  );
}
