interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "black";
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
    "rounded-xl font-semibold transition-opacity inline-flex items-center justify-center cursor-pointer";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "w-full py-3 text-sm",
  };

  const variants = {
    primary: { backgroundColor: "#05C072", color: "#fff" },
    secondary: { backgroundColor: "#F0F4F0", color: "#1A221A" },
    black: { backgroundColor: "#1A221A", color: "#fff" },
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
