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
    "rounded-xl font-bold transition-opacity inline-flex items-center justify-center cursor-pointer";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-[13px] text-sm",
    lg: "w-full py-[13px] text-sm",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: "var(--color-primary)", color: "#fff", boxShadow: "0 2px 12px color-mix(in srgb, var(--color-primary) 27%, transparent)" },
    secondary: { backgroundColor: "var(--color-g100)", color: "var(--color-g600)" },
    black: { backgroundColor: "var(--color-text)", color: "#fff" },
    outline: { backgroundColor: "transparent", color: "var(--color-primary)", border: "1.5px solid var(--color-primary)" },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]}`}
      style={{ ...variants[variant], opacity: disabled ? 0.4 : 1 }}
    >
      {children}
    </button>
  );
}
