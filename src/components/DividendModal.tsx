"use client";

import { useState, useRef, useEffect } from "react";
import { BottomSheet, Button, Input, DatePicker, Select } from "@/components/ui";
import { fmtNum, stripNum } from "@/lib/format";

interface DivAccount {
  id: number;
  memo: string | null;
  brokerageCompany: { name: string };
  holdings: { ticker: string; name: string }[];
}

interface DividendModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: DivAccount[];
  /** 계좌상세에서 열 때: 해당 계좌 id를 넘기면 auto-select + disabled */
  lockedAccountId?: number;
}

export function DividendModal({ open, onClose, onSuccess, accounts, lockedAccountId }: DividendModalProps) {
  const todayKst = () => {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
  };

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(lockedAccountId ?? null);
  const [divTicker, setDivTicker] = useState("");
  const [divName, setDivName] = useState("");
  const [divQuery, setDivQuery] = useState("");
  const [divDate, setDivDate] = useState(todayKst);
  const [divShowHoldings, setDivShowHoldings] = useState(false);
  const [divSearchResults, setDivSearchResults] = useState<{ ticker: string; name: string; market: string }[]>([]);
  const [divShowDropdown, setDivShowDropdown] = useState(false);
  const [cashCurrency, setCashCurrency] = useState("KRW");
  const [cashAmount, setCashAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);
  const activeHoldings = activeAccount?.holdings ?? [];

  useEffect(() => {
    if (!open) return;
    setSelectedAccountId(lockedAccountId ?? (accounts[0]?.id ?? null));
    setDivTicker("");
    setDivName("");
    setDivQuery("");
    setDivShowHoldings(false);
    setDivSearchResults([]);
    setDivShowDropdown(false);
    setCashCurrency("KRW");
    setCashAmount("");
    setError("");
    setDivDate(todayKst());
    setTimeout(() => amountRef.current?.focus(), 300);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleQueryChange(val: string) {
    setDivQuery(val);
    setDivTicker("");
    setDivName("");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!val.trim()) { setDivSearchResults([]); setDivShowDropdown(false); return; }
    setDivShowDropdown(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(val.trim())}&country=ALL`);
        if (res.ok) {
          const data = await res.json();
          setDivSearchResults(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
    }, 300);
  }

  function selectStock(ticker: string, name: string) {
    setDivTicker(ticker);
    setDivName(name);
    setDivQuery(name);
    setDivSearchResults([]);
    setDivShowDropdown(false);
    setDivShowHoldings(false);
    setCashCurrency(/^\d{6}$/.test(ticker) ? "KRW" : "USD");
    setTimeout(() => amountRef.current?.focus(), 100);
  }

  async function handleSubmit() {
    if (!selectedAccountId || !divTicker || !cashAmount) {
      setError("계좌, 종목, 금액을 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const amount = parseFloat(cashAmount.replace(/,/g, ""));
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          type: "DIVIDEND",
          currency: cashCurrency,
          amount,
          ticker: divTicker,
          name: divName,
          date: divDate,
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error ?? "처리에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && divSearchResults.length > 0) {
      e.preventDefault();
      dropdownItemRefs.current[0]?.focus();
    } else if (e.key === "Escape") {
      setDivShowDropdown(false);
    }
  }

  function handleDropdownKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (index < divSearchResults.length - 1) dropdownItemRefs.current[index + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index > 0) dropdownItemRefs.current[index - 1]?.focus();
      else searchInputRef.current?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectStock(divSearchResults[index].ticker, divSearchResults[index].name);
    } else if (e.key === "Escape") {
      setDivShowDropdown(false);
      searchInputRef.current?.focus();
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="배당금 등록">
      <div className="space-y-5">

        {/* 계좌 선택 */}
        <Select
          label="계좌"
          value={String(selectedAccountId ?? "")}
          onChange={(val) => {
            setSelectedAccountId(Number(val));
            setDivTicker(""); setDivName(""); setDivQuery(""); setDivShowHoldings(false);
          }}
          options={accounts.map((a) => ({
            value: String(a.id),
            label: `${a.brokerageCompany.name}${a.memo ? ` · ${a.memo}` : ""}`,
          }))}
          disabled={!!lockedAccountId}
        />

        {/* 종목 선택 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-[var(--color-g500)]">종목 *</label>
            {activeHoldings.length > 0 && (
              <button
                type="button"
                onClick={() => setDivShowHoldings(!divShowHoldings)}
                className="text-[11px] font-medium text-[var(--color-g500)] hover:text-[var(--color-primary)] transition-colors"
              >
                보유 종목 불러오기
              </button>
            )}
          </div>

          {divShowHoldings && (
            <div className="rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] p-2 max-h-32 overflow-y-auto space-y-1 mb-2">
              {activeHoldings.map((h) => (
                <button
                  key={h.ticker}
                  type="button"
                  onClick={() => selectStock(h.ticker, h.name)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-[var(--color-text)]">{h.name}</span>
                  <span className="text-xs text-[var(--color-g400)]">{h.ticker}</span>
                </button>
              ))}
            </div>
          )}

          {divTicker ? (
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-g200)] dark:border-[var(--color-border)]">
              <div>
                <span className="text-sm font-semibold text-[var(--color-text)]">{divName}</span>
                <span className="text-xs text-[var(--color-g400)] ml-2">{divTicker}</span>
              </div>
              <button
                type="button"
                onClick={() => { setDivTicker(""); setDivName(""); setDivQuery(""); }}
                className="text-lg leading-none text-[var(--color-g400)] hover:text-[var(--color-negative)] transition-colors"
              >×</button>
            </div>
          ) : (
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={divQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="종목명 또는 티커 검색"
                className="w-full pb-2 text-sm bg-transparent border-b border-[var(--color-g200)] dark:border-[var(--color-border)] outline-none text-[var(--color-text)] placeholder:text-[var(--color-g300)]"
              />
              {divShowDropdown && divSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[200] mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-card)] shadow-lg overflow-hidden">
                  <div className="max-h-40 overflow-y-auto">
                    {divSearchResults.map((s, index) => (
                      <button
                        key={s.ticker}
                        ref={(el) => { dropdownItemRefs.current[index] = el; }}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectStock(s.ticker, s.name); }}
                        onKeyDown={(e) => handleDropdownKeyDown(e, index)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] focus:bg-[var(--color-g100)] dark:focus:bg-[var(--color-border)] outline-none transition-colors flex items-center justify-between"
                      >
                        <div>
                          <span className="text-sm font-medium text-[var(--color-text)]">{s.name}</span>
                          <span className="text-xs text-[var(--color-g400)] ml-2">{s.ticker}</span>
                        </div>
                        <span className="text-[10px] text-[var(--color-g400)]">{s.market}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 통화 선택 */}
        <div className="flex gap-2">
          {["KRW", "USD"].map((c) => (
            <button
              key={c}
              onClick={() => { setCashCurrency(c); setCashAmount(""); setError(""); }}
              disabled={!!divTicker}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: cashCurrency === c ? "var(--color-primary)" : "var(--color-g100)",
                color: cashCurrency === c ? "#fff" : "var(--color-g500)",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 날짜 */}
        <DatePicker label="배당 수령일 *" value={divDate} onChange={setDivDate} />

        {/* 금액 */}
        <Input
          ref={amountRef}
          label="배당금액"
          inputMode="numeric"
          value={fmtNum(cashAmount)}
          onChange={(e) => setCashAmount(stripNum(e.target.value, true))}
          placeholder={cashCurrency === "KRW" ? "100,000" : "100"}
        />

        {error && <p className="text-sm text-[var(--color-negative)] text-center -mt-1">{error}</p>}

        <Button size="lg" onClick={handleSubmit} disabled={submitting || !cashAmount || !divTicker || !selectedAccountId}>
          {submitting ? "처리 중..." : "배당금 등록"}
        </Button>
      </div>
    </BottomSheet>
  );
}
