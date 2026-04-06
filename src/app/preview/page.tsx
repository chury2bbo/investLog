"use client";

import { useState } from "react";

// ─── 새 디자인 시스템 컬러 토큰 ─────────────────────────────────
const T = {
  // Brand (웜그린)
  primary: "#2DB87A",
  primaryMid: "#1F9E64",
  primaryDark: "#16754A",
  primarySoft: "#E6F7EF",

  // Semantic
  positive: "#05C072",
  positiveSoft: "#E8FBF3",
  negative: "#F04452",
  negativeSoft: "#FFF0F1",
  warning: "#FF7B00",

  // Neutral — Light
  bg: "#F2F4F2",
  surface: "#FFFFFF",
  g100: "#F0F3F0",
  g200: "#E3E8E3",
  g300: "#C8D1C8",
  g400: "#9DAD9D",
  g500: "#6B7B6B",
  g600: "#4A5A4A",
  text: "#1A221A",

  // Neutral — Dark
  dkBg: "#0D1210",
  dkSurface: "#151C14",
  dkCard: "#1C2420",
  dkBorder: "#283426",
  dkText: "#D8E8D8",
  dkMuted: "#56725A",
};

// ─── lucide 스타일 아이콘 ───────────────────────────────────────
function Icon({ d, size = 19, color = T.g400, strokeWidth = 1.75 }: { d: string; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const Icons = {
  trend: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
  card: "M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z M2 10h20",
  chart: "M18 20V10 M12 20V4 M6 20v-6",
  arrowUpRight: "M7 17L17 7 M7 7h10v10",
  arrowDnRight: "M7 7l10 10 M17 7v10H7",
  chevronRight: "M9 18l6-6-6-6",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  alertCircle: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 8v4 M12 16h.01",
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  journal: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  brain: "M9.5 2A2.5 2.5 0 0 1 12 4.5v15 M12 4.5A2.5 2.5 0 0 1 14.5 2 M7 7a5 5 0 0 0 0 10 M17 7a5 5 0 0 1 0 10",
  plus: "M12 5v14 M5 12h14",
  sun: "M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
};

// ─── 컴포넌트: Card ─────────────────────────────────────────────
function Card({ children, className = "", dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div
      className={`p-[22px] ${className}`}
      style={{
        borderRadius: 18,
        backgroundColor: dark ? T.dkCard : T.surface,
        boxShadow: dark ? "none" : "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        border: dark ? `1px solid ${T.dkBorder}` : "none",
      }}
    >
      {children}
    </div>
  );
}

// ─── 컴포넌트: Button ───────────────────────────────────────────
function Button({ children, variant = "primary", size = "md", dark = false, onClick }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "black" | "outline";
  size?: "sm" | "md" | "lg";
  dark?: boolean;
  onClick?: () => void;
}) {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-[13px] text-sm", lg: "w-full py-[13px] text-sm" };
  const styles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: T.primary, color: "#fff", boxShadow: `0 2px 12px ${T.primary}44` },
    secondary: {
      backgroundColor: dark ? T.dkCard : T.g100,
      color: dark ? T.dkText : T.g600,
      border: dark ? `1px solid ${T.dkBorder}` : "none",
    },
    black: { backgroundColor: T.text, color: "#fff" },
    outline: { backgroundColor: "transparent", color: T.primary, border: `1.5px solid ${T.primary}` },
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-xl font-bold transition-opacity inline-flex items-center justify-center cursor-pointer ${sizes[size]}`}
      style={{ ...styles[variant], letterSpacing: "-0.01em" }}
    >
      {children}
    </button>
  );
}

// ─── 컴포넌트: Tag ──────────────────────────────────────────────
function Tag({ label, color = "gray", dark = false }: { label: string; color?: "green" | "gray" | "blue"; dark?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    green: { backgroundColor: T.primarySoft, color: T.primary },
    gray: { backgroundColor: dark ? T.dkBorder : T.g100, color: dark ? T.dkMuted : T.g500 },
    blue: { backgroundColor: "#E8F0FE", color: "#4285F4" },
  };
  return (
    <span className="text-[11px] font-bold px-[7px] py-[2px] tracking-wide" style={{ borderRadius: 5, ...styles[color] }}>
      {label}
    </span>
  );
}

// ─── 컴포넌트: PnlTag ──────────────────────────────────────────
function PnlTag({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span
      className="text-[11px] font-bold px-[10px] py-[3px]"
      style={{
        borderRadius: 6,
        backgroundColor: pos ? T.positiveSoft : T.negativeSoft,
        color: pos ? T.positive : T.negative,
      }}
    >
      {pos ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

// ─── 히어로 카드 ────────────────────────────────────────────────
function HeroCard({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 22,
        padding: "28px 28px 22px",
        background: `linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 100%)`,
        boxShadow: `0 8px 32px ${T.primary}44`,
      }}
    >
      {/* 장식 원 */}
      <div className="absolute rounded-full" style={{ width: 180, height: 180, top: -40, right: -40, background: "rgba(255,255,255,0.07)" }} />
      <div className="absolute rounded-full" style={{ width: 140, height: 140, right: 30, bottom: -60, background: "rgba(255,255,255,0.05)" }} />

      <div className="relative">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>총 보유 자산</span>
          <button className="w-5 h-5 rounded flex items-center justify-center" style={{ opacity: 0.6 }}>
            <Icon d={Icons.refresh} size={13} color="white" strokeWidth={2.5} />
          </button>
        </div>

        <div className="text-4xl font-extrabold text-white" style={{ letterSpacing: "-0.02em" }}>
          48,234,500<span className="text-lg font-normal ml-1">원</span>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <span className="px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: "rgba(255,255,255,0.18)", borderRadius: 8 }}>
            +234,500원 +0.49%
          </span>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>전일 대비</span>
        </div>

        {/* 미니카드 */}
        <div className="flex gap-2 mt-5">
          {[
            { label: "국내주식", value: "₩2,840만" },
            { label: "해외주식", value: "$12.3K" },
            { label: "예수금", value: "₩320만" },
          ].map((item) => (
            <div key={item.label} className="flex-1 px-2.5 py-3" style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, backdropFilter: "blur(8px)" }}>
              <div className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>{item.label}</div>
              <div className="text-sm font-bold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 요약 지표 4칸 ──────────────────────────────────────────────
function MetricGrid({ dark = false }: { dark?: boolean }) {
  const metrics = [
    { label: "총 수익률", value: "+12.4%", color: T.positive },
    { label: "총 수익금", value: "+₩534만", color: T.positive },
    { label: "보유 종목", value: "8종목", color: undefined },
    { label: "총 계좌", value: "2개", color: undefined },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {metrics.map((m) => (
        <Card key={m.label} dark={dark} className="!p-3">
          <div className="text-[11px] mb-1" style={{ color: dark ? T.dkMuted : T.g500 }}>{m.label}</div>
          <div className="text-[15px] font-extrabold" style={{ color: m.color ?? (dark ? T.dkText : T.text), letterSpacing: "-0.02em" }}>
            {m.value}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── 자산 배분 바 ───────────────────────────────────────────────
function AllocationBar({ dark = false }: { dark?: boolean }) {
  const segments = [
    { label: "국내주식", color: T.primary, pct: 45 },
    { label: "해외주식", color: T.primaryMid, pct: 32 },
    { label: "원화예수금", color: T.g300, pct: 15 },
    { label: "달러예수금", color: T.g400, pct: 8 },
  ];
  return (
    <Card dark={dark}>
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-[15px] font-bold" style={{ color: dark ? T.dkText : T.text }}>자산 배분</span>
        <Button variant="secondary" size="sm" dark={dark}>새로고침</Button>
      </div>
      <div className="flex h-2 gap-0.5 mb-3.5" style={{ borderRadius: 99 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.color, borderRadius: 99 }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }} />
            <span className="text-[11px]" style={{ color: dark ? T.dkMuted : T.g500 }}>{s.label}</span>
            <span className="text-[11px] font-bold" style={{ color: dark ? T.dkText : T.text }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── 계좌 리스트 ────────────────────────────────────────────────
function AccountList({ dark = false }: { dark?: boolean }) {
  const accounts = [
    { name: "키움증권", type: "국내·해외", count: 5, pnl: 8.32 },
    { name: "삼성증권", type: "국내", count: 3, pnl: -2.14 },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-bold" style={{ color: dark ? T.dkText : T.text }}>계좌 현황</h2>
      </div>
      <div className="space-y-2.5">
        {accounts.map((acc) => (
          <Card key={acc.name} dark={dark}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-[42px] h-[42px] flex items-center justify-center" style={{ borderRadius: 12, backgroundColor: dark ? `${T.primary}18` : T.primarySoft }}>
                  <Icon d={Icons.card} size={20} color={T.primary} strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-[14px] font-bold" style={{ color: dark ? T.dkText : T.text }}>{acc.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: dark ? T.dkMuted : T.g400 }}>{acc.type} · {acc.count}종목</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PnlTag value={acc.pnl} />
                <Icon d={Icons.chevronRight} size={16} color={dark ? T.dkMuted : T.g300} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── 경고 배너 ──────────────────────────────────────────────────
function WarningBanner({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        borderRadius: 12,
        backgroundColor: dark ? T.dkCard : "#FFFBF5",
        border: `1px solid ${dark ? T.dkBorder : "#FFE0B0"}`,
      }}
    >
      <Icon d={Icons.alertCircle} size={18} color={T.warning} strokeWidth={2} />
      <span className="flex-1 text-xs" style={{ color: dark ? T.dkText : T.text }}>
        예수금이 부족합니다. 입금 후 매수해주세요.
      </span>
      <button
        className="text-xs font-bold px-2.5 py-1"
        style={{ color: T.warning, border: `1px solid ${T.warning}`, borderRadius: 8 }}
      >
        입금
      </button>
    </div>
  );
}

// ─── 계좌상세 히어로 시안 (다크 그라디언트) ──────────────────
function AccountHero({ dark = false, pnlRate, pnl, totalKRW }: { dark?: boolean; pnlRate: number; pnl: number; totalKRW: number }) {
  const isProfit = pnlRate >= 0;
  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 22,
        padding: "24px 24px 20px",
        background: `linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 100%)`,
      }}
    >
      {/* 데코 */}
      <div className="absolute rounded-full" style={{ width: 160, height: 160, top: -50, right: -30, background: "rgba(255,255,255,0.04)" }} />
      <div className="absolute rounded-full" style={{ width: 100, height: 100, bottom: -40, right: 40, background: "rgba(255,255,255,0.03)" }} />

      <div className="relative">
        {/* 상단: 합산 + 수익률 뱃지 */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              합산 (원화)
            </div>
            <div className="text-[28px] font-extrabold text-white" style={{ letterSpacing: "-0.02em" }}>
              ₩{Math.floor(totalKRW).toLocaleString()}
            </div>
          </div>
          {/* 수익률 뱃지 — 흰색 텍스트 + 화살표 + 배경 명암 구분 */}
          <div
            className="rounded-xl px-3 py-2 text-right"
            style={{ backgroundColor: isProfit ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)" }}
          >
            <div className="flex items-center gap-1 justify-end">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="white">
                {isProfit
                  ? <><path d="M7 17L17 7" /><path d="M7 7h10v10" /></>
                  : <><path d="M7 7l10 10" /><path d="M17 7v10H7" /></>
                }
              </svg>
              <span className="text-[15px] font-bold text-white">
                {isProfit ? "+" : ""}{pnlRate.toFixed(2)}%
              </span>
            </div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
              {pnl >= 0 ? "+" : "-"}₩{Math.floor(Math.abs(pnl)).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 예수금 · 평가금 · 합산 테이블 */}
        <div className="mt-3 space-y-1.5">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>예수금</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>평가금</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>합산(원화)</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-xs font-bold text-white">₩320만</div>
            <div className="text-xs font-bold text-white">₩2,840만</div>
            <div className="text-xs font-bold text-white">₩{Math.floor(totalKRW).toLocaleString()}</div>
          </div>
        </div>

        {/* 입금/출금 버튼 */}
        <div className="flex gap-2 mt-3.5">
          <button
            className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            + 입금
          </button>
          <button
            className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-white"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            출금
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 계좌상세 히어로 B안 (불투명 흰색 배경 뱃지) ─────────────
function AccountHeroB({ dark = false, pnlRate, pnl, totalKRW }: { dark?: boolean; pnlRate: number; pnl: number; totalKRW: number }) {
  const isProfit = pnlRate >= 0;
  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 22,
        padding: "24px 24px 20px",
        background: `linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 100%)`,
      }}
    >
      <div className="absolute rounded-full" style={{ width: 160, height: 160, top: -50, right: -30, background: "rgba(255,255,255,0.04)" }} />
      <div className="absolute rounded-full" style={{ width: 100, height: 100, bottom: -40, right: 40, background: "rgba(255,255,255,0.03)" }} />

      <div className="relative">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>합산 (원화)</div>
            <div className="text-[28px] font-extrabold text-white" style={{ letterSpacing: "-0.02em" }}>
              ₩{Math.floor(totalKRW).toLocaleString()}
            </div>
          </div>
          {/* B안 뱃지: 흰색 불투명 배경 + 컬러 텍스트 */}
          <div
            className="rounded-xl px-3 py-2 text-right"
            style={{ backgroundColor: "rgba(255,255,255,0.92)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
          >
            <div className="flex items-center gap-1 justify-end">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                stroke={isProfit ? T.positive : T.negative}
              >
                {isProfit
                  ? <><path d="M7 17L17 7" /><path d="M7 7h10v10" /></>
                  : <><path d="M7 7l10 10" /><path d="M17 7v10H7" /></>
                }
              </svg>
              <span className="text-[15px] font-bold" style={{ color: isProfit ? T.positive : T.negative }}>
                {isProfit ? "+" : ""}{pnlRate.toFixed(2)}%
              </span>
            </div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color: isProfit ? T.positive : T.negative, opacity: 0.7 }}>
              {pnl >= 0 ? "+" : "-"}₩{Math.floor(Math.abs(pnl)).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>예수금</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>평가금</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>합산(원화)</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-xs font-bold text-white">₩320만</div>
            <div className="text-xs font-bold text-white">₩2,840만</div>
            <div className="text-xs font-bold text-white">₩{Math.floor(totalKRW).toLocaleString()}</div>
          </div>
        </div>

        <div className="flex gap-2 mt-3.5">
          <button className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>+ 입금</button>
          <button className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>출금</button>
        </div>
      </div>
    </div>
  );
}

// ─── 사이드바 미리보기 ──────────────────────────────────────────
function SidebarPreview({ dark = false }: { dark?: boolean }) {
  const navItems = [
    { icon: Icons.home, label: "대시보드", active: true },
    { icon: Icons.card, label: "계좌" },
    { icon: Icons.journal, label: "매매" },
    { icon: Icons.chart, label: "분석" },
    { icon: Icons.brain, label: "성향" },
  ];
  return (
    <div
      className="w-16 shrink-0 flex flex-col items-center py-[18px] h-[480px]"
      style={{
        backgroundColor: dark ? T.dkSurface : T.surface,
        borderRight: `1px solid ${dark ? T.dkBorder : T.g200}`,
        borderRadius: "18px 0 0 18px",
      }}
    >
      {/* 로고 */}
      <div
        className="w-9 h-9 flex items-center justify-center mb-7"
        style={{
          borderRadius: 11,
          background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})`,
          boxShadow: `0 4px 14px ${T.primary}40`,
        }}
      >
        <Icon d={Icons.trend} size={17} color="white" strokeWidth={2.5} />
      </div>

      {/* 네비 */}
      <div className="flex-1 flex flex-col gap-1 w-full">
        {navItems.map((item) => (
          <div key={item.label} className="relative">
            <button
              className="w-full flex items-center justify-center py-3"
              style={{
                background: item.active
                  ? dark ? `${T.primary}18` : T.primarySoft
                  : "transparent",
              }}
            >
              {item.active && (
                <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px]" style={{ backgroundColor: T.primary, borderRadius: "0 3px 3px 0" }} />
              )}
              <Icon d={item.icon} size={19} color={item.active ? T.primary : (dark ? T.dkMuted : T.g400)} strokeWidth={item.active ? 2 : 1.75} />
            </button>
          </div>
        ))}
      </div>

      {/* 하단 */}
      <div className="flex flex-col gap-2 items-center">
        <button className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ backgroundColor: dark ? T.dkCard : T.g100 }}>
          <Icon d={dark ? Icons.sun : Icons.moon} size={15} color={dark ? T.dkMuted : T.g400} />
        </button>
        <div
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-extrabold text-white"
          style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}
        >
          S
        </div>
      </div>
    </div>
  );
}

// ─── 메인 미리보기 페이지 ───────────────────────────────────────
export default function PreviewPage() {
  const [dark, setDark] = useState(false);

  const bg = dark ? T.dkBg : T.bg;
  const text = dark ? T.dkText : T.text;
  const muted = dark ? T.dkMuted : T.g500;

  return (
    <div className="min-h-screen" style={{ backgroundColor: bg, fontFamily: "'Pretendard', 'Apple SD Gothic Neo', -apple-system, system-ui, sans-serif" }}>
      {/* 모드 토글 */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3" style={{ backgroundColor: bg, borderBottom: `1px solid ${dark ? T.dkBorder : T.g200}` }}>
        <span className="text-sm font-bold" style={{ color: text }}>
          새 디자인 시스템 미리보기
        </span>
        <button
          onClick={() => setDark(!dark)}
          className="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
          style={{
            backgroundColor: dark ? T.dkCard : T.g100,
            color: dark ? T.dkText : T.g600,
            border: dark ? `1px solid ${T.dkBorder}` : "none",
          }}
        >
          {dark ? "☀️ 라이트" : "🌙 다크"}
        </button>
      </div>

      <div className="flex">
        {/* 사이드바 */}
        <div className="hidden md:block sticky top-[49px] h-[calc(100vh-49px)]">
          <SidebarPreview dark={dark} />
        </div>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 px-6 md:px-12 py-9 pb-24">
          <div className="max-w-[700px] mx-auto space-y-7">
            {/* 인사말 + 환율 */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm" style={{ color: muted }}>안녕하세요, 투자자님</p>
                <h1 className="text-[22px] font-extrabold mt-0.5" style={{ color: text, letterSpacing: "-0.02em" }}>
                  내 투자 현황
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-right">
                  <div className="text-[11px]" style={{ color: dark ? T.dkMuted : T.g400 }}>USD/KRW</div>
                  <div className="text-sm font-bold" style={{ color: text }}>1,380</div>
                </div>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: dark ? T.dkCard : T.g100 }}>
                  <Icon d={Icons.refresh} size={14} color={muted} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* 히어로 */}
            <HeroCard dark={dark} />

            {/* 요약 지표 */}
            <MetricGrid dark={dark} />

            {/* 자산 배분 */}
            <AllocationBar dark={dark} />

            {/* 경고 배너 */}
            <WarningBanner dark={dark} />

            {/* 계좌 */}
            <AccountList dark={dark} />

            {/* ── 계좌상세 히어로 시안 ── */}
            <div>
              <h2 className="text-[13px] font-bold mb-3" style={{ color: text }}>계좌상세 히어로 — 수익 상태</h2>
              <AccountHero dark={dark} pnlRate={8.32} pnl={1234500} totalKRW={48234500} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold mb-3" style={{ color: text }}>계좌상세 히어로 — 손실 상태</h2>
              <AccountHero dark={dark} pnlRate={-3.21} pnl={-567800} totalKRW={32456700} />
            </div>

            {/* B안: 불투명 흰색 배경 뱃지 */}
            <div>
              <h2 className="text-[13px] font-bold mb-1" style={{ color: text }}>B안 — 불투명 흰색 배경 뱃지</h2>
              <p className="text-[11px] mb-3" style={{ color: muted }}>수익: 흰색 배경 + 그린 텍스트 / 손실: 흰색 배경 + 레드 텍스트</p>
              <div className="space-y-3">
                <AccountHeroB dark={dark} pnlRate={8.32} pnl={1234500} totalKRW={48234500} />
                <AccountHeroB dark={dark} pnlRate={-3.21} pnl={-567800} totalKRW={32456700} />
              </div>
            </div>

            {/* 컴포넌트 샘플 */}
            <div>
              <h2 className="text-[13px] font-bold mb-3" style={{ color: text }}>버튼 & 태그</h2>
              <Card dark={dark}>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Button variant="primary" dark={dark}>Primary</Button>
                  <Button variant="secondary" dark={dark}>Secondary</Button>
                  <Button variant="black" dark={dark}>Black</Button>
                  <Button variant="outline" dark={dark}>Outline</Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Tag label="KOSPI" color="green" dark={dark} />
                  <Tag label="해외" color="blue" dark={dark} />
                  <Tag label="배당주" color="gray" dark={dark} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <PnlTag value={12.34} />
                  <PnlTag value={-5.67} />
                  <PnlTag value={0.0} />
                </div>
              </Card>
            </div>

            {/* 컬러 팔레트 */}
            <div>
              <h2 className="text-[13px] font-bold mb-3" style={{ color: text }}>컬러 팔레트</h2>
              <Card dark={dark}>
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-bold mb-1.5" style={{ color: muted }}>Brand (웜그린)</div>
                    <div className="flex gap-2">
                      {[
                        { c: T.primaryDark, l: "Dark" },
                        { c: T.primaryMid, l: "Mid" },
                        { c: T.primary, l: "Primary" },
                        { c: T.primarySoft, l: "Soft" },
                      ].map(({ c, l }) => (
                        <div key={l} className="flex-1">
                          <div className="h-8 rounded-lg mb-1" style={{ backgroundColor: c }} />
                          <div className="text-[10px] text-center" style={{ color: muted }}>{l}<br />{c}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold mb-1.5" style={{ color: muted }}>Semantic</div>
                    <div className="flex gap-2">
                      {[
                        { c: T.positive, l: "Positive" },
                        { c: T.positiveSoft, l: "Pos Soft" },
                        { c: T.negative, l: "Negative" },
                        { c: T.negativeSoft, l: "Neg Soft" },
                        { c: T.warning, l: "Warning" },
                      ].map(({ c, l }) => (
                        <div key={l} className="flex-1">
                          <div className="h-8 rounded-lg mb-1" style={{ backgroundColor: c }} />
                          <div className="text-[10px] text-center" style={{ color: muted }}>{l}<br />{c}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* FAB */}
      <button
        className="fixed bottom-8 right-8 w-[52px] h-[52px] rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})`,
          boxShadow: `0 4px 20px ${T.primary}55`,
        }}
      >
        <Icon d={Icons.plus} size={22} color="white" strokeWidth={2.5} />
      </button>
    </div>
  );
}
