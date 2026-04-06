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
        <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] cursor-pointer"
      >
        <span>{selected?.label ?? placeholder}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#9AA99A]"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#E4EAE4] dark:border-[#2A3828] bg-white dark:bg-[#1D2720] shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between border-b border-[#F0F4F0] dark:border-[#2D3D30] last:border-0 ${
                value === opt.value
                  ? "bg-[#E6F9F1] dark:bg-[#0D2A1D] text-[#05C072] font-semibold"
                  : "text-[#1A221A] dark:text-[#E8EEE8]"
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && (
                <span className="text-[#05C072]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
