"use client";

import { useState, useRef, useEffect } from "react";

interface StockSearchInputProps {
  value: string;
  onChange: (keyword: string) => void;
  onEnter?: () => void;
  className?: string;
  placeholder?: string;
}

interface StockResult {
  ticker: string;
  name: string;
  market: string;
  country?: string;
}

export function StockSearchInput({ value, onChange, onEnter, className = "", placeholder = "종목명 또는 티커" }: StockSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<StockResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 value 변경 시 동기화 (초기화 등)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    onChange(val);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!val.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(val.trim())}&country=ALL`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        }
      } catch { /* 검색 실패 */ }
    }, 300);
  }

  function selectStock(stock: StockResult) {
    setQuery(stock.name);
    onChange(stock.name);
    setShowDropdown(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (query && results.length > 0) setShowDropdown(true); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setShowDropdown(false);
            onEnter?.();
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {results.map((s) => (
              <button
                key={s.ticker}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectStock(s); }}
                className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text)]">{s.name}</span>
                  <span className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] ml-2">{s.ticker}</span>
                </div>
                <span className="text-[10px] text-[var(--color-g400)] dark:text-[#4A5A4A]">{s.market}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
