"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Button,
  PnlTag,
  Tag,
  Input,
  Select,
  LoadingSpinner,
  EmptyState,
  BottomSheet,
  ConfirmDialog,
} from "@/components/ui";

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
}

interface AccountData {
  id: number;
  accountCode: string;
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

import { formatKRW, fmtNum, stripNum, formatCash } from "@/lib/format";

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
  const [formMemo, setFormMemo] = useState("");
  const [formCashKRW, setFormCashKRW] = useState("");
  const [formCashUSD, setFormCashUSD] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 수정 모달
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 삭제 확인
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountCode: formCode,
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
        fetchAccounts();
      }
    } catch {
      /* 생성 실패 */
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 수정 ──────────────────────────────────────────────

  function openEditModal(acc: AccountData) {
    setEditId(acc.id);
    setEditCode(acc.accountCode);
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
        setDeleteConfirm(null);
        fetchAccounts();
      }
    } catch {
      /* 실패 */
    } finally {
      setDeleting(false);
    }
  }

  // ─── 로딩 ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-[var(--color-border)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)] dark:text-[var(--color-text)]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] dark:text-[var(--color-text)]">
            계좌 관리
          </h1>
        </div>
        <div className="hidden md:block">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            + 계좌 추가
          </Button>
        </div>
      </div>

      {/* 계좌 목록 */}
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
            let invested = 0;
            acc.holdings.forEach((h) => {
              const quote = quotes[h.ticker];
              const curPrice = quote?.price || h.avgPrice;
              const isForeign = h.country !== "KR";
              invested += h.avgPrice * h.quantity * (isForeign ? usdRate : 1);
              if (isForeign) evalUSD += curPrice * h.quantity;
              else evalKRW += curPrice * h.quantity;
            });
            const totalKRW = evalKRW + evalUSD * usdRate + cashKRW + cashUSD * usdRate;
            const currentValue = evalKRW + evalUSD * usdRate;
            const pnlRate = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;

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
                        {typeLabel ? `${typeLabel} · ` : ""}{acc.holdings.length}종목
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <PnlTag value={pnlRate} />
                    <span className="text-[var(--color-g400)] dark:text-[var(--color-muted)] text-base">›</span>
                  </div>
                </div>

                {/* 예수금 · 평가금 · 합산 */}
                <div className="mt-3 pt-3 border-t border-[var(--color-g100)] dark:border-[var(--color-border)] space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">예수금</div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">평가금</div>
                    <div className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)]">합산(원화)</div>
                  </div>
                  {(cashKRW > 0 || evalKRW > 0) && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {cashKRW > 0 ? `₩${formatKRW(cashKRW)}` : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {evalKRW > 0 ? `₩${formatKRW(evalKRW)}` : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[var(--color-positive)]">
                        ₩{formatKRW(totalKRW)}
                      </div>
                    </div>
                  )}
                  {(cashUSD > 0 || evalUSD > 0) && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {cashUSD > 0 ? `$${cashUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[var(--color-text)] dark:text-[var(--color-text)]">
                        {evalUSD > 0 ? `$${evalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-[var(--color-g400)]">-</span>}
                      </div>
                      {cashKRW === 0 && evalKRW === 0 && (
                        <div className="text-xs font-bold text-[var(--color-positive)]">
                          ₩{formatKRW(totalKRW)}
                        </div>
                      )}
                    </div>
                  )}
                  {cashKRW === 0 && cashUSD === 0 && evalKRW === 0 && evalUSD === 0 && (
                    <div className="grid grid-cols-3 gap-2">
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
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-g100)] dark:bg-[var(--color-border)] text-[var(--color-g500)] dark:text-[var(--color-muted)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: acc.id, name: acc.brokerageCompany.name }); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-negative-soft)] dark:bg-[rgba(240,68,82,0.15)] text-[var(--color-negative)] hover:bg-[var(--color-negative-soft)] dark:hover:bg-[rgba(240,68,82,0.25)] transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
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
        message={`${deleteConfirm?.name ?? ""} 계좌의 보유 종목, 매매 기록, 예수금이 모두 삭제되며 복구할 수 없습니다.`}
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
