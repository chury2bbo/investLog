"use client";

interface ToastProps {
  title: string;
  message: string;
  visible: boolean;
  variant?: "success" | "error";
  onClose: () => void;
}

export function Toast({
  title,
  message,
  visible,
  variant = "error",
  onClose,
}: ToastProps) {
  if (!visible) return null;

  const bg = variant === "success" ? "bg-[var(--color-primary)]" : "bg-[var(--color-negative)]";

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl min-w-[260px] max-w-[calc(100vw-40px)] animate-in fade-in slide-in-from-top-2 duration-300 ${bg}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white leading-tight">{title}</p>
        <p className="text-xs text-white/80 mt-0.5 leading-tight">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white transition-colors shrink-0 cursor-pointer"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
