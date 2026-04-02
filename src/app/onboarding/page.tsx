"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Tag, LoadingSpinner } from "@/components/ui";

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

// ─── 증권사 목록 ─────────────────────────────────────────

const BROKERAGES = [
  { code: "KI", name: "키움증권" },
  { code: "MI", name: "미래에셋증권" },
  { code: "SA", name: "삼성증권" },
  { code: "NH", name: "NH투자증권" },
  { code: "KB", name: "KB증권" },
  { code: "HI", name: "한국투자증권" },
  { code: "TO", name: "토스증권" },
  { code: "SH", name: "신한투자증권" },
  { code: "DA", name: "대신증권" },
  { code: "EB", name: "이베스트투자증권" },
];

const REASON_TAGS = [
  "실적 호조",
  "저평가",
  "기술적 반등",
  "배당",
  "성장주",
  "FOMO",
  "분할매수",
  "손절",
  "익절",
  "리밸런싱",
];

// ─── 종목 검색 컴포넌트 ──────────────────────────────────

function StockSearch({
  onSelect,
}: {
  onSelect: (result: SearchResult) => void;
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
          setResults(data.results ?? []);
          setOpen(true);
        }
      } catch {
        /* 검색 실패 무시 */
      } finally {
        setSearching(false);
      }
    }, 300);
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

  // Step 1 — 계좌 & 종목
  const [accounts, setAccounts] = useState<AccountItem[]>([
    {
      accountCode: BROKERAGES[0].code,
      accountName: BROKERAGES[0].name,
      cashKRW: "",
      cashUSD: "",
      holdings: [],
    },
  ]);

  // 종목 추가 폼 상태 (계좌별)
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
        tags: string;
      }
    >
  >({});

  // Step 2 — 매매 기록
  const [trade, setTrade] = useState<TradeItem>({
    accountIndex: 0,
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
        accountCode: BROKERAGES[0].code,
        accountName: BROKERAGES[0].name,
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
          const brokerage = BROKERAGES.find((b) => b.code === value);
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
        tags: "",
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

  function selectStock(accIndex: number, result: SearchResult) {
    setHoldingForms((prev) => ({
      ...prev,
      [accIndex]: {
        ...getHoldingForm(accIndex),
        ticker: result.ticker,
        name: result.name,
        country: result.country,
      },
    }));
  }

  function addHolding(accIndex: number) {
    const form = getHoldingForm(accIndex);
    if (!form.ticker || !form.avgPrice || !form.quantity) return;

    const newHolding: HoldingItem = {
      ticker: form.ticker,
      name: form.name,
      country: form.country,
      avgPrice: parseFloat(form.avgPrice.replace(/,/g, "")),
      quantity: parseInt(form.quantity.replace(/,/g, ""), 10),
      sectorManual: form.sectorManual,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
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
        tags: "",
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

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        accounts: accounts.map((acc) => ({
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
        })),
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

              {/* 증권사 선택 */}
              <div className="mb-4">
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "#6B7B6B" }}
                >
                  증권사
                </label>
                <select
                  value={acc.accountCode}
                  onChange={(e) =>
                    updateAccount(accIdx, "accountCode", e.target.value)
                  }
                  className="w-full pb-2 text-sm bg-transparent outline-none border-b appearance-none"
                  style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
                >
                  {BROKERAGES.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
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
                    type="text"
                    inputMode="numeric"
                    value={acc.cashKRW}
                    onChange={(e) =>
                      updateAccount(accIdx, "cashKRW", e.target.value)
                    }
                    placeholder="선택사항"
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b"
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
                    value={acc.cashUSD}
                    onChange={(e) =>
                      updateAccount(accIdx, "cashUSD", e.target.value)
                    }
                    placeholder="선택사항"
                    className="w-full pb-2 text-sm bg-transparent outline-none border-b"
                    style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
                  />
                </div>
              </div>
              <p className="text-xs mb-5" style={{ color: "#9AA99A" }}>
                나중에 계좌 상세에서 입력할 수 있어요
              </p>

              {/* 종목 검색 & 추가 */}
              <div
                className="rounded-xl p-4 mb-3"
                style={{ backgroundColor: "#F5F7F5" }}
              >
                <StockSearch
                  onSelect={(result) => selectStock(accIdx, result)}
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
                          type="text"
                          inputMode="numeric"
                          value={getHoldingForm(accIdx).avgPrice}
                          onChange={(e) =>
                            updateHoldingForm(accIdx, "avgPrice", e.target.value)
                          }
                          placeholder="72,000"
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
                          type="text"
                          inputMode="numeric"
                          value={getHoldingForm(accIdx).quantity}
                          onChange={(e) =>
                            updateHoldingForm(accIdx, "quantity", e.target.value)
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
                      <div>
                        <label
                          className="block text-xs font-medium mb-1"
                          style={{ color: "#6B7B6B" }}
                        >
                          태그
                        </label>
                        <input
                          type="text"
                          value={getHoldingForm(accIdx).tags}
                          onChange={(e) =>
                            updateHoldingForm(accIdx, "tags", e.target.value)
                          }
                          placeholder="쉼표로 구분"
                          className="w-full pb-2 text-sm bg-transparent outline-none border-b"
                          style={{
                            borderColor: "#D4DDD4",
                            color: "#1A221A",
                          }}
                        />
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
          <div className="mb-4">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#6B7B6B" }}
            >
              계좌
            </label>
            <select
              value={trade.accountIndex}
              onChange={(e) =>
                setTrade((prev) => ({
                  ...prev,
                  accountIndex: parseInt(e.target.value, 10),
                }))
              }
              className="w-full pb-2 text-sm bg-transparent outline-none border-b appearance-none"
              style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
            >
              {accounts.map((acc, i) => (
                <option key={i} value={i}>
                  {acc.accountName} (계좌 {i + 1})
                </option>
              ))}
            </select>
          </div>

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
              onSelect={(result) =>
                setTrade((prev) => ({
                  ...prev,
                  ticker: result.ticker,
                  name: result.name,
                }))
              }
            />
            {trade.ticker && (
              <div className="flex items-center gap-2 mt-2">
                <Tag label={trade.name} color="green" />
                <span className="text-xs" style={{ color: "#9AA99A" }}>
                  {trade.ticker}
                </span>
              </div>
            )}
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
                type="text"
                inputMode="numeric"
                value={trade.price}
                onChange={(e) =>
                  setTrade((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="72,000"
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
                value={trade.quantity}
                onChange={(e) =>
                  setTrade((prev) => ({ ...prev, quantity: e.target.value }))
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
                const selected = trade.reasonTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setTrade((prev) => ({
                        ...prev,
                        reasonTags: selected
                          ? prev.reasonTags.filter((t) => t !== tag)
                          : [...prev.reasonTags, tag],
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
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </>
    );
  }

  // ─── 메인 렌더 ─────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ backgroundColor: "#F5F7F5" }}
    >
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
                onClick={() => {
                  // 건너뛰기 → 빈 상태로 바로 제출
                  setAccounts([]);
                  setStep(2);
                }}
              >
                건너뛰기
              </Button>
              <Button size="lg" onClick={() => setStep(2)}>
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
                onClick={handleSubmit}
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
