"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Tag,
  SectionTitle,
  LoadingSpinner,
  Divider,
  ThemeToggle,
} from "@/components/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── 타입 ────────────────────────────────────────────────

interface TagDist {
  tag: string;
  buy: number;
  sell: number;
  total: number;
}

interface TagPnl {
  tag: string;
  avgPnl: number;
  count: number;
}

interface EmotionPnl {
  emotion: string;
  avgPnl: number;
  count: number;
}

interface HoldingRange {
  label: string;
  count: number;
}

interface StatsData {
  locked: boolean;
  totalCount: number;
  remaining?: number;
  tagDistribution?: TagDist[];
  tagPnl?: TagPnl[];
  emotionPnl?: EmotionPnl[];
  avgHoldingDays?: number;
  holdingRanges?: HoldingRange[];
}

interface InvestorScore {
  profitability: number;
  discipline: number;
  riskManagement: number;
  consistency: number;
}

interface AiReport {
  investorType: string;
  typeDescription: string;
  investorScore: InvestorScore;
  goodPatterns: string[];
  badPatterns: string[];
  dangerSignals: string[];
  sectorAnalysis: string;
  emotionAnalysis: string;
  tradingStyleAnalysis: string;
  recommendations: string[];
  monthlyTrend: string;
  summary: string;
}

interface ReportMeta {
  periodMonths: number;
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  matchedCount: number;
  winRate: number;
  avgPnl: number;
  avgHoldingDays: number;
  tradesPerWeek: number;
  holdingCount: number;
}

// ─── 감정 이모지 매핑 ───────────────────────────────────

const EMOTION_ICONS: Record<string, React.ReactNode> = {
  확신: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20v-4"/><path d="M12 20V8"/><path d="M18 20V4"/><path d="M2 20h20"/></svg>,
  불안: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5-2 4-2 4 2 4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M9.5 15.5l-1 2"/><path d="M14.5 15.5l1 2"/></svg>,
  FOMO: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 9h2"/><path d="M14 9h2"/><path d="M9 15c.6-1 1.5-1.5 3-1.5s2.4.5 3 1.5"/><line x1="12" y1="4" x2="12" y2="2"/><line x1="8" y1="4.5" x2="7" y2="2.8"/><line x1="16" y1="4.5" x2="17" y2="2.8"/></svg>,
  손절: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/><path d="M2 20h20"/><line x1="2" y1="4" x2="22" y2="20" strokeWidth="2"/></svg>,
  기계적: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

// ─── 메인 페이지 ─────────────────────────────────────────

export default function PersonalityPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [report, setReport] = useState<AiReport | null>(null);
  const [reportMeta, setReportMeta] = useState<ReportMeta | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportRemaining, setReportRemaining] = useState<number | null>(null);
  const [reportError, setReportError] = useState("");

  // ─── 통계 데이터 로딩 ─────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/trades/analysis");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── AI 리포트 생성 ───────────────────────────────────

  async function generateReport() {
    setReportLoading(true);
    setReportError("");
    try {
      const res = await fetch("/api/trades/analysis/ai-report");
      const data = await res.json();

      if (!res.ok) {
        setReportError(data.error ?? "리포트 생성에 실패했습니다.");
        if (data.remaining !== undefined) setReportRemaining(data.remaining);
        return;
      }

      setReport(data.report);
      if (data.meta) setReportMeta(data.meta);
      if (data.remaining !== undefined) setReportRemaining(data.remaining);
    } catch {
      setReportError("네트워크 오류가 발생했습니다.");
    } finally {
      setReportLoading(false);
    }
  }

  // ─── 로딩 ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
        <Header />
        <div className="flex gap-2 mb-6">
          <div className="h-7 w-24 rounded-full bg-[var(--color-g100)] dark:bg-[var(--color-border)] animate-pulse" />
          <div className="h-7 w-28 rounded-full bg-[var(--color-g100)] dark:bg-[var(--color-border)] animate-pulse" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-[var(--color-surface)] dark:bg-[var(--color-card)] p-5 mb-4">
            <div className="h-4 w-28 rounded bg-[var(--color-g100)] dark:bg-[var(--color-border)] animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-3 w-full rounded bg-[var(--color-g100)] dark:bg-[var(--color-border)] animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-[var(--color-g100)] dark:bg-[var(--color-border)] animate-pulse" />
              <div className="h-3 w-3/5 rounded bg-[var(--color-g100)] dark:bg-[var(--color-border)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── 잠금 상태 (10건 미만) ────────────────────────────

  if (!stats || stats.locked) {
    const remaining = stats?.remaining ?? 10;
    const totalCount = stats?.totalCount ?? 0;
    return (
      <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6 animate-[fadeIn_0.4s_ease-out]">
        <Header />
        <Card>
          <div className="text-center py-10">
            <div className="mb-4 flex justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-g300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text)] dark:text-[var(--color-text)] mb-2">
              투자 성향 분석이 잠겨있어요
            </h2>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-4">
              매매 기록이 <strong className="text-[var(--color-positive)]">10건</strong> 이상이어야 분석할 수 있어요
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
              <span className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">현재 {totalCount}건</span>
              <span className="text-sm font-bold text-[var(--color-negative)]">{remaining}건 더 필요해요</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const {
    tagDistribution = [],
    tagPnl = [],
    emotionPnl = [],
    avgHoldingDays = 0,
    holdingRanges = [],
    totalCount,
  } = stats;

  // 차트 색상
  const pnlColor = (val: number) => (val >= 0 ? "var(--color-positive)" : "var(--color-negative)");

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6 animate-[fadeIn_0.4s_ease-out]">
      <Header />

      {/* 요약 배지 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="px-3 py-1.5 rounded-full bg-[var(--color-primary-soft)] dark:bg-[#0D2A1D] text-xs font-semibold text-[var(--color-positive)]">
          총 {totalCount}건 분석
        </div>
        <div className="px-3 py-1.5 rounded-full bg-[#E8F0FE] dark:bg-[#0D1A2A] text-xs font-semibold text-[#4285F4]">
          평균 보유 {avgHoldingDays}일
        </div>
      </div>

      {/* ── ① 이유 태그 분포 ── */}
      <SectionTitle title="이유 태그 분포" />
      <Card className="mb-4">
        {tagDistribution.length > 0 ? (
          <div className="space-y-2.5">
            {tagDistribution.slice(0, 8).map((item) => {
              const maxVal = tagDistribution[0].total;
              const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
              return (
                <div key={item.tag}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[var(--color-text)] dark:text-[var(--color-text)]">{item.tag}</span>
                    <span className="text-[var(--color-g400)]">
                      매수 {item.buy} · 매도 {item.sell}
                    </span>
                  </div>
                  <div className="h-2 rounded bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, var(--color-positive) ${(item.buy / item.total) * 100}%, var(--color-warning) ${(item.buy / item.total) * 100}%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-center text-[var(--color-g400)] py-4">태그 데이터가 없습니다.</p>
        )}
      </Card>

      {/* ── ② 이유별 평균 수익률 ── */}
      <SectionTitle title="이유별 평균 수익률" />
      <Card className="mb-4">
        {tagPnl.length > 0 ? (
          <div className="space-y-2.5">
            {tagPnl.map((item) => {
              const isPositive = item.avgPnl >= 0;
              const maxAbs = Math.max(...tagPnl.map((t) => Math.abs(t.avgPnl)), 1);
              const widthPct = Math.min((Math.abs(item.avgPnl) / maxAbs) * 100, 100);
              return (
                <div key={item.tag} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[var(--color-text)] w-[72px] shrink-0 truncate">{item.tag}</span>
                  <div className="flex-1 h-6 bg-[var(--color-g100)] dark:bg-[var(--color-border)] rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: isPositive ? "var(--color-positive)" : "var(--color-negative)",
                        opacity: 0.8,
                        minWidth: 4,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold w-[52px] text-right shrink-0" style={{ color: pnlColor(item.avgPnl) }}>
                    {isPositive ? "+" : ""}{item.avgPnl.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-center text-[var(--color-g400)] py-4">매수→매도 매칭 데이터가 부족합니다.</p>
        )}
      </Card>

      {/* ── ③ 감정별 수익률 ── */}
      <SectionTitle title="감정별 수익률" />
      <Card className="mb-4">
        {emotionPnl.length > 0 ? (
          <div className="space-y-3">
            {emotionPnl.map((item) => (
              <div key={item.emotion} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-g500)]">{EMOTION_ICONS[item.emotion] ?? null}</span>
                  <span className="text-sm font-medium text-[var(--color-text)] dark:text-[var(--color-text)]">
                    {item.emotion}
                  </span>
                  <span className="text-xs text-[var(--color-g400)]">({item.count}건)</span>
                </div>
                <span
                  className="text-sm font-bold"
                  style={{ color: pnlColor(item.avgPnl) }}
                >
                  {item.avgPnl >= 0 ? "+" : ""}
                  {item.avgPnl.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center text-[var(--color-g400)] py-4">감정 기록이 있는 매매 데이터가 부족합니다.</p>
        )}
      </Card>

      {/* ── ④ 보유 기간 패턴 ── */}
      <SectionTitle title="보유 기간 패턴" />
      <Card className="mb-4">
        {holdingRanges.length > 0 ? (
          <>
            <div className="text-center mb-3">
              <span className="text-2xl font-extrabold text-[var(--color-positive)]">{avgHoldingDays}일</span>
              <span className="text-sm text-[var(--color-g400)] ml-2">평균 보유</span>
            </div>
            <div className="space-y-2">
              {holdingRanges.map((r) => {
                const totalTrades = holdingRanges.reduce((a, b) => a + b.count, 0);
                const pct = totalTrades > 0 ? Math.round((r.count / totalTrades) * 100) : 0;
                return (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-g500)] dark:text-[var(--color-muted)] w-16 shrink-0">{r.label}</span>
                    <div className="flex-1 h-2 rounded bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
                      <div
                        className="h-full rounded bg-[#4285F4]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-text)] dark:text-[var(--color-text)] w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-center text-[var(--color-g400)] py-4">매수→매도 매칭 데이터가 부족합니다.</p>
        )}
      </Card>

      {/* ── ⑤ AI 성향 리포트 ── */}
      <SectionTitle title="AI 투자 성향 리포트" />

      {!report && !reportLoading && (
        <Card className="mb-4">
          <div className="text-center py-6">
            <div className="mb-3 flex justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-4">
              AI가 내 매매 패턴을 분석하고 투자 성향을 알려줍니다
            </p>
            {reportError && (
              <div className="rounded-xl px-4 py-2.5 mb-4 text-sm bg-[var(--color-negative-soft)] dark:bg-[#3D1519] text-[var(--color-negative)]">
                {reportError}
              </div>
            )}
            <Button size="lg" onClick={generateReport}>
              AI 성향 리포트 생성
            </Button>
            {reportRemaining !== null && (
              <p className="text-xs text-[var(--color-g400)] mt-2">
                오늘 남은 횟수: {reportRemaining}회
              </p>
            )}
          </div>
        </Card>
      )}

      {reportLoading && (
        <Card className="mb-4">
          <div className="flex flex-col items-center py-10 gap-3">
            <LoadingSpinner size={28} />
            <p className="text-sm text-[var(--color-g400)]">AI가 매매 패턴을 분석 중입니다...</p>
          </div>
        </Card>
      )}

      {report && !reportLoading && (
        <div className="space-y-2.5 mb-4">
          {/* 투자자 유형 */}
          <Card>
            <div className="text-center">
              <div className="mb-2 flex justify-center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg></div>
              <div className="text-lg font-extrabold text-[var(--color-positive)] mb-1">
                {report.investorType}
              </div>
              <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] leading-relaxed">
                {report.typeDescription}
              </p>
            </div>
          </Card>

          {/* 분석 메타 정보 */}
          {reportMeta && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "분석 기간", value: `${reportMeta.periodMonths}개월` },
                { label: "승률", value: `${reportMeta.winRate}%`, color: reportMeta.winRate >= 50 ? "var(--color-positive)" : "var(--color-negative)" },
                { label: "평균 수익", value: `${reportMeta.avgPnl >= 0 ? "+" : ""}${reportMeta.avgPnl}%`, color: reportMeta.avgPnl >= 0 ? "var(--color-positive)" : "var(--color-negative)" },
                { label: "주간 거래", value: `${reportMeta.tradesPerWeek}회` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[var(--color-surface)] dark:bg-[var(--color-card)] border border-[var(--color-g100)] dark:border-[var(--color-border)] p-2.5 text-center">
                  <div className="text-[10px] text-[var(--color-g400)] mb-0.5">{item.label}</div>
                  <div className="text-sm font-bold" style={{ color: item.color ?? "var(--color-text)" }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* 투자 습관 점수 */}
          {report.investorScore && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                <span className="text-sm font-bold text-[var(--color-text)]">투자 습관 점수</span>
              </div>
              <div className="space-y-3">
                {([
                  { label: "수익성", key: "profitability" as const, icon: "📈" },
                  { label: "투자 규율", key: "discipline" as const, icon: "🎯" },
                  { label: "리스크 관리", key: "riskManagement" as const, icon: "🛡️" },
                  { label: "일관성", key: "consistency" as const, icon: "📊" },
                ] as const).map((item) => {
                  const score = report.investorScore[item.key] ?? 0;
                  const color = score >= 70 ? "var(--color-positive)" : score >= 40 ? "var(--color-warning)" : "var(--color-negative)";
                  return (
                    <div key={item.key}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-[var(--color-text)]">{item.icon} {item.label}</span>
                        <span className="text-xs font-bold" style={{ color }}>{score}점</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 잘하는 패턴 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-positive)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span className="text-sm font-bold text-[var(--color-text)]">잘하는 패턴</span>
            </div>
            <div className="space-y-2">
              {report.goodPatterns.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                  <span className="text-[var(--color-positive)] shrink-0 mt-0.5">●</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 반복 실수 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span className="text-sm font-bold text-[var(--color-text)]">반복되는 실수</span>
            </div>
            <div className="space-y-2">
              {report.badPatterns.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                  <span className="text-[var(--color-negative)] shrink-0 mt-0.5">●</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 위험 신호 */}
          {report.dangerSignals && report.dangerSignals.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-negative)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span className="text-sm font-bold text-[var(--color-negative)]">위험 신호</span>
              </div>
              <div className="space-y-2">
                {report.dangerSignals.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                    <span className="text-[var(--color-negative)] shrink-0 mt-0.5">!</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 섹터 분석 */}
          {report.sectorAnalysis && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>
                <span className="text-sm font-bold text-[var(--color-text)]">섹터 분석</span>
              </div>
              <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] leading-relaxed">
                {report.sectorAnalysis}
              </p>
            </Card>
          )}

          {/* 감정 분석 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-g500)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              <span className="text-sm font-bold text-[var(--color-text)]">감정 분석</span>
            </div>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] leading-relaxed">
              {report.emotionAnalysis}
            </p>
          </Card>

          {/* 매매 스타일 분석 */}
          {report.tradingStyleAnalysis && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <span className="text-sm font-bold text-[var(--color-text)]">매매 스타일</span>
              </div>
              <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] leading-relaxed">
                {report.tradingStyleAnalysis}
              </p>
            </Card>
          )}

          {/* 월별 추이 */}
          {report.monthlyTrend && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-g500)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span className="text-sm font-bold text-[var(--color-text)]">월별 매매 추이</span>
              </div>
              <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] leading-relaxed">
                {report.monthlyTrend}
              </p>
            </Card>
          )}

          {/* 개선 권고 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" /></svg>
              <span className="text-sm font-bold text-[var(--color-text)]">개선 권고</span>
            </div>
            <div className="space-y-2">
              {report.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                  <span className="text-[#4285F4] shrink-0 mt-0.5">{i + 1}.</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 종합 한줄평 */}
          <div className="rounded-2xl p-4 bg-gradient-to-r from-[var(--color-positive)] to-[#34D399]">
            <p className="text-sm font-bold text-white text-center">
              &ldquo;{report.summary}&rdquo;
            </p>
          </div>

          {/* 재생성 */}
          {reportRemaining !== null && reportRemaining > 0 && (
            <div className="text-center pt-2">
              <button
                onClick={generateReport}
                className="text-xs text-[var(--color-g400)] hover:text-[var(--color-positive)] transition-colors"
              >
                다시 생성하기 (남은 횟수: {reportRemaining}회)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 헤더 컴포넌트 ───────────────────────────────────────

function Header() {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-g100)] dark:bg-[var(--color-border)] hover:bg-[var(--color-g200)] dark:hover:bg-[#354035] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text)]">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
          투자 성향 분석
        </h1>
      </div>
      <div className="md:hidden"><ThemeToggle /></div>
    </div>
  );
}
