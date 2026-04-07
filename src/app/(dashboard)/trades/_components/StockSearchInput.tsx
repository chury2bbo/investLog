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
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 외부 value 변경 시 동기화 (초기화 등)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // activeIndex 변경 시 포커스 이동
  useEffect(() => {
    if (activeIndex === -1) {
      inputRef.current?.focus();
    } else {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex]);

  // 결과 바뀌면 선택 초기화
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setActiveIndex(-1);
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
    setActiveIndex(-1);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && showDropdown && results.length > 0) {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    } else if (e.key === "Enter") {
      setShowDropdown(false);
      onEnter?.();
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, i: number, stock: StockResult) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i === 0) setActiveIndex(-1);
      else setActiveIndex(i - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectStock(stock);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (query && results.length > 0) setShowDropdown(true); }}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {results.map((s, i) => (
              <button
                key={s.ticker}
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectStock(s); }}
                onKeyDown={(e) => handleItemKeyDown(e, i, s)}
                className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] focus:bg-[var(--color-g100)] dark:focus:bg-[var(--color-border)] outline-none transition-colors flex items-center justify-between"
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
