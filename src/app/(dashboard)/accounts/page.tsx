"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Button,
  PnlTag,
  Tag,
  Input,
  Select,
  LoadingSpinner,
  Skeleton,
  EmptyState,
  BottomSheet,
  ConfirmDialog,
  ThemeToggle,
  Toast,
} from "@/components/ui";
import SectorDonutChart from "@/components/SectorDonutChart";

// ─── 타입 ────────────────────────────────────────────────

interface CashBalance {
  currency: string;
  amount: number;
}

interface Holding {
  id: number;
  ticker: string;
  name: string;
  country: string;
  avgPrice: number;
  quantity: number;
  sectorAuto: string | null;
  sectorManual: string | null;
}

interface AccountData {
  id: number;
  accountCode: string;
  accountNumber: string | null;
  memo: string | null;
  brokerageCompany: { code: string; name: string };
  holdings: Holding[];
  cashBalances: CashBalance[];
}

// ─── 타입: 증권사 ────────────────────────────────────────

interface Brokerage {
  code: string;
  name: string;
}

interface QuoteResult {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

import { formatKRW, fmtNum, stripNum } from "@/lib/format";

// ─── 메인 페이지 ─────────────────────────────────────────

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [usdRate, setUsdRate] = useState(1400);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // URL 파라미터로 모달 자동 열기 (?add=true)
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setModalOpen(true);
    }
  }, [searchParams]);

  // 추가 모달 폼
  const [formCode, setFormCode] = useState("");
  const [formAccountNumber, setFormAccountNumber] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formCashKRW, setFormCashKRW] = useState("");
  const [formCashUSD, setFormCashUSD] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // 수정 모달
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 삭제 확인
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 토스트
  const [toast, setToast] = useState<{ title: string; message: string; visible: boolean; variant?: "success" | "error" }>({ title: "", message: "", visible: false });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(title: string, message: string, opts?: { variant?: "success" | "error" }) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, message, visible: true, variant: opts?.variant });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3500);
  }

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        const accList = Array.isArray(data) ? data : [];
        setAccounts(accList);

        // 현재가 + 환율 병렬 조회
        const tickers = new Set<string>();
        accList.forEach((acc: AccountData) =>
          acc.holdings.forEach((h) => tickers.add(h.ticker))
        );
        const tickerList = [...tickers];

        const [qRes, fxRes] = await Promise.all([
          tickerList.length > 0
            ? fetch(`/api/market/quote?tickers=${tickerList.join(",")}`)
            : null,
          fetch("/api/market/quote?ticker=USDKRW"),
        ]);

        if (qRes?.ok) {
          const qData = await qRes.json();
          const map: Record<string, QuoteResult> = {};
          (qData.quotes ?? []).forEach((q: QuoteResult) => { map[q.ticker] = q; });
          setQuotes(map);
        }
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          if (fxData.price) setUsdRate(fxData.price);
        }
      }
    } catch {
      /* 조회 실패 */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBrokerages = useCallback(async () => {
    try {
      const res = await fetch("/api/brokerages");
      if (res.ok) {
        const data: Brokerage[] = await res.json();
        const list = Array.isArray(data) ? data : [];
        setBrokerages(list);
        // 초기 1회만 설정 — 이미 선택된 값이 있으면 덮어쓰지 않음
        if (list.length > 0) setFormCode((prev) => prev || list[0].code);
      }
    } catch {
      /* 조회 실패 */
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchBrokerages();
  }, [fetchAccounts, fetchBrokerages]);

  async function handleAddAccount() {
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountCode: formCode,
          accountNumber: formAccountNumber || undefined,
          memo: formMemo || undefined,
          cashKRW: formCashKRW || undefined,
          cashUSD: formCashUSD || undefined,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setFormCode(brokerages.length > 0 ? brokerages[0].code : "");
        setFormMemo("");
        setFormCashKRW("");
        setFormCashUSD("");
        setFormError("");
        fetchAccounts();
        showToast("계좌 추가 완료", "새 계좌가 등록되었습니다.", { variant: "success" });
      } else {
        const data = await res.json();
        setFormError(data.error ?? "계좌 추가에 실패했습니다.");
      }
    } catch {
      setFormError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 수정 ──────────────────────────────────────────────

  function openEditModal(acc: AccountData) {
    setEditId(acc.id);
    setEditCode(acc.accountCode);
    setEditAccountNumber(acc.accountNumber ?? "");
    setEditMemo(acc.memo ?? "");
    setEditModal(true);
  }

  async function handleEditAccount() {
    if (!editId) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountCode: editCode,
          accountNumber: editAccountNumber || undefined,
          memo: editMemo,
        }),
      });
      if (res.ok) {
        setEditModal(false);
        fetchAccounts();
      }
    } catch {
      /* 실패 */
    } finally {
      setEditSubmitting(false);
    }
  }

  // ─── 삭제 ──────────────────────────────────────────────

  async function handleDeleteAccount() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const deletedName = deleteConfirm.name;
        setDeleteConfirm(null);
        fetchAccounts();
        showToast("계좌 삭제 완료", `${deletedName} 계좌가 삭제되었습니다.`, { variant: "success" });
      }
    } catch {
      /* 실패 */
    } finally {
      setDeleting(false);
    }
  }

  // ─── 로딩 ──────────────────────────────────────────────

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-5xl mx-auto px-5 py-6 pb-28 md:pb-6">
      {/* 토스트 */}
      <Toast
        title={toast.title}
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* 헤더 (항상 즉시 표시) */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-[var(--color-border)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)] dark:text-[var(--color-text)]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] dark:text-[var(--color-text)]">
            계좌 관리
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="md:hidden"><ThemeToggle /></div>
          <div className="hidden md:block">
            <Button size="sm" onClick={() => setModalOpen(true)}>
              + 계좌 추가
          </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="md:flex md:gap-6 md:items-start">
          <div className="md:flex-1 md:min-w-0 space-y-2.5">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-[42px] h-[42px] rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="w-32 h-4 rounded" />
                      <Skeleton className="w-20 h-3 rounded" />
                    </div>
                  </div>
                  <Skeleton className="w-16 h-6 rounded-lg" />
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--color-g100)] dark:border-[var(--color-border)]">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((j) => (<Skeleton key={j} className="w-full h-3 rounded" />))}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[0, 1, 2, 3].map((j) => (<Skeleton key={j} className="w-full h-4 rounded" />))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="hidden md:block md:w-[340px] md:shrink-0 space-y-3">
            <Skeleton className="w-20 h-4 rounded mb-3" />
            <Card><Skeleton className="h-[120px] w-full" /></Card>
            <Skeleton className="w-24 h-4 rounded mt-5 mb-3" />
            <Card><div className="flex justify-center py-6"><Skeleton className="w-40 h-40 rounded-full" /></div></Card>
          </div>
        </div>
      ) : (
      <>
      {/* PC: 2단 레이아웃 (좌: 계좌목록, 우: 차트) / 모바일: 세로 */}
      <div className="md:flex md:gap-6 md:items-start">
        {/* 좌측: 계좌 목록 */}
        <div className="md:flex-1 md:min-w-0">
      <h2 className="hidden md:block text-[13px] font-bold text-[var(--color-text)] mb-3">계좌 목록</h2>
      {accounts.length === 0 ? (
        <EmptyState message="아직 등록된 계좌가 없어요. 계좌를 추가해보세요." />
      ) : (
        <div className="space-y-2.5">
          {accounts.map((acc) => {
            const cashKRW = acc.cashBalances.find((c) => c.currency === "KRW")?.amount ?? 0;
            const cashUSD = acc.cashBalances.find((c) => c.currency === "USD")?.amount ?? 0;
            const hasKR = acc.holdings.some((h) => h.country === "KR");
            const hasForeign = acc.holdings.some((h) => h.country !== "KR");
            const typeLabel = hasKR && hasForeign ? "국내·해외" : hasKR ? "국내" : hasForeign ? "해외" : "";

            // 평가금액 계산
            let evalKRW = 0;
            let evalUSD = 0;
            let investedKRW = 0;
            let investedUSD = 0;
            acc.holdings.forEach((h) => {
              const quote = quotes[h.ticker];
              const curPrice = quote?.price || h.avgPrice;
              const isForeign = h.country !== "KR";
              if (isForeign) {
                investedUSD += h.avgPrice * h.quantity;
                evalUSD += curPrice * h.quantity;
              } else {
                investedKRW += h.avgPrice * h.quantity;
                evalKRW += curPrice * h.quantity;
              }
            });
            const invested = investedKRW + investedUSD * usdRate;
            const totalKRW = evalKRW + evalUSD * usdRate + cashKRW + cashUSD * usdRate;
            const currentValue = evalKRW + evalUSD * usdRate;
            const pnlRate = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
            const maxKRW = Math.max(investedKRW, cashKRW, evalKRW, totalKRW);
            const useOk = maxKRW >= 1_0000_0000;
            const fmtKRW = (v: number) =>
              useOk
                ? `₩${(Math.floor((v / 1_0000_0000) * 10) / 10).toLocaleString()}억`
                : `₩${Math.floor(v / 10000).toLocaleString()}만`;

            return (
              <Card key={acc.id}>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => router.push(`/accounts/${acc.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl bg-[var(--color-primary-soft)] dark:bg-[#1D3D2A]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h.01" /><path d="M2 10h20" /></svg>
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {acc.brokerageCompany.name}
                        {acc.memo && (
                          <span className="ml-1.5 text-xs font-normal text-[var(--color-g400)] dark:text-[var(--color-muted)]">
                            {acc.memo}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] mt-0.5">
                        {acc.accountNumber && <span className="mr-1.5">{acc.accountNumber} ·</span>}
                        {typeLabel ? `${typeLabel} · ` : ""}{acc.holdings.length}종목
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <PnlTag value={pnlRate} />
                    <span className="text-[var(--color-g400)] dark:text-[var(--color-muted)] text-base">›</span>
                  </div>
                </div>

                {/* 평가금 · 투자원금 · 예수금 · 합산 */}
                <div className="mt-3 pt-3 border-t border-[var(--color-g100)] dark:border-[var(--color-border)] space-y-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">평가금</div>
                    <div className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">투자원금</div>
                    <div className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">예수금</div>
                    <div className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">합산₩</div>
                  </div>
                  {(investedKRW > 0 || cashKRW > 0 || evalKRW > 0) && (
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {evalKRW > 0 ? fmtKRW(evalKRW) : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {investedKRW > 0 ? fmtKRW(investedKRW) : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {cashKRW > 0 ? fmtKRW(cashKRW) : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[var(--color-positive)]">
                        {fmtKRW(totalKRW)}
                      </div>
                    </div>
                  )}
                  {(investedUSD > 0 || cashUSD > 0 || evalUSD > 0) && (
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {evalUSD > 0 ? `$${evalUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {investedUSD > 0 ? `$${investedUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {cashUSD > 0 ? `$${cashUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      {investedKRW === 0 && cashKRW === 0 && evalKRW === 0 && (
                        <div className="text-xs font-bold text-[var(--color-positive)]">
                          {fmtKRW(totalKRW)}
                        </div>
                      )}
                    </div>
                  )}
                  {investedKRW === 0 && investedUSD === 0 && cashKRW === 0 && cashUSD === 0 && evalKRW === 0 && evalUSD === 0 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="text-xs text-[var(--color-g400)]">-</div>
                      <div className="text-xs text-[var(--color-g400)]">-</div>
                      <div className="text-xs text-[var(--color-g400)]">-</div>
                      <div className="text-xs font-bold text-[var(--color-positive)]">₩0</div>
                    </div>
                  )}
                </div>

                {/* 수정 / 삭제 버튼 */}
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[var(--color-g100)] dark:border-[var(--color-border)]">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(acc); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors cursor-pointer"
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: acc.id, name: acc.brokerageCompany.name }); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-negative-soft)] dark:bg-[rgba(240,68,82,0.15)] text-[var(--color-negative)] hover:bg-[var(--color-negative-soft)] dark:hover:bg-[rgba(240,68,82,0.25)] transition-colors cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
        </div>

        {/* 우측(PC) / 하단(모바일): 차트 */}
        {accounts.length > 0 && accounts.some((a) => a.holdings.length > 0) && (
          <div className="mt-6 md:mt-0 md:w-[340px] md:shrink-0 space-y-3 md:sticky md:top-6 md:self-start">
            {/* 계좌별 자산 비율 가로 막대 */}
            <h2 className="text-[13px] font-bold text-[var(--color-text)] mb-3">계좌별 비율</h2>
            <Card>
              {(() => {
                const COLORS = ["#05C072", "#4285F4", "#F07D05", "#8B5CF6", "#EC4899", "#06B6D4"];
                const accTotals = accounts.map((acc) => {
                  const cashKRW = acc.cashBalances.find((c) => c.currency === "KRW")?.amount ?? 0;
                  const cashUSD = acc.cashBalances.find((c) => c.currency === "USD")?.amount ?? 0;
                  let evalKRW = 0;
                  let evalUSD = 0;
                  acc.holdings.forEach((h) => {
                    const quote = quotes[h.ticker];
                    const curPrice = quote?.price || h.avgPrice;
                    if (h.country !== "KR") evalUSD += curPrice * h.quantity;
                    else evalKRW += curPrice * h.quantity;
                  });
                  return {
                    label: acc.brokerageCompany.name + (acc.memo ? ` ${acc.memo}` : ""),
                    total: evalKRW + evalUSD * usdRate + cashKRW + cashUSD * usdRate,
                  };
                });
                const grandTotal = accTotals.reduce((s, a) => s + a.total, 0);
                if (grandTotal === 0) return null;

                const maxTotal = Math.max(...accTotals.map((a) => a.total));

                return (
                  <div className="space-y-4">
                    {accTotals.map((a, i) => {
                      const pct = ((a.total / grandTotal) * 100).toFixed(1);
                      const barWidth = maxTotal > 0 ? (a.total / maxTotal) * 100 : 0;
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-medium text-[var(--color-text)]">{a.label}</span>
                            <span className="text-[13px] font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-5 rounded-lg overflow-hidden bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
                            <div
                              className="h-full rounded-lg transition-all"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: COLORS[i % COLORS.length],
                                opacity: 0.85,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>

            {/* 섹터별 도넛 차트 */}
            <h2 className="text-[13px] font-bold text-[var(--color-text)] mb-3 mt-5">전체 섹터 분포</h2>
            <Card>
              <SectorDonutChart
                holdings={accounts.flatMap((acc) =>
                  acc.holdings.map((h) => {
                    const quote = quotes[h.ticker];
                    const isForeign = h.country !== "KR";
                    return {
                      ticker: h.ticker,
                      name: h.name,
                      country: h.country,
                      avgPrice: h.avgPrice,
                      quantity: h.quantity,
                      sectorAuto: h.sectorAuto,
                      sectorManual: h.sectorManual,
                      currentPrice: quote?.price,
                      exchangeRate: isForeign ? usdRate : 1,
                    };
                  })
                )}
              />
            </Card>
          </div>
        )}
      </div>
      </>
      )}

      {/* 계좌 추가 바텀시트 */}
      <BottomSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="계좌 추가"
      >
        <div className="space-y-5">
          {/* 증권사 선택 */}
          <Select
            label="증권사"
            value={formCode}
            onChange={setFormCode}
            options={brokerages.map((b) => ({ value: b.code, label: b.name }))}
            placeholder="증권사를 선택하세요"
          />

          {/* 계좌번호 */}
          <Input
            label="계좌번호 (선택)"
            value={formAccountNumber}
            onChange={(e) => setFormAccountNumber(e.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="예: 12345678-01 (숫자, - 만 입력)"
            inputMode="numeric"
          />

          {/* 계좌명 */}
          <Input
            label="계좌명"
            value={formMemo}
            onChange={(e) => setFormMemo(e.target.value)}
            placeholder="예: 연금저축, 미국주식용 (선택사항)"
          />

          {/* 예수금 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="예수금 (KRW)"
              inputMode="numeric"
              value={fmtNum(formCashKRW)}
              onChange={(e) => setFormCashKRW(stripNum(e.target.value))}
              placeholder="선택사항"
            />
            <Input
              label="예수금 (USD)"
              inputMode="decimal"
              value={fmtNum(formCashUSD)}
              onChange={(e) => setFormCashUSD(stripNum(e.target.value, true))}
              placeholder="선택사항"
            />
          </div>

          {formError && (
            <p className="text-sm text-[var(--color-negative)] text-center -mt-1">{formError}</p>
          )}

          <Button
            size="lg"
            onClick={handleAddAccount}
            disabled={submitting}
          >
            {submitting ? "추가 중..." : "계좌 추가"}
          </Button>
        </div>
      </BottomSheet>

      {/* 계좌 수정 바텀시트 */}
      <BottomSheet
        open={editModal}
        onClose={() => setEditModal(false)}
        title="계좌 수정"
      >
        <div className="space-y-5">
          {/* 증권사 선택 */}
          <Select
            label="증권사"
            value={editCode}
            onChange={setEditCode}
            options={brokerages.map((b) => ({ value: b.code, label: b.name }))}
            placeholder="증권사를 선택하세요"
          />

          {/* 계좌번호 */}
          <Input
            label="계좌번호 (선택)"
            value={editAccountNumber}
            onChange={(e) => setEditAccountNumber(e.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="예: 12345678-01 (숫자, - 만 입력)"
            inputMode="numeric"
          />

          {/* 계좌명 */}
          <Input
            label="계좌명"
            value={editMemo}
            onChange={(e) => setEditMemo(e.target.value)}
            placeholder="예: 연금저축, 미국주식용 (선택사항)"
          />

          <Button size="lg" onClick={handleEditAccount} disabled={editSubmitting}>
            {editSubmitting ? "수정 중..." : "수정 완료"}
          </Button>
        </div>
      </BottomSheet>

      {/* 삭제 확인 모달 */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        title="계좌를 삭제할까요?"
        message={`${deleteConfirm?.name ?? ""} 계좌의 보유 종목, 매매 기록, 예수금이\n모두 삭제되며 복구할 수 없습니다.`}
        confirmLabel="삭제"
        destructive
        confirmLoading={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* 모바일 FAB */}
      <button
        onClick={() => setModalOpen(true)}
        className="md:hidden fixed bottom-24 right-5 w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white text-2xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/30 z-40 active:scale-95 transition-transform cursor-pointer"
      >
        +
      </button>
    </div>
  );
}
