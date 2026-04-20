"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  SectionTitle,
  LoadingSpinner,
  Divider,
  Skeleton,
  ThemeToggle,
  BottomSheet,
  Tabs,
} from "@/components/ui";

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
  avgPnl: number;
}
interface SectorItem {
  sector: string;
  pct: number;
}

interface StatsData {
  locked: boolean;
  totalCount: number;
  remaining?: number;
  holdingCount?: number;
  tagDistribution?: TagDist[];
  tagPnl?: TagPnl[];
  emotionPnl?: EmotionPnl[];
  avgHoldingDays?: number;
  holdingRanges?: HoldingRange[];
  sectorConcentration?: SectorItem[];
  manualSectorConcentration?: SectorItem[];
  noTagCount?: number;
}

interface PersonalitySummary {
  locked?: boolean;
  type: string;
  summary: string;
  winRate: number | null;
  avgHoldingDays: number | null;
  lossRatio: number | null;
  limitReached?: boolean;
  analyzedAt?: string;
  level?: 1 | 2;
}

interface CoachingItem {
  id: number;
  strengths: string[];
  mistakes: string[];
  goals: string[];
  createdAt: string;
}

// ─── 감정 아이콘 ─────────────────────────────────────────

const EMOTION_ICONS: Record<string, React.ReactNode> = {
  확신: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 20v-4"/><path d="M12 20V8"/><path d="M18 20V4"/><path d="M2 20h20"/></svg>,
  기대감: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  불안: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5-2 4-2 4 2 4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  FOMO: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 9h2"/><path d="M14 9h2"/><path d="M9 15c.6-1 1.5-1.5 3-1.5s2.4.5 3 1.5"/></svg>,
  포기: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/><path d="M2 20h20"/><line x1="2" y1="4" x2="22" y2="20" strokeWidth="2"/></svg>,
  기계적: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

// ─── 유틸 ────────────────────────────────────────────────

const pnlColor = (v: number) => (v >= 0 ? "var(--color-positive)" : "var(--color-negative)");
const pnlSign = (v: number) => (v >= 0 ? "+" : "");

type PatternTab = "reason" | "emotion" | "sector" | "holding";

// ─── 메인 페이지 ─────────────────────────────────────────

export default function PersonalityPage() {
  const router = useRouter();

  // 데이터
  const [stats, setStats] = useState<StatsData | null>(null);
  const [personality, setPersonality] = useState<PersonalitySummary | null>(null);
  const [coachings, setCoachings] = useState<CoachingItem[]>([]);
  const [coachingRemaining, setCoachingRemaining] = useState<number>(3);

  // UI 상태
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PatternTab>("reason");
  const [sectorMode, setSectorMode] = useState<"auto" | "manual">("manual");
  const [personalityLoading, setPersonalityLoading] = useState(false);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState("");
  const [expandedCoachings, setExpandedCoachings] = useState<Set<number>>(new Set());
  const [refreshMsg, setRefreshMsg] = useState("");
  const [showAllCoachings, setShowAllCoachings] = useState(false);
  const [showTagDistribution, setShowTagDistribution] = useState(false);

  const COACHING_PREVIEW_COUNT = 5;

  // ─── 데이터 패칭 ──────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, personalityRes, historyRes] = await Promise.allSettled([
        fetch("/api/trades/analysis?min=3"),
        fetch("/api/personality/summary?last=true"),
        fetch("/api/personality/history"),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        setStats(await statsRes.value.json());
      } else if (statsRes.status === "fulfilled") {
        setStats(await statsRes.value.json());
      }

      if (personalityRes.status === "fulfilled") {
        const data = await personalityRes.value.json();
        if (personalityRes.value.ok && !data.locked && !data.empty) setPersonality(data);
      }

      if (historyRes.status === "fulfilled" && historyRes.value.ok) {
        const data = await historyRes.value.json();
        const history: CoachingItem[] = data.history ?? [];
        setCoachings(history);
        setCoachingRemaining(data.remaining ?? 3);
        // 가장 최근 코칭 1개는 기본 펼침
        if (history.length > 0) {
          setExpandedCoachings(new Set([history[0].id]));
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── 유형 재진단 ──────────────────────────────────────

  async function refreshPersonality() {
    setRefreshMsg("");
    setPersonalityLoading(true);
    try {
      const res = await fetch("/api/personality/summary");
      const data = await res.json();
      if (res.ok) {
        if (!data.locked) {
          setPersonality(data);
        } else {
          setRefreshMsg(`매매 ${data.remaining}건 더 기록하면 진단할 수 있어요.`);
          setTimeout(() => setRefreshMsg(""), 4000);
        }
      } else if (res.status === 429) {
        setRefreshMsg("투자성향 진단은 하루 1회까지 가능합니다.");
        setTimeout(() => setRefreshMsg(""), 4000);
      }
    } catch {
      /* ignore */
    } finally {
      setPersonalityLoading(false);
    }
  }

  // ─── AI 코칭 생성 ────────────────────────────────────

  async function generateCoaching() {
    setCoachingLoading(true);
    setCoachingError("");
    try {
      const res = await fetch("/api/personality/history", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCoachingError(data.error ?? "코칭 생성에 실패했습니다.");
        if (data.remaining !== undefined) setCoachingRemaining(data.remaining);
        return;
      }
      setCoachings((prev) => [data, ...prev]);
      setCoachingRemaining(data.remaining ?? 0);
      setExpandedCoachings((prev) => new Set(prev).add(data.id));
    } catch {
      setCoachingError("네트워크 오류가 발생했습니다.");
    } finally {
      setCoachingLoading(false);
    }
  }

  const totalCount = stats?.totalCount ?? 0;

  // ─── 로딩 스켈레톤 ────────────────────────────────────

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
        <Header />
        <div className="rounded-[20px] p-6 mb-6" style={{ background: "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)" }}>
          <Skeleton className="h-3 w-24 mb-2 !bg-white/20" />
          <Skeleton className="h-6 w-40 mb-2 !bg-white/20" />
          <Skeleton className="h-4 w-full mb-4 !bg-white/15" />
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl py-2 px-3" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Skeleton className="h-2.5 w-10 mb-1.5 mx-auto !bg-white/20" />
                <Skeleton className="h-4 w-12 mx-auto !bg-white/20" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-20 !bg-white/15" />
            <Skeleton className="h-7 w-16 rounded-lg !bg-white/20" />
          </div>
        </div>
        {[1, 2].map((i) => (
          <Card key={i} className="mb-4">
            <Skeleton className="h-4 w-28 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // ─── 완전 잠금 (매매 3건 미만 + 보유 종목 0개) ─────────
  // 보유 종목이 있으면 Level 1 히어로만 보여주는 별도 분기로 진행

  if ((!stats || stats.locked) && (stats?.holdingCount ?? 0) === 0) {
    const remaining = stats?.remaining ?? 3;
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
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">
              투자 성향 분석이 잠겨있어요
            </h2>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-4">
              매매 기록이 <strong className="text-[var(--color-positive)]">3건</strong> 이상이거나
              보유 종목이 <strong className="text-[var(--color-positive)]">1개</strong> 이상 있어야 분석할 수 있어요
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
              <span className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)]">현재 {totalCount}건</span>
              <span className="text-sm font-bold text-[var(--color-negative)]">{remaining}건 더 필요해요</span>
            </div>
            <div className="mt-6">
              <Button onClick={() => router.push("/trades")}>매매 기록하러 가기</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Level 1 전용 페이지 (매매 3건 미만이지만 보유 종목 있음) ─
  // stats.locked = true 인데 holdingCount > 0인 경우
  // 히어로 + Level 1 진단만 보여주고, 데이터 패턴/감정 등 통계 섹션은 매매 부족 안내

  // ─── 데이터 추출 ──────────────────────────────────────

  const {
    tagDistribution = [],
    tagPnl = [],
    emotionPnl = [],
    avgHoldingDays = 0,
    holdingRanges = [],
    sectorConcentration = [],
    manualSectorConcentration = [],
    noTagCount = 0,
  } = stats;

  const holdingCount = stats.holdingCount ?? 0;
  const canShowHero = totalCount >= 5 || holdingCount >= 1;
  const canShowCoaching = totalCount >= 10;
  const isLevel1 = personality?.level === 1;

  // ─── 인사이트 자동 생성 ───────────────────────────────

  const worstTag = tagPnl.length > 0 ? tagPnl[tagPnl.length - 1] : null;
  const bestEmotion = emotionPnl.length > 0 ? emotionPnl[0] : null;
  const topSector = sectorConcentration.length > 0 ? sectorConcentration[0] : null;
  const bestHoldingRange = holdingRanges.length > 0
    ? holdingRanges.reduce((best, r) => r.avgPnl > best.avgPnl ? r : best, holdingRanges[0])
    : null;

  // ─── 렌더 ──────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6 animate-[fadeIn_0.4s_ease-out]">
      <Header />

      {/* ══════════ 섹션 1 — 나의 투자자 유형 ══════════ */}
      {canShowHero && (
        <div className="rounded-[20px] p-6 mb-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)" }}>
          {/* 장식 원 */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ background: "white" }} />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ background: "white" }} />

          <p className="text-xs font-semibold text-white/55 mb-1">나의 투자자 유형</p>

          {personality ? (
            <>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-white">{personality.type}</h2>
                {isLevel1 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/20 text-white">
                    보유 종목 기반
                  </span>
                )}
              </div>
              <p className="text-sm text-white/80 leading-relaxed mb-4">{personality.summary}</p>

              {isLevel1 ? (
                <div className="rounded-xl px-4 py-3 mb-4 text-[11px] text-white/75 leading-relaxed" style={{ background: "rgba(255,255,255,0.10)" }}>
                  매매 5건 이상 기록하면 승률 · 평균보유 · 손절비율까지 분석한 정밀 진단으로 업그레이드돼요
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "승률", value: personality.winRate != null ? `${personality.winRate}%` : "-" },
                    { label: "평균보유", value: personality.avgHoldingDays != null ? `${personality.avgHoldingDays}일` : "-" },
                    { label: "손절비율", value: personality.lossRatio != null ? `${personality.lossRatio}%` : "-" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl py-2 px-3 text-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                      <div className="text-[10px] text-white/60">{item.label}</div>
                      <div className="text-sm font-bold text-white">{item.value}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/50">
                  {personality.analyzedAt
                    ? (() => {
                        const [, m, d] = personality.analyzedAt.split("-");
                        return `${parseInt(m, 10)}월 ${parseInt(d, 10)}일 진단`;
                      })()
                    : "하루 1회 진단 가능"}
                </span>
                <button
                  onClick={refreshPersonality}
                  disabled={personalityLoading}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors disabled:opacity-50 cursor-pointer backdrop-blur-sm"
                >
                  {personalityLoading ? "분석 중..." : "AI 진단"}
                </button>
              </div>
              {refreshMsg && (
                <div className="mt-2 text-[11px] text-white/80 bg-white/10 rounded-lg px-3 py-2">
                  {refreshMsg}
                </div>
              )}
            </>
          ) : personalityLoading ? (
            <div className="flex items-center gap-3 py-4">
              <LoadingSpinner size={20} />
              <span className="text-sm text-white/80">유형을 분석 중입니다...</span>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-white/55 mb-3">아직 유형 진단이 생성되지 않았어요</p>
              <button
                onClick={refreshPersonality}
                className="text-sm font-semibold text-white underline underline-offset-2 hover:text-white/80 transition-colors"
              >
                지금 진단받기
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════ 매매 3건 미만이면 통계 섹션 잠금 ══════════ */}
      {stats.locked && (
        <>
          <SectionTitle title="데이터로 보는 내 패턴" />
          <Card className="mb-6">
            <div className="text-center py-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-g300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p className="text-sm font-medium text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-4">
                매매 <strong className="text-[var(--color-positive)]">{3 - totalCount}건</strong> 더 기록하면 매매 패턴 통계를 볼 수 있어요
              </p>
              <Button onClick={() => router.push("/trades")}>매매 기록하러 가기</Button>
            </div>
          </Card>
        </>
      )}

      {/* 5건 미만이지만 매매 3건 이상은 있는 경우 (Level 1 X) */}
      {!stats.locked && !canShowHero && (
        <Card className="mb-6">
          <div className="text-center py-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-g300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-sm font-medium text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-4">
              매매 <strong className="text-[var(--color-positive)]">{5 - totalCount}건</strong> 더 기록하면 투자자 유형을 진단해드려요
            </p>
            <Button onClick={() => router.push("/trades")}>매매 기록하러 가기</Button>
          </div>
        </Card>
      )}

      {/* ══════════ 섹션 2 — 데이터로 보는 내 패턴 (매매 3건 이상에서만) ══════════ */}
      {!stats.locked && <>
      <SectionTitle title="데이터로 보는 내 패턴" />

      {/* 탭 바 */}
      <Tabs
        variant="segment"
        className="mb-4"
        tabs={[
          { key: "reason" as const, label: "매매 이유" },
          { key: "emotion" as const, label: "감정" },
          { key: "sector" as const, label: "섹터" },
          { key: "holding" as const, label: "보유기간" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ── [매매 이유] 탭 ── */}
      {activeTab === "reason" && (
        <Card className="mb-6">
          {tagPnl.length > 0 ? (
            <>
              <div className="space-y-2.5">
                {tagPnl.map((item) => {
                  const maxAbs = Math.max(...tagPnl.map((t) => Math.abs(t.avgPnl)), 1);
                  const widthPct = Math.min((Math.abs(item.avgPnl) / maxAbs) * 100, 100);
                  return (
                    <div key={item.tag} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[var(--color-text)] w-[72px] shrink-0 truncate">{item.tag}</span>
                      <div className="flex-1 h-6 rounded-lg overflow-hidden relative bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
                        <div
                          className="h-full rounded-lg"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: pnlColor(item.avgPnl),
                            opacity: 0.8,
                            minWidth: 4,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold w-[52px] text-right shrink-0" style={{ color: pnlColor(item.avgPnl) }}>
                        {pnlSign(item.avgPnl)}{item.avgPnl.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {worstTag && worstTag.avgPnl < 0 && (
                <div className="mt-4 px-3 py-2 rounded-lg bg-[var(--color-negative-soft)] dark:bg-[rgba(240,68,82,0.1)]">
                  <p className="text-xs text-[var(--color-negative)]">
                    <strong>{worstTag.tag}</strong> 태그 매매 수익률이 {worstTag.avgPnl.toFixed(1)}%로 가장 낮아요
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-center text-[var(--color-g400)] py-6">
              매수→매도 매칭 데이터가 부족합니다.
            </p>
          )}

          {/* 태그 분포 (매수/매도 건수) — 접기/펼치기 */}
          {tagDistribution.length > 0 && (
            <>
              <Divider />
              <button
                onClick={() => setShowTagDistribution((v) => !v)}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <span className="text-xs font-semibold text-[var(--color-g500)] dark:text-[var(--color-muted)]">
                  태그별 거래 건수
                </span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-g400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform ${showTagDistribution ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showTagDistribution && (
                <div className="space-y-2 mt-3 animate-[fadeIn_0.2s_ease-out]">
                  {tagDistribution.slice(0, 6).map((item) => {
                    const maxVal = tagDistribution[0].total;
                    const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
                    return (
                      <div key={item.tag}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-[var(--color-text)]">{item.tag}</span>
                          <span className="text-[var(--color-g400)]">매수 {item.buy} · 매도 {item.sell}</span>
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
              )}
            </>
          )}
        </Card>
      )}

      {/* ── [감정] 탭 ── */}
      {activeTab === "emotion" && (
        <Card className="mb-6">
          {emotionPnl.length > 0 ? (
            <>
              <div className="space-y-3">
                {emotionPnl.map((item) => {
                  const maxAbs = Math.max(...emotionPnl.map((e) => Math.abs(e.avgPnl)), 1);
                  const widthPct = Math.min((Math.abs(item.avgPnl) / maxAbs) * 100, 100);
                  return (
                    <div key={item.emotion}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-g500)]">{EMOTION_ICONS[item.emotion] ?? null}</span>
                          <span className="text-sm font-medium text-[var(--color-text)]">{item.emotion}</span>
                          <span className="text-xs text-[var(--color-g400)]">({item.count}건)</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: pnlColor(item.avgPnl) }}>
                          {pnlSign(item.avgPnl)}{item.avgPnl.toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: pnlColor(item.avgPnl),
                            opacity: 0.7,
                            minWidth: 4,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {bestEmotion && bestEmotion.avgPnl > 0 && (
                <div className="mt-4 px-3 py-2 rounded-lg bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.1)]">
                  <p className="text-xs text-[var(--color-positive)]">
                    <strong>{bestEmotion.emotion}</strong> 상태에서 매매할 때 수익률이 {pnlSign(bestEmotion.avgPnl)}{bestEmotion.avgPnl.toFixed(1)}%로 가장 높아요
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-center text-[var(--color-g400)] py-6">
              감정 기록이 있는 매매 데이터가 부족합니다.
            </p>
          )}
        </Card>
      )}

      {/* ── [섹터] 탭 ── */}
      {activeTab === "sector" && (
        <Card className="mb-6">
          {/* 기본섹터 / 내섹터 토글 */}
          <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5 mb-4 w-fit">
            {([["manual", "내섹터"], ["auto", "기본섹터"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setSectorMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sectorMode === mode
                    ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] shadow-sm"
                    : "text-[var(--color-g500)] dark:text-[var(--color-muted)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {(() => {
            const data = sectorMode === "auto" ? sectorConcentration : manualSectorConcentration;
            const top = data.length > 0 ? data[0] : null;
            return data.length > 0 ? (
              <>
                <div className="space-y-2.5">
                  {data.map((item) => (
                    <div key={item.sector} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[var(--color-text)] w-[72px] shrink-0 truncate">{item.sector}</span>
                      <div className="flex-1 h-6 rounded-lg overflow-hidden relative bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
                        <div
                          className="h-full rounded-lg"
                          style={{
                            width: `${item.pct}%`,
                            backgroundColor: item.pct >= 40 ? "var(--color-warning)" : "var(--color-primary)",
                            opacity: 0.8,
                            minWidth: 4,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold w-[40px] text-right shrink-0 text-[var(--color-text)]">
                        {item.pct}%
                      </span>
                    </div>
                  ))}
                </div>
                {top && top.pct >= 40 && (
                  <div className="mt-4 px-3 py-2 rounded-lg bg-[rgba(255,123,0,0.08)] dark:bg-[rgba(255,123,0,0.1)]">
                    <p className="text-xs text-[var(--color-warning)]">
                      <strong>{top.sector}</strong> 섹터에 {top.pct}% 편중되어 있어요. 분산 투자를 고려해보세요.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-center text-[var(--color-g400)] py-6">
                {sectorMode === "auto" ? "보유 종목의 섹터 데이터가 없습니다." : "내 섹터가 지정된 종목이 없어요. 계좌 관리에서 섹터를 지정해보세요."}
              </p>
            );
          })()}
        </Card>
      )}

      {/* ── [보유기간] 탭 ── */}
      {activeTab === "holding" && (
        <Card className="mb-6">
          {holdingRanges.length > 0 ? (
            <>
              <div className="text-center mb-4">
                <span className="text-2xl font-extrabold text-[var(--color-positive)]">{avgHoldingDays}일</span>
                <span className="text-sm text-[var(--color-g400)] ml-2">평균 보유</span>
              </div>
              <div className="space-y-2.5">
                {holdingRanges.map((r) => {
                  const total = holdingRanges.reduce((a, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                  return (
                    <div key={r.label} className="flex items-center gap-3">
                      <span className="text-xs text-[var(--color-g500)] dark:text-[var(--color-muted)] w-16 shrink-0">{r.label}</span>
                      <div className="flex-1 h-2 rounded bg-[var(--color-g100)] dark:bg-[var(--color-border)]">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: "var(--color-primary)",
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-text)] w-10 text-right">{pct}%</span>
                      <span className="text-xs font-bold w-14 text-right" style={{ color: pnlColor(r.avgPnl) }}>
                        {pnlSign(r.avgPnl)}{r.avgPnl.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {bestHoldingRange && (
                <div className="mt-4 px-3 py-2 rounded-lg bg-[var(--color-primary-soft)] dark:bg-[rgba(45,184,122,0.1)]">
                  <p className="text-xs text-[var(--color-positive)]">
                    <strong>{bestHoldingRange.label}</strong> 보유 시 수익률이 {pnlSign(bestHoldingRange.avgPnl)}{bestHoldingRange.avgPnl.toFixed(1)}%로 가장 높아요
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-center text-[var(--color-g400)] py-6">
              매수→매도 매칭 데이터가 부족합니다.
            </p>
          )}
        </Card>
      )}

      {/* 이유 태그 미입력 넛지 */}
      {noTagCount > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl mb-6 border border-[var(--color-g200)] dark:border-[var(--color-border)]"
          style={{ background: "var(--color-surface)" }}
        >
          <p className="text-xs text-[var(--color-g500)] dark:text-[var(--color-muted)]">
            이유 태그 없는 거래 <strong className="text-[var(--color-text)]">{noTagCount}건</strong> — 채우면 분석이 정확해져요
          </p>
          <button
            onClick={() => router.push("/trades")}
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline shrink-0 ml-3"
          >
            채우기
          </button>
        </div>
      )}
      </>}

      {/* ══════════ 섹션 3 — AI 코칭 & 개선 플랜 ══════════ */}
      <SectionTitle
        title="AI 코칭"
        action={
          canShowCoaching && coachings.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--color-g400)]">잔여횟수 {coachingRemaining}/3회</span>
              <button
                onClick={generateCoaching}
                disabled={coachingLoading || coachingRemaining <= 0}
                className="px-3 py-1 text-xs font-bold rounded-lg text-white transition-colors disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {coachingLoading ? "생성 중..." : "AI 코칭 생성"}
              </button>
            </div>
          ) : null
        }
      />

      {/* 10건 미만 코칭 잠금 */}
      {!canShowCoaching && (
        <Card className="mb-4">
          <div className="text-center py-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-g300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-4">
              매매 <strong className="text-[var(--color-positive)]">{10 - totalCount}건</strong> 더 기록하면 AI 코칭이 열려요
            </p>
            <Button onClick={() => router.push("/trades")}>매매 기록하러 가기</Button>
          </div>
        </Card>
      )}

      {/* 코칭 에러 */}
      {coachingError && (
        <div className="rounded-xl px-4 py-2.5 mb-4 text-sm bg-[var(--color-negative-soft)] dark:bg-[rgba(240,68,82,0.1)] text-[var(--color-negative)]">
          {coachingError}
        </div>
      )}

      {/* 코칭 로딩 */}
      {coachingLoading && (
        <Card className="mb-4">
          <div className="flex flex-col items-center py-8 gap-3">
            <LoadingSpinner size={24} />
            <p className="text-sm text-[var(--color-g400)]">AI가 코칭을 생성 중입니다...</p>
          </div>
        </Card>
      )}

      {/* 코칭 결과가 없고 생성 가능할 때 */}
      {canShowCoaching && coachings.length === 0 && !coachingLoading && (
        <Card className="mb-4">
          <div className="text-center py-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" />
            </svg>
            <p className="text-sm text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-4">
              AI가 매매 패턴을 분석하고 개선 방향을 제시해드려요
            </p>
            <Button onClick={generateCoaching}>AI 코칭 생성</Button>
          </div>
        </Card>
      )}

      {/* 코칭 히스토리 — 최근 N개만 표시 */}
      {coachings.length > 0 && (
        <>
          <div className="space-y-3 mb-4">
            {coachings.slice(0, COACHING_PREVIEW_COUNT).map((coaching, idx) => (
              <CoachingCard
                key={coaching.id}
                coaching={coaching}
                isLatest={idx === 0}
                isExpanded={expandedCoachings.has(coaching.id)}
                onToggle={() => setExpandedCoachings((prev) => {
                  const next = new Set(prev);
                  if (next.has(coaching.id)) next.delete(coaching.id);
                  else next.add(coaching.id);
                  return next;
                })}
              />
            ))}
          </div>

          {coachings.length > COACHING_PREVIEW_COUNT && (
            <button
              onClick={() => setShowAllCoachings(true)}
              className="w-full mb-4 py-3 text-sm font-semibold text-[var(--color-primary)] border border-[var(--color-g200)] dark:border-[var(--color-border)] rounded-2xl hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-card)] transition-colors cursor-pointer"
            >
              전체 히스토리 보기 ({coachings.length}개)
            </button>
          )}
        </>
      )}

      {/* 전체 히스토리 모달 */}
      <BottomSheet
        open={showAllCoachings}
        onClose={() => setShowAllCoachings(false)}
        title={`AI 코칭 전체 히스토리 (${coachings.length}개)`}
      >
        <div className="space-y-3">
          {coachings.map((coaching, idx) => (
            <CoachingCard
              key={coaching.id}
              coaching={coaching}
              isLatest={idx === 0}
              isExpanded={expandedCoachings.has(coaching.id)}
              onToggle={() => setExpandedCoachings((prev) => {
                const next = new Set(prev);
                if (next.has(coaching.id)) next.delete(coaching.id);
                else next.add(coaching.id);
                return next;
              })}
            />
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── 코칭 카드 컴포넌트 ─────────────────────────────────

function CoachingCard({
  coaching,
  isLatest,
  isExpanded,
  onToggle,
}: {
  coaching: CoachingItem;
  isLatest: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const dateStr = new Date(coaching.createdAt).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
  return (
    <Card>
      <button onClick={onToggle} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-primary)]">
            {isLatest ? "최신" : dateStr}
          </span>
          {isLatest && (
            <span className="text-xs text-[var(--color-g400)]">{dateStr} 생성</span>
          )}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-g400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 animate-[fadeIn_0.3s_ease-out]">
          {/* 잘하고 있는 것 */}
          <div>
            <p className="text-xs font-bold text-[var(--color-positive)] mb-2 flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              잘하고 있는 것
            </p>
            <div className="space-y-1.5">
              {coaching.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                  <span className="text-[var(--color-positive)] shrink-0 mt-0.5">●</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 반복되는 실수 */}
          <div>
            <p className="text-xs font-bold text-[var(--color-warning)] mb-2 flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              반복되는 실수
            </p>
            <div className="space-y-1.5">
              {coaching.mistakes.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                  <span className="text-[var(--color-negative)] shrink-0 mt-0.5">●</span>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 이번 달 개선 목표 */}
          <div>
            <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "var(--color-primary)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              이번 달 개선 목표
            </p>
            <div className="space-y-1.5">
              {coaching.goals.map((g, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                  <span className="shrink-0 mt-0.5 text-xs font-bold" style={{ color: "var(--color-primary)" }}>{i + 1}</span>
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── 헤더 컴포넌트 ───────────────────────────────────────

function Header() {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
        투자 성향
      </h1>
      <div className="md:hidden"><ThemeToggle /></div>
    </div>
  );
}
