"use client";

import { useState, useRef, useEffect } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "선택하세요",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // activeIndex 변경 시 해당 항목으로 포커스 이동
  useEffect(() => {
    if (open && activeIndex >= 0) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  const selected = options.find((o) => o.value === value);

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex(0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex(options.length - 1);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index < options.length - 1) {
        setActiveIndex(index + 1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) {
        setActiveIndex(index - 1);
      } else {
        // 맨 위에서 위 누르면 트리거 버튼으로 복귀
        setActiveIndex(-1);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(options[index].value);
      setOpen(false);
      setActiveIndex(-1);
      triggerRef.current?.focus();
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      triggerRef.current?.focus();
    }
  }

  return (
    <div ref={ref}>
      {label && (
        <label className="block text-xs font-medium mb-1 text-[var(--color-g500)]">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen(!open); setActiveIndex(-1); }}
        onKeyDown={handleTriggerKeyDown}
        className="w-full flex items-center justify-between pb-2 text-sm bg-transparent outline-none border-b-2 border-[var(--color-g200)] text-[var(--color-text)] cursor-pointer"
      >
        <span>{selected?.label ?? placeholder}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-g400)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg">
          {options.map((opt, index) => (
            <button
              key={opt.value}
              ref={(el) => { itemRefs.current[index] = el; }}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                setActiveIndex(-1);
                triggerRef.current?.focus();
              }}
              onKeyDown={(e) => handleItemKeyDown(e, index)}
              className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between border-b border-[var(--color-g200)] dark:border-[var(--color-border)] last:border-0 outline-none ${
                value === opt.value
                  ? "bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-dark)]/20 text-[var(--color-primary)] font-semibold"
                  : "text-[var(--color-text)] hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] focus:bg-[var(--color-g100)] dark:focus:bg-[var(--color-border)]"
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && (
                <span className="text-[var(--color-primary)]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
