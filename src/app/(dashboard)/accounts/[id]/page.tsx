"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Button,
  Tag,
  PnlTag,
  SectionTitle,
  LoadingSpinner,
  EmptyState,
  BottomSheet,
  Divider,
} from "@/components/ui";

// ─── 타입 ────────────────────────────────────────────────

interface Holding {
  id: number;
  ticker: string;
  name: string;
  country: string;
  avgPrice: number;
  quantity: number;
  sectorAuto: string | null;
  sectorManual: string | null;
  tags: string[];
}

interface CashBalance {
  id: number;
  currency: string;
  amount: number;
}

interface TradeLog {
  id: number;
  date: string;
  ticker: string;
  name: string;
  type: string;
  price: number;
  quantity: number;
}

interface CashLog {
  id: number;
  date: string;
  type: string;
  currency: string;
  amount: number;
  memo: string | null;
}

interface AccountDetail {
  id: number;
  accountCode: string;
  brokerageCompany: { code: string; name: string };
  holdings: Holding[];
  cashBalances: CashBalance[];
  tradeLogs: TradeLog[];
  cashLogs: CashLog[];
}

// ─── 메인 페이지 ─────────────────────────────────────────

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectorTab, setSectorTab] = useState<"auto" | "manual">("auto");

  // 입출금 모달
  const [cashModal, setCashModal] = useState<"deposit" | "withdraw" | null>(null);
  const [cashCurrency, setCashCurrency] = useState("KRW");
  const [cashAmount, setCashAmount] = useState("");
  const [cashSubmitting, setCashSubmitting] = useState(false);

  // ─── 데이터 로딩 ───────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounts`);
      if (!res.ok) return;
      const accounts = await res.json();
      if (!Array.isArray(accounts)) return;
      const acc = accounts.find((a: AccountDetail) => a.id === parseInt(accountId, 10));
      if (!acc) return;

      // 매매 이력 조회
      const tradesRes = await fetch(`/api/trades?accountId=${accountId}`);
      const trades = tradesRes.ok ? await tradesRes.json() : [];

      // 입출금 이력 조회
      const cashLogsRes = await fetch(`/api/cash?accountId=${accountId}`);
      const cashLogs = cashLogsRes.ok ? await cashLogsRes.json() : [];

      setAccount({
        ...acc,
        tradeLogs: Array.isArray(trades) ? trades.slice(0, 5) : [],
        cashLogs: Array.isArray(cashLogs) ? cashLogs : [],
      });
    } catch {
      /* 조회 실패 */
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  // ─── 입출금 처리 ───────────────────────────────────────

  async function handleCashSubmit() {
    if (!cashAmount || !account) return;
    setCashSubmitting(true);

    const amount = parseFloat(cashAmount.replace(/,/g, ""));
    const type = cashModal === "deposit" ? "DEPOSIT" : "WITHDRAW";

    try {
      const res = await fetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.id,
          type,
          currency: cashCurrency,
          amount,
        }),
      });

      if (res.ok) {
        setCashModal(null);
        setCashAmount("");
        fetchAccount();
      }
    } catch {
      /* 실패 */
    } finally {
      setCashSubmitting(false);
    }
  }

  // ─── 섹터 분포 계산 ───────────────────────────────────

  function calcSectorDistribution(type: "auto" | "manual") {
    if (!account) return [];
    const map: Record<string, number> = {};
    let total = 0;

    account.holdings.forEach((h) => {
      const sector =
        type === "auto"
          ? h.sectorAuto ?? "미분류"
          : h.sectorManual ?? "미지정";
      const value = h.avgPrice * h.quantity;
      map[sector] = (map[sector] ?? 0) + value;
      total += value;
    });

    const colors = ["#05C072", "#34D399", "#F07D05", "#4285F4", "#9AA99A", "#F04452"];
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
        color: colors[i % colors.length],
      }));
  }

  // ─── 로딩 / 에러 ──────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="w-full max-w-2xl mx-auto px-5 py-6">
        <EmptyState message="계좌를 찾을 수 없습니다." />
      </div>
    );
  }

  const cashKRW = account.cashBalances.find((c) => c.currency === "KRW")?.amount ?? 0;
  const cashUSD = account.cashBalances.find((c) => c.currency === "USD")?.amount ?? 0;
  const hasManualSector = account.holdings.some((h) => h.sectorManual);
  const sectorData = calcSectorDistribution(sectorTab);

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A]">계좌 상세</p>
          <h1 className="text-[26px] font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
            {account.brokerageCompany.name}
          </h1>
        </div>
        <Tag
          label={
            account.holdings.some((h) => h.country !== "KR")
              ? "해외주식"
              : "국내주식"
          }
          color={account.holdings.some((h) => h.country !== "KR") ? "blue" : "green"}
        />
      </div>

      {/* ── ② 예수금 관리 ── */}
      <div
        className="rounded-[20px] p-5 mb-4"
        style={{
          background: "linear-gradient(135deg, #05C072, #34D399)",
        }}
      >
        <div className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
          원화 예수금
        </div>
        <div className="text-[28px] font-extrabold text-white tracking-tight">
          {cashKRW.toLocaleString()}원
        </div>
        {cashUSD > 0 && (
          <div className="text-sm text-white/60 mt-1">
            ${cashUSD.toLocaleString()} USD
          </div>
        )}

        <div className="flex gap-2 mt-3.5">
          <button
            onClick={() => {
              setCashCurrency("KRW");
              setCashModal("deposit");
            }}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            + 입금
          </button>
          <button
            onClick={() => {
              setCashCurrency("KRW");
              setCashModal("withdraw");
            }}
            className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-white cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            출금
          </button>
        </div>
      </div>

      {/* ── ① 보유 종목 리스트 ── */}
      <SectionTitle title="보유 종목" />

      {account.holdings.length === 0 ? (
        <EmptyState message="보유 종목이 없습니다." />
      ) : (
        <div className="space-y-2.5 mb-4">
          {account.holdings.map((h) => {
            const evalValue = h.avgPrice * h.quantity;
            return (
              <Card key={h.id}>
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <div className="text-[15px] font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                      {h.name}
                    </div>
                    <div className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-0.5">
                      {h.ticker} · {h.quantity}주 · 평단 {h.avgPrice.toLocaleString()}원
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                      {evalValue.toLocaleString()}원
                    </div>
                    <div className="text-xs text-[#9AA99A] dark:text-[#5A6A5A]">
                      {h.avgPrice.toLocaleString()}원
                    </div>
                  </div>
                </div>

                <Divider />

                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-1 flex-wrap">
                    {h.sectorAuto && (
                      <Tag label={h.sectorAuto} color="gray" />
                    )}
                    {h.sectorManual && (
                      <Tag label={h.sectorManual} color="green" />
                    )}
                    {h.tags.map((t) => (
                      <Tag key={t} label={t} color="blue" />
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── ③ 매매 이력 (최근 5건) ── */}
      <SectionTitle title="최근 매매" />

      {account.tradeLogs.length === 0 ? (
        <Card>
          <p className="text-sm text-center py-4 text-[#9AA99A]">매매 기록이 없습니다.</p>
        </Card>
      ) : (
        <Card>
          {account.tradeLogs.map((t, i) => {
            const date = new Date(t.date);
            const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
            const isBuy = t.type === "BUY";

            return (
              <div
                key={t.id}
                className="flex justify-between items-center py-2.5"
                style={{
                  borderBottom:
                    i < account.tradeLogs.length - 1
                      ? "1px solid #F0F4F0"
                      : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#9AA99A] w-9">
                    {dateStr}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[#1A221A] dark:text-[#E8EEE8]">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-[#9AA99A]">
                      {t.quantity}주 · {t.price.toLocaleString()}원
                    </div>
                  </div>
                </div>
                <Tag
                  label={isBuy ? "매수" : "매도"}
                  color={isBuy ? "green" : "orange"}
                />
              </div>
            );
          })}

          <button
            onClick={() => router.push(`/trades?accountId=${account.id}`)}
            className="w-full text-sm font-bold pt-3 pb-1 text-center"
            style={{ color: "#05C072" }}
          >
            전체 매매일지 보기 →
          </button>
        </Card>
      )}

      {/* ── ④ 섹터 분포 차트 ── */}
      <div className="mt-4">
        <SectionTitle title="섹터 분포" />

        {account.holdings.length === 0 ? (
          <Card>
            <p className="text-sm text-center py-4 text-[#9AA99A]">보유 종목이 없습니다.</p>
          </Card>
        ) : (
          <Card>
            {/* 탭 */}
            <div
              className="flex rounded-[10px] p-0.5 mb-4"
              style={{ backgroundColor: "#F0F4F0" }}
            >
              <button
                onClick={() => setSectorTab("auto")}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: sectorTab === "auto" ? "#FFFFFF" : "transparent",
                  color: sectorTab === "auto" ? "#1A221A" : "#9AA99A",
                  boxShadow:
                    sectorTab === "auto"
                      ? "0 1px 4px rgba(0,0,0,0.08)"
                      : "none",
                }}
              >
                기본 섹터
              </button>
              {hasManualSector && (
                <button
                  onClick={() => setSectorTab("manual")}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background:
                      sectorTab === "manual" ? "#FFFFFF" : "transparent",
                    color: sectorTab === "manual" ? "#1A221A" : "#9AA99A",
                    boxShadow:
                      sectorTab === "manual"
                        ? "0 1px 4px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  내 섹터
                </button>
              )}
            </div>

            {/* 바 차트 */}
            {sectorData.map((item) => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm text-[#1A221A] dark:text-[#E8EEE8]">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                    {item.pct}%
                  </span>
                </div>
                <div
                  className="h-2 rounded"
                  style={{ backgroundColor: "#F0F4F0" }}
                >
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* ── 입출금 바텀시트 ── */}
      <BottomSheet
        open={cashModal !== null}
        onClose={() => setCashModal(null)}
        title={cashModal === "deposit" ? "입금" : "출금"}
      >
        <div className="space-y-5">
          {/* 통화 선택 */}
          <div className="flex gap-2">
            {["KRW", "USD"].map((c) => (
              <button
                key={c}
                onClick={() => setCashCurrency(c)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor:
                    cashCurrency === c ? "#05C072" : "#F0F4F0",
                  color: cashCurrency === c ? "#fff" : "#6B7B6B",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* 금액 */}
          <div>
            <label className="block text-xs font-medium mb-1 text-[#6B7B6B]">
              금액
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder={cashCurrency === "KRW" ? "1,000,000" : "1,000"}
              className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] text-[#1A221A]"
            />
          </div>

          <Button
            size="lg"
            onClick={handleCashSubmit}
            disabled={cashSubmitting || !cashAmount}
          >
            {cashSubmitting
              ? "처리 중..."
              : cashModal === "deposit"
                ? "입금하기"
                : "출금하기"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
