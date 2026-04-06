"use client";

import { useState, useRef, useEffect } from "react";

interface ReasonTagChipProps {
  tags: string[];
}

export function ReasonTagChip({ tags }: ReasonTagChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (tags.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] truncate max-w-[80px]">
        {tags[0]}
      </span>
      {tags.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors cursor-pointer"
        >
          +{tags.length - 1}
        </button>
      )}
      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[120px] rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg p-2 space-y-1">
          {tags.map((tag) => (
            <div
              key={tag}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[var(--color-text)] dark:text-[var(--color-text)] bg-[var(--color-g100)] dark:bg-[var(--color-border)]"
            >
              {tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
