interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "black" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
}: ButtonProps) {
  const base =
    "rounded-lg font-semibold transition-opacity inline-flex items-center justify-center cursor-pointer";

  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-5 py-[13px] text-sm",
    lg: "w-full py-[13px] text-sm",
  };

  const variants: Record<string, string> = {
    primary: "bg-[var(--color-primary)] text-white shadow-[0_2px_12px_color-mix(in_srgb,var(--color-primary)_27%,transparent)]",
    secondary: "bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g600)] dark:text-[var(--color-text)]",
    black: "bg-[var(--color-text)] text-white dark:bg-[var(--color-g400)] dark:text-[var(--color-bg)]",
    outline: "bg-transparent text-[var(--color-primary)] border-[1.5px] border-[var(--color-primary)]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]}`}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </button>
  );
}
