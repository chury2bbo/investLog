"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Tag,
  SectionTitle,
  LoadingSpinner,
  EmptyState,
  Divider,
  ThemeToggle,
  Toast,
  DatePicker,
} from "@/components/ui";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── 용어 설명 툴팁 ─────────────────────────────────────

const TERM_TOOLTIPS: Record<string, string> = {
  "PER": "주가수익비율. 주가가 1주당 순이익의 몇 배인지 나타내요. 낮을수록 저평가 가능성이 있어요.",
  "PBR": "주가순자산비율. 주가가 1주당 순자산의 몇 배인지 나타내요. 1 미만이면 장부가보다 싸게 거래 중이에요.",
  "ROE": "자기자본이익률. 투입한 자본 대비 얼마나 벌었는지 나타내요. 높을수록 경영 효율이 좋아요.",
  "52주 최고": "최근 1년간 가장 높았던 주가예요. 현재가와 비교해서 고점 대비 위치를 파악할 수 있어요.",
  "52주 최저": "최근 1년간 가장 낮았던 주가예요. 현재가와 비교해서 바닥 대비 위치를 파악할 수 있어요.",
  "Fwd PER": "올해 예상 실적 기준 PER이에요. 미래 수익성을 반영하므로 일반 PER보다 실질적이에요.",
  "MDD": "최대낙폭(Maximum Drawdown). 고점 대비 최대 하락폭이에요. -30%면 최악의 시기에 30% 손실 가능했다는 뜻이에요.",
};

function TermLabel({ term }: { term: string }) {
  const [show, setShow] = useState(false);
  const tooltip = TERM_TOOLTIPS[term];
  if (!tooltip) return <span>{term}</span>;

  return (
    <span className="relative inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setShow((p) => !p); }}
        className="w-3.5 h-3.5 rounded-full bg-[var(--color-g200)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] text-[9px] font-bold flex items-center justify-center hover:bg-[var(--color-g300)] transition-colors cursor-pointer shrink-0"
      >
        ?
      </button>
      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-52 p-2.5 rounded-xl bg-[var(--color-text)] dark:bg-[var(--color-surface)] text-white dark:text-[var(--color-text)] text-[11px] leading-relaxed shadow-lg">
            {tooltip}
          </div>
        </>
      )}
    </span>
  );
}

// ─── 타입 ────────────────────────────────────────────────

interface SearchResult {
  ticker: string;
  name: string;
  market: string;
  country: string;
}

interface QuoteData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  per?: number | null;
  pbr?: number | null;
  roe?: number | null;
  forwardPer?: number | null;
  forwardPbr?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
}

interface SummaryData {
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  summary: string;
}

interface ReportData {
  recommendation: string;
  targetBuy: string;
  targetSell: string;
  swotStrength: string;
  swotWeakness: string;
  swotOpportunity: string;
  swotThreat: string;
  reasoning: string;
  recentIssues?: string;
  cachedDate?: string;
}

interface HistoryPoint {
  date: string;
  close: number;
}

interface MddPoint {
  date: string;
  close: number;
  mdd: number;
}

// ─── 유틸 ────────────────────────────────────────────────

import { formatPrice } from "@/lib/format";

function calcMdd(data: HistoryPoint[]): MddPoint[] {
  if (data.length === 0) return [];
  let peak = data[0].close;
  return data.map((d) => {
    if (d.close > peak) peak = d.close;
    const mdd = ((d.close - peak) / peak) * 100;
    return { date: d.date, close: d.close, mdd: Math.round(mdd * 100) / 100 };
  });
}

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// ─── 메인 페이지 ─────────────────────────────────────────

export default function AnalysisPage() {
  const router = useRouter();
  // 검색
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectIdRef = useRef(0);

  // 선택된 종목
  const [selected, setSelected] = useState<SearchResult | null>(null);

  // 이전 분석 이력
  const [prevAnalyses, setPrevAnalyses] = useState<{ ticker: string; name: string; country: string; createdAt: string }[]>([]);
  const [showPrevAnalyses, setShowPrevAnalyses] = useState(false);

  // 데이터
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportCached, setReportCached] = useState(false);
  const [reportFallback, setReportFallback] = useState(false);
  const [reportUsage, setReportUsage] = useState<{ count: number; limit: number } | null>(null);
  const [history, setHistory] = useState<MddPoint[]>([]);

  // 로딩
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 토스트
  const [toast, setToast] = useState<{ title: string; message: string; visible: boolean; variant?: "success" | "error" }>({ title: "", message: "", visible: false });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(title: string, message: string, opts?: { variant?: "success" | "error" }) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, message, visible: true, variant: opts?.variant });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3500);
  }

  // MDD 기간
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  // ─── 검색 자동완성 ────────────────────────────────────

  const handleSearch = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(val)}&country=ALL`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
          setShowDropdown(true);
        }
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300);
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // activeIndex 변경 시 포커스 이동
  useEffect(() => {
    if (activeIndex === -1) {
      inputRef.current?.focus();
    } else {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex]);

  // 검색 결과 바뀌면 선택 초기화
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // ─── 종목 선택 → 데이터 로딩 ─────────────────────────

  function clearStock() {
    setSelected(null);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setQuote(null);
    setSummary(null);
    setReport(null);
    setHistory([]);
  }

  async function selectStock(stock: SearchResult) {
    const id = ++selectIdRef.current;
    setSelected(stock);
    setQuery("");
    setShowDropdown(false);
    setActiveIndex(-1);
    setReport(null);

    // 분석 사용량 조회
    fetch("/api/analysis/usage")
      .then((r) => r.json())
      .then((d) => { if (d.count !== undefined) setReportUsage(d); })
      .catch(() => {});

    // 사용자 분석 이력 기록
    fetch("/api/analysis/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: stock.ticker, name: stock.name, country: stock.country ?? "KR" }),
    }).catch(() => {
      /* 분석 이력 기록 실패는 무시 */
    });

    // 현재가 + 투자지표 조회
    setQuoteLoading(true);
    fetch(`/api/market/quote?tickers=${stock.ticker}&detailed=true`)
      .then((r) => r.json())
      .then((d) => {
        if (selectIdRef.current !== id) return;
        const q = (d.quotes ?? [])[0];
        if (q) setQuote(q);
      })
      .catch(() => {})
      .finally(() => { if (selectIdRef.current === id) setQuoteLoading(false); });

    // AI 기업 소개
    setSummaryLoading(true);
    setSummary(null);
    fetch(`/api/analysis/summary?ticker=${stock.ticker}`)
      .then((r) => r.json())
      .then((d) => {
        if (selectIdRef.current !== id) return;
        if (d.summary) {
          try {
            const parsed = typeof d.summary === "string" ? JSON.parse(d.summary) : d.summary;
            setSummary(parsed);
          } catch {
            setSummary(null);
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (selectIdRef.current === id) setSummaryLoading(false); });

    // MDD 차트 데이터
    fetchHistory(stock.ticker, startDate, endDate);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && showDropdown && results.length > 0) {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, i: number, stock: SearchResult) {
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

  async function fetchHistory(ticker: string, start: string, end: string) {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/market/history?ticker=${ticker}&start=${start}&end=${end}`);
      if (res.ok) {
        const d = await res.json();
        setHistory(calcMdd(d.data ?? []));
      }
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  }

  // ─── AI 분석 리포트 생성 ──────────────────────────────

  async function generateReport() {
    if (!selected) return;
    setReportLoading(true);
    try {
      const res = await fetch(`/api/analysis/report?ticker=${selected.ticker}&name=${encodeURIComponent(selected.name)}&country=${selected.country ?? "KR"}`);
      const d = await res.json();
      if (res.ok) {
        setReport(d.report ?? null);
        setReportCached(d.cached ?? false);
        setReportFallback(d.fallback ?? false);
        if (d.usage) setReportUsage(d.usage);
      } else {
        showToast("분석 실패", d.error ?? "AI 분석 리포트를 생성할 수 없습니다.", { variant: "error" });
      }
    } catch {
      showToast("네트워크 오류", "서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.", { variant: "error" });
    } finally {
      setReportLoading(false);
    }
  }

  // ─── MDD 차트 기간 변경 ───────────────────────────────

  function handleDateChange() {
    if (selected) {
      fetchHistory(selected.ticker, startDate, endDate);
    }
  }

  // MDD 최솟값
  const minMdd = history.length > 0 ? Math.min(...history.map((h) => h.mdd)) : 0;

  // 추천 색상
  const recColor =
    report?.recommendation === "BUY"
      ? "var(--color-positive)"
      : report?.recommendation === "SELL"
        ? "var(--color-negative)"
        : "var(--color-warning)";

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6 animate-[fadeIn_0.4s_ease-out]">
      {/* 토스트 */}
      <Toast
        title={toast.title}
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-transparent hover:bg-[var(--color-g200)] dark:hover:bg-[var(--color-border)] transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)]">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
            종목 분석
          </h1>
        </div>
        <div className="md:hidden"><ThemeToggle /></div>
      </div>

      {/* ── 이전 분석 불러오기 ── */}
      {!selected && (
        <div className="mb-3">
          <button
            type="button"
            onClick={async () => {
              if (showPrevAnalyses) {
                setShowPrevAnalyses(false);
                return;
              }
              try {
                const res = await fetch("/api/analysis/history");
                if (res.ok) {
                  const data = await res.json();
                  setPrevAnalyses(Array.isArray(data) ? data : []);
                }
              } catch { /* ignore */ }
              setShowPrevAnalyses(true);
            }}
            className="text-sm font-semibold cursor-pointer"
            style={{ color: "var(--color-primary)" }}
          >
            {showPrevAnalyses ? "닫기" : "이전 분석 불러오기 →"}
          </button>

          {showPrevAnalyses && prevAnalyses.length > 0 && (
            <div className="mt-2 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] overflow-hidden">
              {prevAnalyses.map((item) => (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => {
                    selectStock({ ticker: item.ticker, name: item.name, market: "", country: item.country });
                    setShowPrevAnalyses(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] transition-colors flex items-center justify-between border-b border-[var(--color-g100)] dark:border-[var(--color-border)] last:border-0 cursor-pointer"
                >
                  <div>
                    <span className="font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">{item.name}</span>
                    <span className="ml-2 text-xs text-[var(--color-g400)]">{item.ticker}</span>
                  </div>
                  <Tag label={item.country === "KR" ? "국내" : "해외"} color={item.country === "KR" ? "green" : "blue"} />
                </button>
              ))}
            </div>
          )}

          {showPrevAnalyses && prevAnalyses.length === 0 && (
            <p className="mt-2 text-xs text-[var(--color-g400)]">이전 분석 이력이 없습니다.</p>
          )}
        </div>
      )}

      {/* ── ① 종목 검색 ── */}
      <div ref={searchRef} className="relative mb-6">
        {selected ? (
          /* 선택된 종목 표시 */
          <div className="flex items-center justify-between pb-2 border-b-2 border-[var(--color-primary)]">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <span className="text-sm font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">{selected.name}</span>
              <span className="text-xs text-[var(--color-g400)]">{selected.ticker}</span>
              <Tag label={selected.country === "KR" ? "국내" : "해외"} color={selected.country === "KR" ? "green" : "blue"} />
            </div>
            <button
              type="button"
              onClick={clearStock}
              className="text-xl leading-none text-[var(--color-g400)] hover:text-[var(--color-negative)] transition-colors"
            >
              ×
            </button>
          </div>
        ) : (
          /* 검색 입력 */
          <>
            <div className="flex items-center gap-2 border-b-2 border-[var(--color-primary)] pb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                onKeyDown={handleInputKeyDown}
                placeholder="종목명 또는 티커 검색 (예: 삼성전자, AAPL)"
                className="flex-1 text-sm bg-transparent outline-none text-[var(--color-text)] dark:text-[var(--color-text)] placeholder:text-[var(--color-g400)] dark:placeholder:text-[var(--color-g600)]"
              />
              {searching && <LoadingSpinner size={16} />}
            </div>

            {showDropdown && results.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)] shadow-lg z-50 max-h-64 overflow-y-auto">
                {results.map((r, i) => (
                  <button
                    key={`${r.ticker}-${r.country}`}
                    ref={(el) => { itemRefs.current[i] = el; }}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectStock(r); }}
                    onKeyDown={(e) => handleItemKeyDown(e, i, r)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)] focus:bg-[var(--color-g100)] dark:focus:bg-[var(--color-border)] outline-none transition-colors flex items-center justify-between border-b border-[var(--color-g100)] dark:border-[var(--color-border)] last:border-0"
                  >
                    <div>
                      <span className="font-semibold text-[var(--color-text)] dark:text-[var(--color-text)]">{r.name}</span>
                      <span className="ml-2 text-xs text-[var(--color-g400)]">{r.ticker}</span>
                    </div>
                    <Tag label={r.country === "KR" ? "국내" : "해외"} color={r.country === "KR" ? "green" : "blue"} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 미선택 시 */}
      {!selected && (
        <EmptyState message="분석할 종목을 검색해주세요." />
      )}

      {/* ── ② 기업 소개 카드 ── */}
      {selected && (
        <div className="mb-4">
          <SectionTitle title="기업 소개" />
          <Card>
            {summaryLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size={24} />
              </div>
            ) : summary ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                    {summary.name || selected.name}
                  </span>
                  <Tag label={selected.country === "KR" ? "국내" : "해외"} color={selected.country === "KR" ? "green" : "blue"} />
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {summary.exchange && <Tag label={summary.exchange} color="gray" />}
                  {summary.sector && <Tag label={summary.sector} color="gray" />}
                  {summary.industry && <Tag label={summary.industry} color="gray" />}
                </div>
                <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] leading-relaxed">
                  {summary.summary}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                    {selected.name}
                  </span>
                  <Tag label={selected.country === "KR" ? "국내" : "해외"} color={selected.country === "KR" ? "green" : "blue"} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Tag label={selected.ticker} color="gray" />
                  <Tag label={selected.market} color="gray" />
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── ③ 기본 지표 ── */}
      {selected && (
        <div className="mb-4">
          <SectionTitle title="기본 지표" />
          <Card>
            {quoteLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size={24} />
              </div>
            ) : quote ? (
              <div className="space-y-4">
                {/* 현재가 · 등락률 · 전일대비 */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-1">현재가</div>
                    <div className="text-lg font-extrabold text-[var(--color-text)]">
                      {formatPrice(quote.price, selected.country)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-1">등락률</div>
                    <div className={`text-lg font-extrabold ${quote.changePercent >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>
                      {quote.changePercent >= 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-1">전일대비</div>
                    <div className={`text-sm font-bold ${quote.change >= 0 ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>
                      {quote.change >= 0 ? "+" : ""}{formatPrice(Math.abs(quote.change), selected.country)}
                    </div>
                  </div>
                </div>

                {/* 구분선 */}
                <div className="border-t border-[var(--color-g100)] dark:border-[var(--color-border)]" />

                {/* 투자 지표 3열 2행 */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-1"><TermLabel term="PER" /></div>
                    <div className="text-sm font-bold text-[var(--color-text)]">
                      {quote.per != null ? quote.per.toFixed(1) : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-1"><TermLabel term="PBR" /></div>
                    <div className="text-sm font-bold text-[var(--color-text)]">
                      {quote.pbr != null ? quote.pbr.toFixed(2) : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-1"><TermLabel term="ROE" /></div>
                    <div className="text-sm font-bold text-[var(--color-text)]">
                      {quote.roe != null ? `${quote.roe.toFixed(1)}%` : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-1"><TermLabel term="52주 최고" /></div>
                    <div className="text-sm font-bold text-[var(--color-positive)]">
                      {quote.fiftyTwoWeekHigh != null ? formatPrice(quote.fiftyTwoWeekHigh, selected.country) : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-1"><TermLabel term="52주 최저" /></div>
                    <div className="text-sm font-bold text-[var(--color-negative)]">
                      {quote.fiftyTwoWeekLow != null ? formatPrice(quote.fiftyTwoWeekLow, selected.country) : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-1"><TermLabel term="Fwd PER" /></div>
                    <div className="text-sm font-bold text-[var(--color-text)]">
                      {quote.forwardPer != null ? quote.forwardPer.toFixed(1) : "-"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-center text-[var(--color-g400)] py-4">시세 정보를 불러올 수 없습니다.</p>
            )}
          </Card>
        </div>
      )}

      {/* ── ④ MDD 차트 ── */}
      {selected && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <h2 className="text-[15px] font-bold text-[var(--color-text)]">MDD 차트</h2>
            <span className="text-[11px] text-[var(--color-g400)]"><TermLabel term="MDD" /></span>
          </div>
          <Card>
            {/* 기간 입력 */}
            <div className="flex items-center gap-2 mb-4">
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                inputClassName="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)] text-[var(--color-text)] outline-none cursor-pointer"
                wrapperClassName="flex-1"
                maxDate={new Date()}
              />
              <span className="text-xs text-[var(--color-g400)]">~</span>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                inputClassName="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--color-g200)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-card)] text-[var(--color-text)] outline-none cursor-pointer"
                wrapperClassName="flex-1"
                maxDate={new Date()}
              />
              <Button size="sm" onClick={handleDateChange}>
                조회
              </Button>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner size={24} />
              </div>
            ) : history.length > 0 ? (
              <>
                {/* 주가 라인 차트 */}
                <div className="text-[11px] text-[var(--color-g400)] mb-1">주가</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={history} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--color-g400)" }}
                      tickFormatter={(v) => v.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-g400)" }}
                      tickFormatter={(v) => selected.country === "KR" ? `${(v / 1000).toFixed(0)}K` : `$${v}`}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)", backgroundColor: "var(--color-tooltip)", color: "var(--color-text)" }}
                      labelStyle={{ color: "var(--color-text)" }}
                      itemStyle={{ color: "var(--color-text)" }}
                      formatter={(v: unknown) => [formatPrice(v as number, selected.country), "주가"]}
                      labelFormatter={(l) => l}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="var(--color-positive)"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* MDD 영역 차트 */}
                <div className="text-[11px] text-[var(--color-g400)] mb-1 mt-3">MDD (최대 낙폭)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={history} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--color-g400)" }}
                      tickFormatter={(v) => v.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-g400)" }}
                      tickFormatter={(v) => `${v}%`}
                      domain={["auto", 0]}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)", backgroundColor: "var(--color-tooltip)", color: "var(--color-text)" }}
                      labelStyle={{ color: "var(--color-text)" }}
                      itemStyle={{ color: "var(--color-text)" }}
                      formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, "MDD"]}
                      labelFormatter={(l) => l}
                    />
                    <ReferenceLine y={0} stroke="var(--color-g200)" />
                    <Area
                      type="monotone"
                      dataKey="mdd"
                      stroke="var(--color-negative)"
                      fill="var(--color-negative)"
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* 자연어 해석 */}
                <div className="mt-3 px-3 py-2.5 rounded-xl bg-[var(--color-negative-soft)] dark:bg-(--color-negative-overlay)">
                  <p className="text-sm text-[var(--color-negative)] font-medium">
                    이 기간 내 최대 <strong>{minMdd.toFixed(1)}%</strong> 하락한 적이 있어요
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-center text-[var(--color-g400)] py-8">차트 데이터를 불러올 수 없습니다.</p>
            )}
          </Card>
        </div>
      )}

      {/* ── ⑤ AI 종목 분석 리포트 ── */}
      {selected && (
        <div className="mb-4">
          <SectionTitle title="AI 종목 분석" />

          {!report && !reportLoading && (
            <Card>
              <div className="text-center py-4">
                <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-4">
                  AI가 {selected.name}({selected.ticker})을 분석합니다
                </p>
                <Button size="lg" onClick={generateReport} disabled={reportLoading}>
                  분석 생성{reportUsage ? ` (잔여 ${reportUsage.limit - reportUsage.count}회)` : ""}
                </Button>
              </div>
            </Card>
          )}

          {reportLoading && (
            <Card>
              <div className="flex flex-col items-center py-8 gap-3">
                <LoadingSpinner size={28} />
                <p className="text-sm text-[var(--color-g400)]">AI가 분석 중입니다...</p>
              </div>
            </Card>
          )}

          {report && !reportLoading && (
            <div className="space-y-2.5">
              {/* 추천 + 적정가 */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">투자 의견</span>
                    {report.cachedDate && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-g400)]">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                          {reportFallback ? "지표 기반 분석" : "Claude AI"} · {report.cachedDate} 분석{reportCached ? " (캐시)" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: recColor }}
                  >
                    {report.recommendation}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3 bg-[var(--color-primary-soft)] dark:bg-(--color-primary-overlay)">
                    <div className="text-[11px] text-[var(--color-positive)] mb-1">적정 매수가</div>
                    <div className="text-base font-bold text-[var(--color-positive)]">{report.targetBuy.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                  </div>
                  <div className="rounded-xl p-3 bg-[var(--color-negative-soft)] dark:bg-(--color-negative-overlay)">
                    <div className="text-[11px] text-[var(--color-negative)] mb-1">적정 매도가</div>
                    <div className="text-base font-bold text-[var(--color-negative)]">{report.targetSell.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                  </div>
                </div>
              </Card>

              {/* SWOT */}
              <Card>
                <div className="text-sm font-bold text-[var(--color-text)] dark:text-[var(--color-text)] mb-3">SWOT 분석</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl p-3 bg-[var(--color-primary-soft)] dark:bg-(--color-primary-overlay)">
                    <div className="text-[11px] font-bold text-[var(--color-positive)] mb-1">S 강점</div>
                    <p className="text-xs text-[var(--color-text)] dark:text-[var(--color-text)] leading-relaxed">{report.swotStrength}</p>
                  </div>
                  <div className="rounded-xl p-3 bg-[var(--color-negative-soft)] dark:bg-(--color-negative-overlay)">
                    <div className="text-[11px] font-bold text-[var(--color-negative)] mb-1">W 약점</div>
                    <p className="text-xs text-[var(--color-text)] dark:text-[var(--color-text)] leading-relaxed">{report.swotWeakness}</p>
                  </div>
                  <div className="rounded-xl p-3 bg-(--color-foreign-bg) dark:bg-(--color-blue-overlay)">
                    <div className="text-[11px] font-bold text-(--color-foreign) mb-1">O 기회</div>
                    <p className="text-xs text-[var(--color-text)] dark:text-[var(--color-text)] leading-relaxed">{report.swotOpportunity}</p>
                  </div>
                  <div className="rounded-xl p-3 bg-(--color-threat-light) dark:bg-(--color-warning-overlay)">
                    <div className="text-[11px] font-bold text-[var(--color-warning)] mb-1">T 위협</div>
                    <p className="text-xs text-[var(--color-text)] dark:text-[var(--color-text)] leading-relaxed">{report.swotThreat}</p>
                  </div>
                </div>
              </Card>

              {/* 종합 의견 */}
              <Card>
                <div className="text-sm font-bold text-[var(--color-text)] dark:text-[var(--color-text)] mb-2">종합 투자 의견</div>
                <div className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] leading-relaxed space-y-2">
                  {report.reasoning.split("\n").map((line, i) => {
                    const isHeading = line.startsWith("【");
                    const isBullet = line.startsWith("•");
                    if (isHeading) {
                      return <div key={i} className="font-semibold text-[var(--color-text)] dark:text-[var(--color-text)] mt-2 first:mt-0">{line}</div>;
                    }
                    if (isBullet) {
                      return <div key={i} className="pl-3">{line}</div>;
                    }
                    if (line.trim() === "") return null;
                    return <div key={i} className="pl-3">{line}</div>;
                  })}
                </div>
              </Card>

              {/* 최근 이슈 */}
              {report.recentIssues && (() => {
                const text = report.recentIssues;
                const positiveMatch = text.match(/호재\s*[::]\s*([\s\S]*?)(?=\s*악재\s*[::]|$)/);
                const negativeMatch = text.match(/악재\s*[::]\s*([\s\S]*?)$/);
                const positive = positiveMatch?.[1]?.trim();
                const negative = negativeMatch?.[1]?.trim();
                const hasParsed = positive || negative;

                return (
                  <Card>
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="text-sm font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">최근 주요 이슈</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${reportFallback ? "bg-(--color-primary-soft) text-(--color-primary)" : "bg-(--color-threat-light) dark:bg-(--color-warning-overlay) text-[var(--color-warning)]"}`}>
                        {reportFallback ? "뉴스 기반" : "AI 학습 기반"}
                      </span>
                    </div>

                    {hasParsed ? (
                      <div className="space-y-2.5">
                        {positive && (
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-(--color-positive-light) dark:bg-(--color-positive-badge) text-[var(--color-positive)]">
                              호재
                            </span>
                            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] leading-relaxed flex-1">
                              {positive}
                            </p>
                          </div>
                        )}
                        {negative && (
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-(--color-negative-light) dark:bg-(--color-negative-badge) text-[var(--color-negative)]">
                              악재
                            </span>
                            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] leading-relaxed flex-1">
                              {negative}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {text.split("\n").map((line, i) => {
                          // "1. 제목|URL" 형식 파싱
                          const pipeIdx = line.indexOf("|");
                          if (pipeIdx > -1 && line.match(/^\d+\.\s/)) {
                            const title = line.slice(0, pipeIdx);
                            const url = line.slice(pipeIdx + 1);
                            if (url && url.startsWith("http")) {
                              return (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-sm text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80 transition-opacity">
                                  {title}
                                </a>
                              );
                            }
                            return <p key={i} className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">{title}</p>;
                          }
                          return <p key={i} className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">{line}</p>;
                        })}
                      </div>
                    )}
                  </Card>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
