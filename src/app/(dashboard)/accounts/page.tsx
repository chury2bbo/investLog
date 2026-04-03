"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  PnlTag,
  Tag,
  LoadingSpinner,
  EmptyState,
  BottomSheet,
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

// ─── 유틸 ────────────────────────────────────────────────

function formatKRW(value: number): string {
  if (Math.abs(value) >= 1_0000_0000) return `${Math.floor((value / 1_0000_0000) * 10) / 10}억`;
  if (Math.abs(value) >= 1_0000) return `${Math.floor((value / 10000) * 10) / 10}만`;
  return Math.floor(value).toLocaleString();
}

function fmtNum(val: string) {
  if (!val) return "";
  const [int, dec] = val.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

function stripNum(val: string, allowDot = false) {
  return allowDot ? val.replace(/[^0-9.]/g, "") : val.replace(/[^0-9]/g, "");
}

function formatCash(amount: number, currency: string) {
  if (currency === "USD") {
    return `$${amount.toLocaleString()}`;
  }
  return `₩${amount.toLocaleString()}`;
}

// ─── 메인 페이지 ─────────────────────────────────────────

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [brokerages, setBrokerages] = useState<Brokerage[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [usdRate, setUsdRate] = useState(1400);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // 추가 모달 폼
  const [formCode, setFormCode] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formCashKRW, setFormCashKRW] = useState("");
  const [formCashUSD, setFormCashUSD] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [brokerageDropOpen, setBrokerageDropOpen] = useState(false);

  // 수정 모달
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editDropOpen, setEditDropOpen] = useState(false);

  // 삭제 확인
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
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
      const res = await fetch(`/api/accounts/${deleteConfirm}`, {
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
          <button onClick={() => router.push("/")} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4F0] dark:bg-[#2D3D30] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A221A] dark:text-[#E8EEE8]"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
            계좌 관리
          </h1>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          + 계좌 추가
        </Button>
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
                    <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl bg-[#E6F9F1] dark:bg-[#1D3D2A]">
                      💳
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                        {acc.brokerageCompany.name}
                        {acc.memo && (
                          <span className="ml-1.5 text-xs font-normal text-[#9AA99A] dark:text-[#5A6A5A]">
                            {acc.memo}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-0.5">
                        {typeLabel ? `${typeLabel} · ` : ""}{acc.holdings.length}종목
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <PnlTag value={pnlRate} />
                    <span className="text-[#9AA99A] dark:text-[#5A6A5A] text-base">›</span>
                  </div>
                </div>

                {/* 예수금 · 평가금 · 합산 */}
                <div className="mt-3 pt-3 border-t border-[#F0F4F0] dark:border-[#2D3D30] space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A]">예수금</div>
                    <div className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A]">평가금</div>
                    <div className="text-[11px] text-[#9AA99A] dark:text-[#5A6A5A]">합산(원화)</div>
                  </div>
                  {(cashKRW > 0 || evalKRW > 0) && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                        {cashKRW > 0 ? `₩${formatKRW(cashKRW)}` : <span className="text-[#9AA99A]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                        {evalKRW > 0 ? `₩${formatKRW(evalKRW)}` : <span className="text-[#9AA99A]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[#05C072]">
                        ₩{formatKRW(totalKRW)}
                      </div>
                    </div>
                  )}
                  {(cashUSD > 0 || evalUSD > 0) && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                        {cashUSD > 0 ? `$${cashUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-[#9AA99A]">-</span>}
                      </div>
                      <div className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                        {evalUSD > 0 ? `$${evalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-[#9AA99A]">-</span>}
                      </div>
                      {cashKRW === 0 && evalKRW === 0 && (
                        <div className="text-xs font-bold text-[#05C072]">
                          ₩{formatKRW(totalKRW)}
                        </div>
                      )}
                    </div>
                  )}
                  {cashKRW === 0 && cashUSD === 0 && evalKRW === 0 && evalUSD === 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-xs text-[#9AA99A]">-</div>
                      <div className="text-xs text-[#9AA99A]">-</div>
                      <div className="text-xs font-bold text-[#05C072]">₩0</div>
                    </div>
                  )}
                </div>

                {/* 수정 / 삭제 버튼 */}
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#F0F4F0] dark:border-[#2D3D30]">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(acc); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(acc.id); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FEE8EA] dark:bg-[#3D1519] text-[#F04452] hover:bg-[#FDD] dark:hover:bg-[#4D1D22] transition-colors"
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
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B]">
              증권사
            </label>
            <button
              type="button"
              onClick={() => setBrokerageDropOpen(!brokerageDropOpen)}
              className="w-full flex items-center justify-between pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] text-[#1A221A] dark:text-[#E8EEE8] cursor-pointer"
            >
              <span>{brokerages.find((b) => b.code === formCode)?.name ?? "증권사를 선택하세요"}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9AA99A]" style={{ transform: brokerageDropOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {brokerageDropOpen && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#E4EAE4] dark:border-[#2A3828] bg-white dark:bg-[#1D2720] shadow-lg">
                {brokerages.map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => { setFormCode(b.code); setBrokerageDropOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between"
                    style={{
                      backgroundColor: formCode === b.code ? "#E6F9F1" : "transparent",
                      color: formCode === b.code ? "#05C072" : "#1A221A",
                      fontWeight: formCode === b.code ? 600 : 400,
                      borderBottom: "1px solid #F0F4F0",
                    }}
                  >
                    <span>{b.name}</span>
                    {formCode === b.code && <span className="text-[#05C072]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 계좌명 */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B]">
              계좌명
            </label>
            <input
              type="text"
              value={formMemo}
              onChange={(e) => setFormMemo(e.target.value)}
              placeholder="예: 연금저축, 미국주식용 (선택사항)"
              className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] text-[#1A221A]"
            />
          </div>

          {/* 예수금 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B]">
                예수금 (KRW)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={fmtNum(formCashKRW)}
                onChange={(e) => setFormCashKRW(stripNum(e.target.value))}
                placeholder="선택사항"
                className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] text-[#1A221A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B]">
                예수금 (USD)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fmtNum(formCashUSD)}
                onChange={(e) => setFormCashUSD(stripNum(e.target.value, true))}
                placeholder="선택사항"
                className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] text-[#1A221A]"
              />
            </div>
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
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B]">
              증권사
            </label>
            <button
              type="button"
              onClick={() => setEditDropOpen(!editDropOpen)}
              className="w-full flex items-center justify-between pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] text-[#1A221A] dark:text-[#E8EEE8] cursor-pointer"
            >
              <span>{brokerages.find((b) => b.code === editCode)?.name ?? "증권사를 선택하세요"}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#9AA99A]" style={{ transform: editDropOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {editDropOpen && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#E4EAE4] dark:border-[#2A3828] bg-white dark:bg-[#1D2720] shadow-lg">
                {brokerages.map((b) => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => { setEditCode(b.code); setEditDropOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between"
                    style={{
                      backgroundColor: editCode === b.code ? "#E6F9F1" : "transparent",
                      color: editCode === b.code ? "#05C072" : "#1A221A",
                      fontWeight: editCode === b.code ? 600 : 400,
                      borderBottom: "1px solid #F0F4F0",
                    }}
                  >
                    <span>{b.name}</span>
                    {editCode === b.code && <span className="text-[#05C072]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 계좌명 */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B]">
              계좌명
            </label>
            <input
              type="text"
              value={editMemo}
              onChange={(e) => setEditMemo(e.target.value)}
              placeholder="예: 연금저축, 미국주식용 (선택사항)"
              className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] text-[#1A221A]"
            />
          </div>

          <Button size="lg" onClick={handleEditAccount} disabled={editSubmitting}>
            {editSubmitting ? "수정 중..." : "수정 완료"}
          </Button>
        </div>
      </BottomSheet>

      {/* 삭제 확인 모달 */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-[#1D2720] rounded-2xl p-6 w-[340px] max-w-[90vw]">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[#FEE8EA] dark:bg-[#3D1519] flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">⚠️</span>
              </div>
              <h3 className="text-base font-bold text-[#1A221A] dark:text-[#E8EEE8] mb-1">
                계좌를 삭제하시겠습니까?
              </h3>
              <p className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A]">
                이 계좌의 <strong className="text-[#F04452]">보유 종목, 매매 기록, 예수금</strong>이
                모두 삭제되며 복구할 수 없습니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8]"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#F04452] text-white"
                style={{ opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
