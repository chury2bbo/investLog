"use client";

import { useState, useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  destructive = false,
  confirmLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-6 transition-opacity duration-200"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", opacity: animating ? 1 : 0 }}
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#1A2320] rounded-2xl w-full max-w-xs shadow-2xl transition-all duration-200"
        style={{
          transform: animating ? "scale(1)" : "scale(0.85)",
          opacity: animating ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-sm font-bold text-[var(--color-text)]">{title}</p>
          <p className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A] mt-1.5 leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        <div className="flex border-t border-[#F0F4F0] dark:border-[#2D3D30]">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-semibold text-[var(--color-g400)] dark:text-[var(--color-muted)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-border)] rounded-bl-2xl transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <div className="w-px bg-[#F0F4F0] dark:bg-[#2D3D30]" />
          <button
            onClick={onConfirm}
            disabled={confirmLoading}
            className={`flex-1 py-3.5 text-sm font-bold rounded-br-2xl transition-colors cursor-pointer disabled:opacity-50 ${
              destructive
                ? "text-[var(--color-negative)] hover:bg-[var(--color-negative-soft)] dark:hover:bg-[#3D1519]"
                : "text-[var(--color-positive)] hover:bg-[var(--color-primary-soft)] dark:hover:bg-[#0D2A1D]"
            }`}
          >
            {confirmLoading ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
