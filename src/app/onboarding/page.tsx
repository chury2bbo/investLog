"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Tag, LoadingSpinner, ConfirmDialog } from "@/components/ui";
import { ImportModal } from "@/components/ImportModal";

function fmtNum(val: string) {
  if (!val) return "";
  const [int, dec] = val.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

function stripNum(val: string, allowDot = false) {
  return allowDot ? val.replace(/[^0-9.]/g, "") : val.replace(/[^0-9]/g, "");
}

// ─── 타입 ────────────────────────────────────────────────

interface SearchResult {
  ticker: string;
  name: string;
  market: string;
  country: string;
}

interface HoldingItem {
  ticker: string;
  name: string;
  country: string;
  avgPrice: number;
  quantity: number;
  sectorManual: string;
  tags: string[];
}

interface AccountItem {
  accountCode: string;
  accountName: string;
  cashKRW: string;
  cashUSD: string;
  holdings: HoldingItem[];
}

interface TradeItem {
  accountIndex: number;
  ticker: string;
  name: string;
  type: "BUY" | "SELL";
  price: string;
  quantity: string;
  reasonTags: string[];
}


const REASON_TAGS = [
  { label: "실적호조", desc: "실적 개선 기대" },
  { label: "저평가", desc: "내재가치 대비 할인" },
  { label: "기술적분석", desc: "차트·지표 기반" },
  { label: "배당목적", desc: "배당 수익 목적" },
  { label: "성장주", desc: "장기 성장 기대" },
  { label: "테마·트렌드", desc: "산업 트렌드 수혜" },
  { label: "분할매수", desc: "나눠서 매수" },
  { label: "포트리밸런싱", desc: "비중 조절" },
  { label: "뉴스·공시", desc: "뉴스/공시 반응" },
  { label: "지인추천", desc: "추천 받아 매수" },
];

// ─── 종목 검색 컴포넌트 ──────────────────────────────────

function StockSearch({
  onSelect,
  onClear,
  selected,
  inputRef,
}: {
  onSelect: (result: SearchResult) => void;
  onClear?: () => void;
  selected?: { name: string; ticker: string };
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/market/search?q=${encodeURIComponent(value.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
          setOpen(true);
        }
      } catch {
        /* 검색 실패 무시 */
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  // 선택된 종목이 있으면 이름+티커+X 표시
  if (selected?.ticker) {
    return (
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#6B7B6B" }}>
          종목 검색
        </label>
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "#D4DDD4" }}>
          <div>
            <span className="text-sm font-semibold" style={{ color: "#1A221A" }}>{selected.name}</span>
            <span className="text-xs ml-2" style={{ color: "#9AA99A" }}>{selected.ticker}</span>
          </div>
          <button
            type="button"
            onClick={() => { onClear?.(); }}
            className="text-lg leading-none hover:text-[#F04452] transition-colors"
            style={{ color: "#9AA99A" }}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label
        className="block text-xs font-medium mb-1"
        style={{ color: "#6B7B6B" }}
      >
        종목 검색
      </label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="종목명 또는 티커 입력"
          className="flex-1 pb-2 text-sm bg-transparent outline-none border-b"
          style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
        />
        {searching && <LoadingSpinner size={16} />}
      </div>

      {open && results.length > 0 && (
        <ul
          className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          {results.map((r) => (
            <li
              key={r.ticker}
              className="px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between"
              onClick={() => {
                onSelect(r);
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
            >
              <span style={{ color: "#1A221A" }}>
                {r.name}{" "}
                <span className="text-xs" style={{ color: "#9AA99A" }}>
                  {r.ticker}
                </span>
              </span>
              <Tag
                label={r.country === "KR" ? "국내" : "해외"}
                color={r.country === "KR" ? "green" : "blue"}
              />
            </li>
          ))}
        </ul>
      )}

      {open && !searching && results.length === 0 && query.trim().length > 0 && (
        <div
          className="absolute z-20 w-full mt-1 rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            color: "#9AA99A",
          }}
        >
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
}

// ─── 메인 온보딩 페이지 ──────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // 온보딩 완료 여부 체크 — 이미 완료했으면 대시보드로 리다이렉트
  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => res.ok ? res.json() : { onboardingDone: false })
      .then((data) => {
        if (data.onboardingDone) {
          router.replace("/");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  // 캡처 불러오기 모달
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importAccIdx, setImportAccIdx] = useState(0);

  function applyImportResult(
    imported: { ticker: string; name: string; country: string; avgPrice: string; quantity: string }[],
    importedCash: { currency: string; amount: number }[],
    idx: number
  ) {
    setAccounts((prev) => {
      const next = [...prev];
      const isSame = (e: { ticker: string; name: string }, h: { ticker: string; name: string }) =>
        h.ticker ? e.ticker === h.ticker : e.name === h.name;

      // 기존 종목 업데이트 + 새 종목 추가
      const updatedHoldings = next[idx].holdings.map((e) => {
        const match = imported.find((h) => isSame(e, h));
        if (!match) return e;
        const newAvgPrice = parseFloat(match.avgPrice) || 0;
        const newQuantity = parseInt(match.quantity) || 0;
        if (e.avgPrice === newAvgPrice && e.quantity === newQuantity) return e;
        return { ...e, avgPrice: newAvgPrice, quantity: newQuantity };
      });

      const addedHoldings = imported
        .filter((h) => !next[idx].holdings.some((e) => isSame(e, h)))
        .map((h) => ({
          ticker: h.ticker,
          name: h.name,
          country: h.country ?? "KR",
          avgPrice: parseFloat(h.avgPrice) || 0,
          quantity: parseInt(h.quantity) || 0,
          sectorManual: "",
          tags: [],
        }));

      const krw = importedCash.find((c) => c.currency === "KRW");
      const usd = importedCash.find((c) => c.currency === "USD");
      next[idx] = {
        ...next[idx],
        holdings: [...updatedHoldings, ...addedHoldings],
        ...(krw && krw.amount > 0 ? { cashKRW: String(krw.amount) } : {}),
        ...(usd && usd.amount > 0 ? { cashUSD: String(usd.amount) } : {}),
      };
      return next;
    });
  }

  // 토스트
  const [toast, setToast] = useState<{ title: string; message: string; visible: boolean }>({ title: "", message: "", visible: false });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(title: string, message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, message, visible: true });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3500);
  }

  // 증권사 목록
  const [brokerages, setBrokerages] = useState<{ code: string; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/brokerages")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setBrokerages(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // 드롭다운 열림 상태 (계좌별 증권사 / Step 2 계좌)
  const [brokerageDropOpen, setBrokerageDropOpen] = useState<number | null>(null);
  const [tradeAccountDropOpen, setTradeAccountDropOpen] = useState(false);

  // 증권사 변경 시 기존 데이터 초기화 confirm
  const [pendingBrokerageChange, setPendingBrokerageChange] = useState<{ index: number; code: string } | null>(null);

  function selectBrokerage(index: number, code: string) {
    setBrokerageDropOpen(null);
    const acc = accounts[index];
    const hasData = acc.cashKRW || acc.cashUSD || acc.holdings.length > 0;
    if (hasData && acc.accountCode !== code) {
      setPendingBrokerageChange({ index, code });
      return;
    }
    updateAccount(index, "accountCode", code);
  }

  // Step 1 — 계좌 & 종목
  const [accounts, setAccounts] = useState<AccountItem[]>([
    {
      accountCode: "",
      accountName: "",
      cashKRW: "",
      cashUSD: "",
      holdings: [],
    },
  ]);

  const avgPriceRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const quantityRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const stockSearchRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const tradePriceRef = useRef<HTMLInputElement | null>(null);
  const [tradePriceLoading, setTradePriceLoading] = useState(false);

  // 종목 추가 폼 상태 (계좌별)
  const [priceLoadings, setPriceLoadings] = useState<Record<number, boolean>>({});
  const cashKRWRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [holdingForms, setHoldingForms] = useState<
    Record<
      number,
      {
        ticker: string;
        name: string;
        country: string;
        avgPrice: string;
        quantity: string;
        sectorManual: string;
        tags: string[];
      }
    >
  >({});

  // Step 2 — 매매 기록
  const [trade, setTrade] = useState<TradeItem>({
    accountIndex: -1,
    ticker: "",
    name: "",
    type: "BUY",
    price: "",
    quantity: "",
    reasonTags: [],
  });

  // ─── 계좌 관리 ─────────────────────────────────────────

  function addAccount() {
    setAccounts((prev) => [
      ...prev,
      {
        accountCode: "",
        accountName: "",
        cashKRW: "",
        cashUSD: "",
        holdings: [],
      },
    ]);
  }

  function removeAccount(index: number) {
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAccount(index: number, field: keyof AccountItem, value: string) {
    setAccounts((prev) =>
      prev.map((acc, i) => {
        if (i !== index) return acc;
        if (field === "accountCode") {
          const isDuplicate = prev.some((a, j) => j !== index && a.accountCode === value);
          if (isDuplicate) {
            const brokerage = brokerages.find((b) => b.code === value);
            showToast("중복 증권사", `${brokerage?.name ?? value}은 이미 추가된 계좌입니다.`);
            setBrokerageDropOpen(null);
            return { ...acc, accountCode: "", accountName: "" };
          }
          const brokerage = brokerages.find((b) => b.code === value);
          setTimeout(() => cashKRWRefs.current[index]?.focus(), 50);
          return {
            ...acc,
            accountCode: value,
            accountName: brokerage?.name ?? value,
          };
        }
        return { ...acc, [field]: value };
      })
    );
  }

  // ─── 종목 관리 ─────────────────────────────────────────

  function getHoldingForm(accIndex: number) {
    return (
      holdingForms[accIndex] ?? {
        ticker: "",
        name: "",
        country: "",
        avgPrice: "",
        quantity: "",
        sectorManual: "",
        tags: [],
      }
    );
  }

  function updateHoldingForm(
    accIndex: number,
    field: string,
    value: string
  ) {
    setHoldingForms((prev) => ({
      ...prev,
      [accIndex]: { ...getHoldingForm(accIndex), [field]: value },
    }));
  }

  async function selectTradeStock(result: SearchResult) {
    setTrade((prev) => ({ ...prev, ticker: result.ticker, name: result.name, price: "" }));
    setTradePriceLoading(true);
    try {
      const res = await fetch(`/api/market/quote?tickers=${encodeURIComponent(result.ticker)}`);
      if (res.ok) {
        const data = await res.json();
        const quote = data.quotes?.[0] ?? null;
        if (quote?.price) {
          setTrade((prev) => ({ ...prev, price: String(quote.price) }));
        }
      }
    } catch {
      /* 현재가 조회 실패 시 수동 입력 */
    } finally {
      setTradePriceLoading(false);
      setTimeout(() => tradePriceRef.current?.focus(), 50);
    }
  }

  function toggleHoldingTag(accIndex: number, tag: string) {
    const current = getHoldingForm(accIndex).tags;
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    setHoldingForms((prev) => ({
      ...prev,
      [accIndex]: { ...getHoldingForm(accIndex), tags: next },
    }));
  }

  async function selectStock(accIndex: number, result: SearchResult) {
    const isDuplicate = accounts[accIndex]?.holdings.some((h) => h.ticker === result.ticker);
    if (isDuplicate) {
      showToast("중복 종목", `${result.name}(${result.ticker})은 이미 추가된 종목입니다.`);
      setTimeout(() => stockSearchRefs.current[accIndex]?.focus(), 50);
      return;
    }

    setHoldingForms((prev) => ({
      ...prev,
      [accIndex]: {
        ...getHoldingForm(accIndex),
        ticker: result.ticker,
        name: result.name,
        country: result.country,
        avgPrice: "",
      },
    }));

    setPriceLoadings((prev) => ({ ...prev, [accIndex]: true }));
    try {
      const res = await fetch(`/api/market/quote?tickers=${encodeURIComponent(result.ticker)}`);
      if (res.ok) {
        const data = await res.json();
        const quote = data.quotes?.[0] ?? null;
        if (quote?.price) {
          setHoldingForms((prev) => ({
            ...prev,
            [accIndex]: {
              ...prev[accIndex],
              avgPrice: String(quote.price),
            },
          }));
        }
      }
    } catch {
      /* 현재가 조회 실패 시 수동 입력 */
    } finally {
      setPriceLoadings((prev) => ({ ...prev, [accIndex]: false }));
      setTimeout(() => avgPriceRefs.current[accIndex]?.focus(), 50);
    }
  }

  function addHolding(accIndex: number) {
    const form = getHoldingForm(accIndex);
    if (!form.ticker || !form.avgPrice || !form.quantity) return;

    const isDuplicate = accounts[accIndex]?.holdings.some((h) => h.ticker === form.ticker);
    if (isDuplicate) {
      showToast("중복 종목", `${form.name}(${form.ticker})은 이미 추가된 종목입니다.`);
      return;
    }

    const newHolding: HoldingItem = {
      ticker: form.ticker,
      name: form.name,
      country: form.country,
      avgPrice: parseFloat(form.avgPrice.replace(/,/g, "")),
      quantity: parseInt(form.quantity.replace(/,/g, ""), 10),
      sectorManual: form.sectorManual,
      tags: form.tags,
    };

    setAccounts((prev) =>
      prev.map((acc, i) =>
        i === accIndex
          ? { ...acc, holdings: [...acc.holdings, newHolding] }
          : acc
      )
    );

    // 폼 초기화
    setHoldingForms((prev) => ({
      ...prev,
      [accIndex]: {
        ticker: "",
        name: "",
        country: "",
        avgPrice: "",
        quantity: "",
        sectorManual: "",
        tags: [],
      },
    }));
  }

  function removeHolding(accIndex: number, holdingIndex: number) {
    setAccounts((prev) =>
      prev.map((acc, i) =>
        i === accIndex
          ? { ...acc, holdings: acc.holdings.filter((_, j) => j !== holdingIndex) }
          : acc
      )
    );
  }

  // ─── 제출 ──────────────────────────────────────────────

  function buildAccountsPayload() {
    return accounts.map((acc) => ({
      accountCode: acc.accountCode,
      cashBalances: [
        ...(acc.cashKRW
          ? [{ currency: "KRW", amount: parseFloat(acc.cashKRW.replace(/,/g, "")) }]
          : []),
        ...(acc.cashUSD
          ? [{ currency: "USD", amount: parseFloat(acc.cashUSD.replace(/,/g, "")) }]
          : []),
      ],
      holdings: acc.holdings.map((h) => ({
        ticker: h.ticker,
        name: h.name,
        country: h.country,
        avgPrice: h.avgPrice,
        quantity: h.quantity,
        sectorManual: h.sectorManual || undefined,
        tags: h.tags.length > 0 ? h.tags : undefined,
      })),
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        accounts: buildAccountsPayload(),
        trade:
          trade.ticker && trade.price && trade.quantity
            ? {
                accountIndex: trade.accountIndex,
                ticker: trade.ticker,
                name: trade.name,
                type: trade.type,
                price: parseFloat(trade.price.replace(/,/g, "")),
                quantity: parseInt(trade.quantity.replace(/,/g, ""), 10),
                reasonTags: trade.reasonTags,
              }
            : undefined,
      };

      const res = await fetch("/api/onboarding/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "저장에 실패했습니다.");
        return;
      }

      router.push("/");
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step 1 렌더 ───────────────────────────────────────

  function renderStep1() {
    return (
      <>
        <div className="mb-2">
          <h2 className="text-lg font-bold" style={{ color: "#1A221A" }}>
            계좌 & 종목 등록
          </h2>
          <p className="text-xs mt-1" style={{ color: "#9AA99A" }}>
            보유 중인 계좌와 종목을 등록하세요. 나중에 추가할 수도 있어요.
          </p>
        </div>

        <div className="space-y-4">
          {accounts.map((acc, accIdx) => (
            <Card key={accIdx}>
              {/* 계좌 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-sm font-bold"
                  style={{ color: "#1A221A" }}
                >
                  계좌 {accIdx + 1}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setImportAccIdx(accIdx); setImportModalOpen(true); }}
                    disabled={!acc.accountCode}
                    className="text-xs px-2.5 py-1 rounded-lg font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#E8FAF2", color: "#05C072" }}
                  >
                    📷 캡처로 불러오기
                  </button>
                {accounts.length > 1 && (
                  <button
                    onClick={() => removeAccount(accIdx)}
                    className="text-xs"
                    style={{ color: "#F04452" }}
                  >
                    삭제
                  </button>
                )}
                </div>
              </div>

              {/* 증권사 선택 */}
              <div className="mb-4">
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "#6B7B6B" }}
                >
                  증권사
                </label>
                <button
                  type="button"
                  onClick={() => setBrokerageDropOpen(brokerageDropOpen === accIdx ? null : accIdx)}
                  className="w-full flex items-center justify-between pb-2 text-sm bg-transparent outline-none border-b cursor-pointer"
                  style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
                >
                  <span>{brokerages.find((b) => b.code === acc.accountCode)?.name ?? "증권사를 선택하세요"}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9AA99A]" style={{ transform: brokerageDropOpen === accIdx ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {brokerageDropOpen === accIdx && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#E4EAE4] bg-white shadow-lg">
                    {brokerages.map((b) => (
                      <button
                        key={b.code}
                        type="button"
                        onClick={() => selectBrokerage(accIdx, b.code)}
                        className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between"
                        style={{
                          backgroundColor: acc.accountCode === b.code ? "#E6F9F1" : "transparent",
                          color: acc.accountCode === b.code ? "#05C072" : "#1A221A",
                          fontWeight: acc.accountCode === b.code ? 600 : 400,
                          borderBottom: "1px solid #F0F4F0",
                        }}
                      >
                        <span>{b.name}</span>
                        {acc.accountCode === b.code && <span className="text-[#05C072]">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 예수금 */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "#6B7B6B" }}
                  >
                    예수금 (KRW)
                  </label>
                  <input
                    ref={(el) => { cashKRWRefs.current[accIdx] = el; }}
                    type="text"
                    inputMode="numeric"
                    value={fmtNum(acc.cashKRW)}
                    onChange={(e) =>
                      updateAccount(accIdx, "cashKRW", stripNum(e.target.value))
                    }
                    placeholder="선택사항"
                    disabled={!acc.accountCode}
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b disabled:opacity-40"
                    style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "#6B7B6B" }}
                  >
                    예수금 (USD)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fmtNum(acc.cashUSD)}
                    onChange={(e) =>
                      updateAccount(accIdx, "cashUSD", stripNum(e.target.value, true))
                    }
                    placeholder="선택사항"
                    disabled={!acc.accountCode}
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b disabled:opacity-40"
                    style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
                  />
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: "#9AA99A" }}>
                나중에 계좌 상세에서 입력할 수 있어요
              </p>

              {/* 종목 검색 & 추가 */}
              <div
                className={`rounded-xl p-4 mb-3 relative ${!acc.accountCode ? "opacity-40 pointer-events-none" : ""}`}
                style={{ backgroundColor: "#F5F7F5" }}
              >
                <StockSearch
                  onSelect={(result) => selectStock(accIdx, result)}
                  onClear={() => setHoldingForms((prev) => ({
                    ...prev,
                    [accIdx]: { ticker: "", name: "", country: "", avgPrice: "", quantity: "", sectorManual: "", tags: [] },
                  }))}
                  selected={getHoldingForm(accIdx).ticker ? { name: getHoldingForm(accIdx).name, ticker: getHoldingForm(accIdx).ticker } : undefined}
                  inputRef={(el) => { stockSearchRefs.current[accIdx] = el; }}
                />

                {/* 선택된 종목 표시 */}
                {getHoldingForm(accIdx).ticker && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag
                        label={getHoldingForm(accIdx).name}
                        color="green"
                      />
                      <span
                        className="text-xs"
                        style={{ color: "#9AA99A" }}
                      >
                        {getHoldingForm(accIdx).ticker}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label
                          className="block text-xs font-medium mb-1"
                          style={{ color: "#6B7B6B" }}
                        >
                          평단가
                        </label>
                        <input
                          ref={(el) => { avgPriceRefs.current[accIdx] = el; }}
                          type="text"
                          inputMode="numeric"
                          value={fmtNum(getHoldingForm(accIdx).avgPrice)}
                          onChange={(e) =>
                            updateHoldingForm(accIdx, "avgPrice", stripNum(e.target.value, true))
                          }
                          placeholder={priceLoadings[accIdx] ? "조회 중..." : "72,000"}
                          disabled={priceLoadings[accIdx]}
                          className="w-full pb-2 text-sm bg-transparent outline-none border-b"
                          style={{
                            borderColor: "#D4DDD4",
                            color: "#1A221A",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs font-medium mb-1"
                          style={{ color: "#6B7B6B" }}
                        >
                          수량
                        </label>
                        <input
                          ref={(el) => { quantityRefs.current[accIdx] = el; }}
                          type="text"
                          inputMode="numeric"
                          value={fmtNum(getHoldingForm(accIdx).quantity)}
                          onChange={(e) =>
                            updateHoldingForm(accIdx, "quantity", stripNum(e.target.value))
                          }
                          placeholder="50"
                          className="w-full pb-2 text-sm bg-transparent outline-none border-b"
                          style={{
                            borderColor: "#D4DDD4",
                            color: "#1A221A",
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label
                          className="block text-xs font-medium mb-1"
                          style={{ color: "#6B7B6B" }}
                        >
                          내 섹터
                        </label>
                        <input
                          type="text"
                          value={getHoldingForm(accIdx).sectorManual}
                          onChange={(e) =>
                            updateHoldingForm(
                              accIdx,
                              "sectorManual",
                              e.target.value
                            )
                          }
                          placeholder="선택사항"
                          className="w-full pb-2 text-sm bg-transparent outline-none border-b"
                          style={{
                            borderColor: "#D4DDD4",
                            color: "#1A221A",
                          }}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-medium mb-2" style={{ color: "#6B7B6B" }}>
                        태그
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {REASON_TAGS.map((tag) => (
                          <button
                            key={tag.label}
                            type="button"
                            onClick={() => toggleHoldingTag(accIdx, tag.label)}
                            className={`group relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              getHoldingForm(accIdx).tags.includes(tag.label)
                                ? "bg-[#05C072] text-white"
                                : "bg-[#E8EEE8] text-[#6B7B6B] hover:bg-[#D4DDD4]"
                            }`}
                            title={tag.desc}
                          >
                            {tag.label}
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-[#1A221A] text-white text-[10px] px-2 py-1 rounded-md z-10">
                              {tag.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => addHolding(accIdx)}
                      disabled={
                        !getHoldingForm(accIdx).avgPrice ||
                        !getHoldingForm(accIdx).quantity
                      }
                    >
                      추가
                    </Button>
                  </div>
                )}
              </div>

              {/* 등록된 종목 리스트 */}
              {acc.holdings.length > 0 && (
                <div className="space-y-2">
                  {acc.holdings.map((h, hIdx) => (
                    <div
                      key={hIdx}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ backgroundColor: "#F5F7F5" }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: "#1A221A" }}
                        >
                          {h.name}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "#9AA99A" }}
                        >
                          {h.avgPrice.toLocaleString()}원 · {h.quantity}주
                        </span>
                      </div>
                      <button
                        onClick={() => removeHolding(accIdx, hIdx)}
                        className="text-xs"
                        style={{ color: "#F04452" }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* 계좌 추가 */}
        <button
          onClick={addAccount}
          className="w-full mt-3 py-3 rounded-xl text-sm font-medium border border-dashed flex items-center justify-center gap-1"
          style={{ borderColor: "#D4DDD4", color: "#6B7B6B" }}
        >
          + 계좌 추가
        </button>
      </>
    );
  }

  // ─── Step 2 렌더 ───────────────────────────────────────

  function renderStep2() {
    return (
      <>
        <div className="mb-2">
          <h2 className="text-lg font-bold" style={{ color: "#1A221A" }}>
            첫 매매 기록
          </h2>
          <p className="text-xs mt-1" style={{ color: "#9AA99A" }}>
            최근 매매를 하나 기록해보세요. 건너뛰어도 괜찮아요.
          </p>
        </div>

        <Card>
          {/* 계좌 선택 */}
          {(() => {
            const validAccounts = accounts
              .map((acc, i) => ({ acc, i }))
              .filter(({ acc }) => acc.accountCode !== "");
            return (
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1" style={{ color: "#6B7B6B" }}>
                  계좌
                </label>
                <button
                  type="button"
                  onClick={() => validAccounts.length > 0 && setTradeAccountDropOpen(!tradeAccountDropOpen)}
                  className={`w-full flex items-center justify-between pb-2 text-sm bg-transparent outline-none border-b ${validAccounts.length === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
                >
                  <span style={{ color: trade.accountIndex === -1 ? "#9AA99A" : "#1A221A" }}>
                    {validAccounts.length === 0
                      ? "등록된 계좌가 없습니다"
                      : trade.accountIndex === -1
                      ? "계좌를 선택하세요"
                      : `${accounts[trade.accountIndex]?.accountName} (계좌 ${trade.accountIndex + 1})`}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9AA99A]" style={{ transform: tradeAccountDropOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {tradeAccountDropOpen && validAccounts.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#E4EAE4] bg-white shadow-lg">
                    {validAccounts.map(({ acc, i }) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setTrade((prev) => ({ ...prev, accountIndex: i })); setTradeAccountDropOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between"
                        style={{
                          backgroundColor: trade.accountIndex === i ? "#E6F9F1" : "transparent",
                          color: trade.accountIndex === i ? "#05C072" : "#1A221A",
                          fontWeight: trade.accountIndex === i ? 600 : 400,
                          borderBottom: "1px solid #F0F4F0",
                        }}
                      >
                        <span>{acc.accountName} (계좌 {i + 1})</span>
                        {trade.accountIndex === i && <span className="text-[#05C072]">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 계좌 미선택 시 하위 영역 비활성화 */}
          <div className={trade.accountIndex === -1 || accounts.length === 0 ? "opacity-40 pointer-events-none" : ""}>

          {/* 매수/매도 토글 */}
          <div className="flex gap-2 mb-4">
            {(["BUY", "SELL"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTrade((prev) => ({ ...prev, type: t }))}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor:
                    trade.type === t
                      ? t === "BUY"
                        ? "#F04452"
                        : "#4285F4"
                      : "#F0F4F0",
                  color: trade.type === t ? "#fff" : "#6B7B6B",
                }}
              >
                {t === "BUY" ? "매수" : "매도"}
              </button>
            ))}
          </div>

          {/* 종목 검색 */}
          <div className="mb-4">
            <StockSearch
              onSelect={(result) => selectTradeStock(result)}
              onClear={() => setTrade((prev) => ({ ...prev, ticker: "", name: "", price: "", quantity: "", reasonTags: [] }))}
              selected={trade.ticker ? { name: trade.name, ticker: trade.ticker } : undefined}
            />
          </div>

          {/* 가격 & 수량 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "#6B7B6B" }}
              >
                가격
              </label>
              <input
                ref={tradePriceRef}
                type="text"
                inputMode="numeric"
                value={fmtNum(trade.price)}
                onChange={(e) =>
                  setTrade((prev) => ({ ...prev, price: stripNum(e.target.value, true) }))
                }
                placeholder={tradePriceLoading ? "조회 중..." : "72,000"}
                disabled={tradePriceLoading}
                className="w-full pb-2 text-sm bg-transparent outline-none border-b"
                style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "#6B7B6B" }}
              >
                수량
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={fmtNum(trade.quantity)}
                onChange={(e) =>
                  setTrade((prev) => ({ ...prev, quantity: stripNum(e.target.value) }))
                }
                placeholder="50"
                className="w-full pb-2 text-sm bg-transparent outline-none border-b"
                style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
              />
            </div>
          </div>

          {/* 이유 태그 */}
          <div>
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: "#6B7B6B" }}
            >
              매매 이유 태그
            </label>
            <p className="text-xs mb-3" style={{ color: "#9AA99A" }}>
              이 태그들이 쌓이면 나만의 투자성향을 분석해줘요
            </p>
            <div className="flex flex-wrap gap-2">
              {REASON_TAGS.map((tag) => {
                const selected = trade.reasonTags.includes(tag.label);
                return (
                  <button
                    key={tag.label}
                    onClick={() =>
                      setTrade((prev) => ({
                        ...prev,
                        reasonTags: selected
                          ? prev.reasonTags.filter((t) => t !== tag.label)
                          : [...prev.reasonTags, tag.label],
                      }))
                    }
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: selected ? "#E6F9F1" : "#F0F4F0",
                      color: selected ? "#05C072" : "#6B7B6B",
                      border: selected
                        ? "1px solid #05C072"
                        : "1px solid transparent",
                    }}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          </div>{/* 비활성화 wrapper 끝 */}
        </Card>
      </>
    );
  }

  // ─── 메인 렌더 ─────────────────────────────────────────

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#F5F7F5" }}>
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ backgroundColor: "#F5F7F5" }}
    >
      {/* 캡처 불러오기 모달 */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onConfirm={(holdings, cashBalances) => applyImportResult(holdings, cashBalances, importAccIdx)}
      />
      <ConfirmDialog
        open={!!pendingBrokerageChange}
        title="증권사 정보가 변경되었습니다"
        message={"입력한 예수금 및 보유 종목 정보를\n초기화하시겠습니까?"}
        confirmLabel="초기화"
        cancelLabel="취소"
        onConfirm={() => {
          if (pendingBrokerageChange) {
            const { index, code } = pendingBrokerageChange;
            const brokerage = brokerages.find((b) => b.code === code);
            setAccounts((prev) => prev.map((acc, i) => i !== index ? acc : {
              ...acc,
              accountCode: code,
              accountName: brokerage?.name ?? code,
              cashKRW: "",
              cashUSD: "",
              holdings: [],
            }));
          }
          setPendingBrokerageChange(null);
        }}
        onCancel={() => {
          if (pendingBrokerageChange) {
            const { index, code } = pendingBrokerageChange;
            const brokerage = brokerages.find((b) => b.code === code);
            setAccounts((prev) => prev.map((acc, i) => i !== index ? acc : {
              ...acc,
              accountCode: code,
              accountName: brokerage?.name ?? code,
            }));
          }
          setPendingBrokerageChange(null);
        }}
      />

      {/* 토스트 */}
      <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl bg-[#F04452] min-w-[260px] max-w-[calc(100vw-40px)] transition-all duration-300 ${toast.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"}`}>
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-tight">{toast.title}</p>
          <p className="text-xs text-white/80 mt-0.5 leading-tight">{toast.message}</p>
        </div>
        <button onClick={() => setToast((p) => ({ ...p, visible: false }))} className="text-white/60 hover:text-white transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* 상단 헤더 */}
      <div
        className="w-full"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <div className="w-full max-w-2xl mx-auto px-5 pt-8 pb-4">
          <h1
            className="text-xl font-bold mb-1"
            style={{ color: "#1A221A" }}
          >
            InvestLog 시작하기
          </h1>
          <p className="text-xs" style={{ color: "#9AA99A" }}>
            Step {step} / 2
          </p>

          {/* 프로그레스 바 */}
          <div
            className="mt-3 h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: "#E8EEE8" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                backgroundColor: "#05C072",
                width: step === 1 ? "50%" : "100%",
              }}
            />
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 w-full max-w-2xl px-5 py-5 overflow-y-auto">
        {step === 1 ? renderStep1() : renderStep2()}
      </div>

      {/* 하단 버튼 */}
      <div
        className="w-full"
        style={{
          backgroundColor: "#FFFFFF",
          boxShadow: "0 -1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div className="w-full max-w-2xl mx-auto px-5 py-4 flex gap-3">
          {step === 1 ? (
            <>
              <Button
                variant="secondary"
                size="lg"
                onClick={async () => {
                  await fetch("/api/onboarding/bulk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accounts: [], trade: undefined }),
                  });
                  router.push("/");
                }}
                disabled={submitting}
              >
                건너뛰기
              </Button>
              <Button size="lg" onClick={() => {
                  // 종목 선택 후 추가 버튼 없이 가격/수량 미입력인 경우 차단
                  const incomplete = accounts.findIndex((_, i) => {
                    const form = getHoldingForm(i);
                    return form.ticker && (!form.avgPrice || !form.quantity);
                  });
                  if (incomplete !== -1) {
                    const form = getHoldingForm(incomplete);
                    const missingAvgPrice = !form.avgPrice;
                    showToast("입력 필요", `${form.name}의 ${missingAvgPrice ? "평단가" : "수량"}를 입력해주세요.`);
                    setTimeout(() => {
                      if (missingAvgPrice) avgPriceRefs.current[incomplete]?.focus();
                      else quantityRefs.current[incomplete]?.focus();
                    }, 50);
                    return;
                  }
                  // 추가 버튼을 누르지 않은 완성된 form은 자동으로 추가
                  accounts.forEach((_, i) => {
                    const form = getHoldingForm(i);
                    if (form.ticker && form.avgPrice && form.quantity) {
                      addHolding(i);
                    }
                  });
                  setStep(2);
                }}>
                다음
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setStep(1)}
              >
                이전
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={async () => {
                  const res = await fetch("/api/onboarding/bulk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accounts: buildAccountsPayload(), trade: undefined }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    showToast("저장 오류", err.error ?? "저장에 실패했습니다.");
                    return;
                  }
                  router.push("/");
                }}
                disabled={submitting}
              >
                건너뛰기
              </Button>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "저장 중..." : "완료"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
