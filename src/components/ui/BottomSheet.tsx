"use client";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:items-center md:justify-center">
      {/* 딤 배경 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 시트 */}
      <div
        className="relative w-[calc(100%-32px)] md:w-[420px] md:max-w-[90vw] rounded-[18px] overflow-hidden mx-4 bg-[var(--color-surface)] dark:bg-[var(--color-card)] dark:border dark:border-[var(--color-border)]"
        style={{ maxHeight: "80vh" }}
      >
        <div className="overflow-y-auto max-h-[80vh] p-6">
          <h3 className="text-base font-bold mb-4 text-[var(--color-text)]">
            {title}
          </h3>
          {children}
        </div>
      </div>
    </div>
  );
}
