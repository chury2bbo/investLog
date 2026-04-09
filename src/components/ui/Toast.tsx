"use client";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  title: string;
  message: string;
  visible: boolean;
  variant?: "success" | "error";
  action?: ToastAction;
  onClose: () => void;
}

export function Toast({
  title,
  message,
  visible,
  variant = "error",
  action,
  onClose,
}: ToastProps) {
  if (!visible) return null;

  const bg = variant === "success" ? "bg-[var(--color-primary)]" : "bg-[var(--color-negative)]";

  const icon = variant === "success" ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white shrink-0 mt-px">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white shrink-0 mt-px">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl min-w-[260px] max-w-[calc(100vw-40px)] animate-in fade-in slide-in-from-top-2 duration-300 ${bg}`}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white leading-tight">{title}</p>
        <p className="text-xs text-white/80 mt-0.5 leading-tight">{message}</p>
        {action && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => { action.onClick(); onClose(); }}
              className="text-[11px] font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors cursor-pointer"
            >
              {action.label}
            </button>
            <button
              onClick={onClose}
              className="text-[11px] text-white/60 hover:text-white/90 px-2 py-1 transition-colors cursor-pointer"
            >
              나중에
            </button>
          </div>
        )}
      </div>
      {!action && (
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
      )}
    </div>
  );
}
