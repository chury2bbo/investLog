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
  brokerageCompany: { code: string; name: string };
  holdings: Holding[];
  cashBalances: CashBalance[];
}

// ─── 타입 (증권사) ────────────────────────────────────────

interface Brokerage {
  code: string;
  name: string;
}

// ─── 유틸 ────────────────────────────────────────────────

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
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // 모달 폼
  const [formCode, setFormCode] = useState("");
  const [formCashKRW, setFormCashKRW] = useState("");
  const [formCashUSD, setFormCashUSD] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const [accRes, brRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/brokerages"),
      ]);
      if (accRes.ok) {
        const data = await accRes.json();
        setAccounts(Array.isArray(data) ? data : []);
      }
      if (brRes.ok) {
        const brData: Brokerage[] = await brRes.json();
        setBrokerages(brData);
        if (brData.length > 0) setFormCode(brData[0].code);
      }
    } catch {
      /* 조회 실패 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleAddAccount() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountCode: formCode,
          cashKRW: formCashKRW || undefined,
          cashUSD: formCashUSD || undefined,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setFormCode(brokerages[0]?.code ?? "");
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
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
          계좌 관리
        </h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          + 계좌 추가
        </Button>
      </div>

      {/* 계좌 목록 */}
      {accounts.length === 0 ? (
        <EmptyState message="아직 등록된 계좌가 없어요. 계좌를 추가해보세요." />
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => {
            const cashKRW = acc.cashBalances.find((c) => c.currency === "KRW")?.amount ?? 0;
            const cashUSD = acc.cashBalances.find((c) => c.currency === "USD")?.amount ?? 0;
            const hasKR = acc.holdings.some((h) => h.country === "KR");
            const hasForeign = acc.holdings.some((h) => h.country !== "KR");
            const typeLabel = hasKR && hasForeign ? "국내·해외" : hasKR ? "국내" : hasForeign ? "해외" : "";

            return (
              <div
                key={acc.id}
                onClick={() => router.push(`/accounts/${acc.id}`)}
                className="cursor-pointer"
              >
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* 아이콘 */}
                      <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl bg-[#E6F9F1] dark:bg-[#1D3D2A]">
                        💳
                      </div>
                      <div>
                        <div className="text-[15px] font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                          {acc.brokerageCompany.name}
                        </div>
                        <div className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-0.5 flex items-center gap-1.5">
                          {typeLabel && (
                            <>
                              <Tag
                                label={typeLabel}
                                color={hasForeign ? "blue" : "green"}
                              />
                              <span>·</span>
                            </>
                          )}
                          <span>{acc.holdings.length}종목</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {cashKRW > 0 && (
                        <div className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                          {formatCash(cashKRW, "KRW")}
                        </div>
                      )}
                      {cashUSD > 0 && (
                        <div className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A]">
                          {formatCash(cashUSD, "USD")}
                        </div>
                      )}
                      {cashKRW === 0 && cashUSD === 0 && (
                        <div className="text-xs text-[#9AA99A] dark:text-[#5A6A5A]">
                          예수금 없음
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
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
            <select
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] text-[#1A221A] appearance-none"
            >
              {brokerages.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
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
    </div>
  );
}
