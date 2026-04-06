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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref}>
      {label && (
        <label className="block text-xs font-medium mb-1 text-[var(--color-g500)]">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
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
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between border-b border-[var(--color-g200)] dark:border-[var(--color-border)] last:border-0 ${
                value === opt.value
                  ? "bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-dark)]/20 text-[var(--color-primary)] font-semibold"
                  : "text-[var(--color-text)] hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)]"
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
