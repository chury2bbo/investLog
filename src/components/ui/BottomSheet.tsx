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
    <div className="fixed inset-0 z-50 flex items-end">
      {/* 딤 배경 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 시트 */}
      <div
        className="relative w-full rounded-t-3xl p-6"
        style={{
          backgroundColor: "#FFFFFF",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* 핸들 */}
        <div
          className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ backgroundColor: "#E8EEE8" }}
        />
        <h3
          className="text-base font-bold mb-4"
          style={{ color: "#1A221A" }}
        >
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
