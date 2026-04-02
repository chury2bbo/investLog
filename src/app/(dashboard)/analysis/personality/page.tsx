"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Tag,
  SectionTitle,
  LoadingSpinner,
  Divider,
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

interface AiReport {
  investorType: string;
  typeDescription: string;
  goodPatterns: string[];
  badPatterns: string[];
  recommendations: string[];
  emotionAnalysis: string;
  summary: string;
}

// ─── 감정 이모지 매핑 ───────────────────────────────────

const EMOTION_EMOJI: Record<string, string> = {
  확신: "😎",
  불안: "😰",
  FOMO: "🤯",
  손절: "😣",
  기계적: "🤖",
};

// ─── 메인 페이지 ─────────────────────────────────────────

export default function PersonalityPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [report, setReport] = useState<AiReport | null>(null);
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
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // ─── 잠금 상태 (10건 미만) ────────────────────────────

  if (!stats || stats.locked) {
    const remaining = stats?.remaining ?? 10;
    const totalCount = stats?.totalCount ?? 0;
    return (
      <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
        <Header />
        <Card>
          <div className="text-center py-10">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-lg font-bold text-[#1A221A] dark:text-[#E8EEE8] mb-2">
              투자 성향 분석이 잠겨있어요
            </h2>
            <p className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A] mb-4">
              매매 기록이 <strong className="text-[#05C072]">10건</strong> 이상이어야 분석할 수 있어요
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0F4F0] dark:bg-[#2D3D30]">
              <span className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A]">현재 {totalCount}건</span>
              <span className="text-sm font-bold text-[#F04452]">{remaining}건 더 필요해요</span>
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
  const pnlColor = (val: number) => (val >= 0 ? "#05C072" : "#F04452");

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
      <Header />

      {/* 요약 배지 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="px-3 py-1.5 rounded-full bg-[#E6F9F1] dark:bg-[#0D2A1D] text-xs font-semibold text-[#05C072]">
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
                    <span className="font-medium text-[#1A221A] dark:text-[#E8EEE8]">{item.tag}</span>
                    <span className="text-[#9AA99A]">
                      매수 {item.buy} · 매도 {item.sell}
                    </span>
                  </div>
                  <div className="h-2 rounded bg-[#F0F4F0] dark:bg-[#2D3D30]">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, #05C072 ${(item.buy / item.total) * 100}%, #F07D05 ${(item.buy / item.total) * 100}%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-center text-[#9AA99A] py-4">태그 데이터가 없습니다.</p>
        )}
      </Card>

      {/* ── ② 이유별 평균 수익률 ── */}
      <SectionTitle title="이유별 평균 수익률" />
      <Card className="mb-4">
        {tagPnl.length > 0 ? (
          <ResponsiveContainer width="100%" height={tagPnl.length * 36 + 20}>
            <BarChart data={tagPnl} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#9AA99A" }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="tag"
                tick={{ fontSize: 11, fill: "#1A221A" }}
                width={80}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8EEE8" }}
                formatter={(v: number) => [`${v.toFixed(2)}%`, "평균 수익률"]}
              />
              <Bar dataKey="avgPnl" radius={[0, 4, 4, 0]}>
                {tagPnl.map((entry, i) => (
                  <Cell key={i} fill={pnlColor(entry.avgPnl)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-center text-[#9AA99A] py-4">매수→매도 매칭 데이터가 부족합니다.</p>
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
                  <span className="text-xl">{EMOTION_EMOJI[item.emotion] ?? "💭"}</span>
                  <span className="text-sm font-medium text-[#1A221A] dark:text-[#E8EEE8]">
                    {item.emotion}
                  </span>
                  <span className="text-xs text-[#9AA99A]">({item.count}건)</span>
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
          <p className="text-sm text-center text-[#9AA99A] py-4">감정 기록이 있는 매매 데이터가 부족합니다.</p>
        )}
      </Card>

      {/* ── ④ 보유 기간 패턴 ── */}
      <SectionTitle title="보유 기간 패턴" />
      <Card className="mb-4">
        {holdingRanges.length > 0 ? (
          <>
            <div className="text-center mb-3">
              <span className="text-2xl font-extrabold text-[#05C072]">{avgHoldingDays}일</span>
              <span className="text-sm text-[#9AA99A] ml-2">평균 보유</span>
            </div>
            <div className="space-y-2">
              {holdingRanges.map((r) => {
                const totalTrades = holdingRanges.reduce((a, b) => a + b.count, 0);
                const pct = totalTrades > 0 ? Math.round((r.count / totalTrades) * 100) : 0;
                return (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A] w-16 shrink-0">{r.label}</span>
                    <div className="flex-1 h-2 rounded bg-[#F0F4F0] dark:bg-[#2D3D30]">
                      <div
                        className="h-full rounded bg-[#4285F4]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[#1A221A] dark:text-[#E8EEE8] w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-center text-[#9AA99A] py-4">매수→매도 매칭 데이터가 부족합니다.</p>
        )}
      </Card>

      {/* ── ⑤ AI 성향 리포트 ── */}
      <SectionTitle title="AI 투자 성향 리포트" />

      {!report && !reportLoading && (
        <Card className="mb-4">
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🧠</div>
            <p className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A] mb-4">
              AI가 내 매매 패턴을 분석하고 투자 성향을 알려줍니다
            </p>
            {reportError && (
              <div className="rounded-xl px-4 py-2.5 mb-4 text-sm bg-[#FEE8EA] dark:bg-[#3D1519] text-[#F04452]">
                {reportError}
              </div>
            )}
            <Button size="lg" onClick={generateReport}>
              AI 성향 리포트 생성
            </Button>
            {reportRemaining !== null && (
              <p className="text-xs text-[#9AA99A] mt-2">
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
            <p className="text-sm text-[#9AA99A]">AI가 매매 패턴을 분석 중입니다...</p>
          </div>
        </Card>
      )}

      {report && !reportLoading && (
        <div className="space-y-2.5 mb-4">
          {/* 투자자 유형 */}
          <Card>
            <div className="text-center">
              <div className="text-3xl mb-2">🧠</div>
              <div className="text-lg font-extrabold text-[#05C072] mb-1">
                {report.investorType}
              </div>
              <p className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A] leading-relaxed">
                {report.typeDescription}
              </p>
            </div>
          </Card>

          {/* 잘하는 패턴 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✅</span>
              <span className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">잘하는 패턴</span>
            </div>
            <div className="space-y-2">
              {report.goodPatterns.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[#1A221A] dark:text-[#E8EEE8]">
                  <span className="text-[#05C072] shrink-0 mt-0.5">●</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 반복 실수 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">반복되는 실수</span>
            </div>
            <div className="space-y-2">
              {report.badPatterns.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[#1A221A] dark:text-[#E8EEE8]">
                  <span className="text-[#F04452] shrink-0 mt-0.5">●</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 개선 권고 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💡</span>
              <span className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">개선 권고</span>
            </div>
            <div className="space-y-2">
              {report.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[#1A221A] dark:text-[#E8EEE8]">
                  <span className="text-[#4285F4] shrink-0 mt-0.5">●</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 감정 분석 */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💭</span>
              <span className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">감정 분석</span>
            </div>
            <p className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A] leading-relaxed">
              {report.emotionAnalysis}
            </p>
          </Card>

          {/* 종합 한줄평 */}
          <div className="rounded-2xl p-4 bg-gradient-to-r from-[#05C072] to-[#34D399]">
            <p className="text-sm font-bold text-white text-center">
              &ldquo;{report.summary}&rdquo;
            </p>
          </div>

          {/* 재생성 */}
          {reportRemaining !== null && reportRemaining > 0 && (
            <div className="text-center pt-2">
              <button
                onClick={generateReport}
                className="text-xs text-[#9AA99A] hover:text-[#05C072] transition-colors"
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
  return (
    <div className="flex items-center gap-2 mb-6">
      <button
        onClick={() => window.history.back()}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4F0] dark:bg-[#2D3D30] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A221A] dark:text-[#E8EEE8]">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
        투자 성향 분석
      </h1>
    </div>
  );
}
