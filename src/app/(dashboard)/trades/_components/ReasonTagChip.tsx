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
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A] truncate max-w-[80px]">
        {tags[0]}
      </span>
      {tags.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors cursor-pointer"
        >
          +{tags.length - 1}
        </button>
      )}
      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[120px] rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720] shadow-lg p-2 space-y-1">
          {tags.map((tag) => (
            <div
              key={tag}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#1A221A] dark:text-[#E8EEE8] bg-[#F0F4F0] dark:bg-[#2D3D30]"
            >
              {tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
