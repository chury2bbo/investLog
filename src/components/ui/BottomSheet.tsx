"use client";

import { useState, useEffect } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, titleRight, children }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // 열려있을 때 body 스크롤 잠금
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center md:justify-center">
      {/* 딤 배경 */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ backgroundColor: "rgba(0,0,0,0.4)", opacity: animating ? 1 : 0 }}
        onClick={onClose}
      />

      {/* 시트: 모바일 max 90vh / PC max 80vh */}
      <div
        className="relative w-full md:w-[420px] md:max-w-[90vw] rounded-t-[20px] md:rounded-[18px] overflow-hidden flex flex-col transition-all duration-300 ease-out bg-[var(--color-surface)] dark:bg-[var(--color-card)] dark:border dark:border-[var(--color-border)]"
        style={{
          maxHeight: "80vh",
          transform: animating
            ? "translateY(0) scale(1)"
            : "translateY(100%) scale(0.95)",
          opacity: animating ? 1 : 0,
        }}
      >
        {/* 드래그 핸들 (모바일) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
          <div className="w-9 h-1 rounded-full bg-[var(--color-g300)] dark:bg-[var(--color-border)]" />
        </div>

        {/* 타이틀 */}
        <div className="px-6 pt-4 md:pt-6 pb-0 shrink-0 flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--color-text)]">
            {title}
          </h3>
          {titleRight}
        </div>

        {/* 스크롤 가능한 컨텐츠 */}
        <div className="overflow-y-auto overscroll-contain px-6 pt-4 pb-8 md:pb-6">

          {children}
        </div>
      </div>
    </div>
  );
}
