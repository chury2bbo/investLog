"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── 테마 토큰 ───────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#F5F6F6", card: "#FFFFFF", cardAlt: "#F2F3F3", border: "#E6E8E8",
  primary: "#05C072", primaryDark: "#027A47", primaryMid: "#1F9E64", primarySoft: "#E8F5EF",
  text: "#1A221A", muted: "#6B7B6B", dim: "#7A8880",
  negative: "#F04452", negativeSoft: "#FFF0F1",
  warning: "#FF7B00", warningSoft: "#FFF5ED",
  blue: "#4285F4",
  glow: "radial-gradient(circle, rgba(5,192,114,0.22) 0%, rgba(5,192,114,0.07) 45%, rgba(245,247,245,0) 70%)",
};
const DARK = {
  bg: "#0E0F0E", card: "#1E1F1F", cardAlt: "#171818", border: "#2A2C2A",
  primary: "#05C072", primaryDark: "#027A47", primaryMid: "#1F9E64", primarySoft: "rgba(5,192,114,0.14)",
  text: "#E2E5E2", muted: "#A0A5A0", dim: "#929696",
  negative: "#F04452", negativeSoft: "rgba(240,68,82,0.12)",
  warning: "#FF7B00", warningSoft: "rgba(255,123,0,0.12)",
  blue: "#4285F4",
  glow: "radial-gradient(circle, rgba(5,192,114,0.45) 0%, rgba(5,192,114,0.15) 45%, rgba(13,18,16,0) 70%)",
};
type Theme = typeof LIGHT;

// ─── useCounter ──────────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return count;
}

// ─── SVG 아이콘 ──────────────────────────────────────────────────────────────
function Icon({ d, size = 18, color = "currentColor", strokeWidth = 1.8 }: {
  d: string | string[]; size?: number; color?: string; strokeWidth?: number;
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const I = {
  chart:      ["M3 3v18h18", "M7 16l4-4 4 4 4-4"],
  edit:       ["M12 20h9", "M16.4 3.6a2 2 0 0 1 2.8 2.8L7.2 18.4a2 2 0 0 1-.8.5l-2.9.8.8-2.9a2 2 0 0 1 .5-.8z"],
  search:     ["M21 21l-4.35-4.35", "M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"],
  camera:     ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z", "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  trending:   ["M22 7L13.5 15.5l-5-5L2 17", "M16 7h6v6"],
  brain:      ["M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-3.16", "M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-3.16"],
  cpu:        ["M12 2a2 2 0 0 0-2 2v1H8a2 2 0 0 0-2 2v2H4a2 2 0 0 0 0 4h2v2a2 2 0 0 0 2 2h2v1a2 2 0 0 0 4 0v-1h2a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 0-4h-2V7a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2z", "M10 10h4v4h-4z"],
  smartphone: ["M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z", "M12 18h.01"],
  sun:        ["M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42", "M12 17A5 5 0 1 0 12 7a5 5 0 0 0 0 10z"],
  moon:       ["M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"],
  arrow_r:    "M5 12h14M12 5l7 7-7 7",
  arrow_l:    "M19 12H5M12 19l-7-7 7-7",
  logo:       ["M22 7L13.5 15.5l-5-5L2 17", "M16 7h6v6"],
  person:     ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  zap:        "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  repeat:     ["M17 1l4 4-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 23l-4-4 4-4", "M21 13v2a4 4 0 0 1-4 4H3"],
  users:      ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  globe:      ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"],
  download:   ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  git:        ["M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"],
  target:     ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 6a6 6 0 1 0 0 12A6 6 0 0 0 12 6z", "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"],
};

// ─── 공통 ────────────────────────────────────────────────────────────────────
function SlideHeader({ num, title, T, center }: { num: string; title: string; T: Theme; center?: boolean }) {
  return (
    <div className={`flex items-center gap-3 fade-up-1 ${center ? "justify-center" : ""}`}>
      <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: T.primarySoft, color: T.primary }}>{num}</span>
      <h2 className="text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>{title}</h2>
    </div>
  );
}

// ─── S0: 표지 (다크 + 그린 글로우) ──────────────────────────────────────────
function Slide1({ T }: { T: Theme }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ backgroundColor: T.bg }}>
      {/* 배경 dot grid */}
      <div className="print-hide absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: `radial-gradient(circle, ${T.primary} 1px, transparent 1px)`, backgroundSize: "36px 36px" }} />
      {/* 그린 글로우 */}
      <div className="print-hide absolute rounded-full pointer-events-none"
        style={{ width: 800, height: 800, background: T.glow, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

      <div className="relative z-10 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="버텨일지" className="mb-10 fade-up-1"
          style={{ width: 140, height: 140, borderRadius: 32, boxShadow: "0 0 60px rgba(5,192,114,0.45), 0 20px 40px rgba(0,0,0,0.6)" }} />

        <h1 className="text-9xl font-extrabold tracking-tight mb-4 fade-up-2" style={{ color: T.text, lineHeight: 1 }}>
          버텨일지
        </h1>
        <p className="text-3xl font-bold mb-3 fade-up-3" style={{ color: T.primary }}>
          개미의 투자 반성 도구
        </p>
        <p className="text-xl mb-16 fade-up-4" style={{ color: T.muted }}>
          기록이 수익이 된다
        </p>

        <div className="flex gap-4 mb-10 fade-up-5 justify-center">
          {[{ name: "김수현", role: "Frontend · UI/UX" }, { name: "최우철", role: "Backend · API · DB" }].map(m => (
            <div key={m.name} className="flex items-center gap-2.5 px-5 py-3 rounded-2xl w-48"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <Icon d={I.person} size={14} color={T.primary} strokeWidth={2} />
              <div className="text-left">
                <div className="text-base font-bold" style={{ color: T.text }}>{m.name}</div>
                <div className="text-xs" style={{ color: T.muted }}>{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── S1: 탄생 배경 (Why + Problem 통합) ──────────────────────────────────────
function SlideBackground({ T }: { T: Theme }) {
  const cards = [
    { icon: I.chart,      iconColor: T.primary,
      title: "엑셀로 관리하던 가족 계좌",
      desc: <><strong style={{ color: T.text }}>이유를 기록할 수 있는 구조 자체가 없었다</strong> — 엑셀 수기 관리의 한계</> },
    { icon: I.smartphone, iconColor: T.warning,
      title: "증권사 앱의 구조적 한계",
      desc: <><strong style={{ color: T.text }}>잦은 매매 유도 구조</strong> — 장기투자자에게 맞지 않음</> },
    { icon: I.repeat,     iconColor: T.negative,
      title: "기록 없음 → 반복 손실",
      desc: <>심리·패턴을 인식할 <strong style={{ color: T.text }}>데이터가 쌓이지 않아</strong> 같은 실수가 반복된다</> },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-16">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-7">

        <SlideHeader num="01" title="왜 만들었나" T={T} />

        <div className="grid gap-5 fade-up-2" style={{ gridTemplateColumns: "1.4fr 1fr" }}>

          {/* 왼쪽: 문제 3카드 */}
          <div className="flex flex-col gap-2.5">
            {cards.map((c, i) => (
              <div key={c.title} className={`flex gap-3.5 items-start p-4 rounded-xl fade-up-${i + 2}`}
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: c.iconColor + "18" }}>
                  <Icon d={c.icon} size={17} color={c.iconColor} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-[15px] font-black mb-1" style={{ color: T.text }}>{c.title}</div>
                  <div className="text-[14px] leading-relaxed" style={{ color: T.muted }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 오른쪽: 결론 강조 박스 */}
          <div className="fade-up-5" style={{ display: "flex", alignSelf: "stretch" }}>
            <div className="w-full flex flex-col justify-center px-7 py-8 rounded-xl"
              style={{
                backgroundColor: `${T.primary}08`,
                borderTop: `1px solid ${T.primary}33`,
                borderRight: `1px solid ${T.primary}33`,
                borderBottom: `1px solid ${T.primary}33`,
                borderLeft: `4px solid ${T.primary}`,
                borderRadius: 12,
              }}>
              <div className="text-[11px] font-bold tracking-widest mb-5" style={{ color: T.primary }}>
                그래서 우리가 만든 도구
              </div>
              <div className="text-[26px] font-extrabold leading-snug mb-4 whitespace-nowrap" style={{ color: T.text }}>
                비교 대상은 <span style={{ color: T.primary }}>"과거의 나"</span>
              </div>
              <div className="text-[14px] leading-relaxed mb-6" style={{ color: T.muted }}>
                심리적 안정과 종목 확신으로<br />지금 내 투자가 올바른<br />방향인지 확인하는 도구
              </div>
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.png" alt="" style={{ width: 20, height: 20, borderRadius: 5 }} />
                <span className="text-[13px] font-extrabold" style={{ color: T.primary }}>버텨일지</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// ─── S2: 철학·개발목표 ───────────────────────────────────────────────────────
function Slide3({ T }: { T: Theme }) {
  const scope = [
    { icon: I.chart,  label: "통합 포트폴리오", sub: "국내 + 해외",      core: false },
    { icon: I.edit,   label: "매매일지",        sub: "이유 태그 + 심리", core: true },
    { icon: I.camera, label: "스크린샷 등록",   sub: "Claude Vision",    core: true },
    { icon: I.brain,  label: "AI 성향 진단",    sub: "Level 1 · 2",      core: true },
    { icon: I.cpu,    label: "AI 코칭 리포트",  sub: "패턴 · 개선 목표", core: false },
    { icon: I.search, label: "AI 종목 분석",    sub: "SWOT · 적정가",    core: false },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-16">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
        <SlideHeader num="02" title="개발 목표 & 구현 범위" T={T} />

        {/* 상단: 인용구 전폭 */}
        <div className="fade-up-2">
          <div className="text-[38px] font-black leading-tight mb-5" style={{ color: T.text, letterSpacing: "-0.5px" }}>
            "수기 입력의 마찰 자체가 <span style={{ color: T.primary }}>제품 가치"</span>
          </div>
          <div className="px-5 py-4"
            style={{ background: `${T.primary}08`, borderLeft: `2px solid ${T.primary}`, borderRadius: "0 8px 8px 0" }}>
            <p className="text-[15px] leading-7" style={{ color: T.muted }}>
              매매 이유 태그를 고르는 순간,&nbsp;
              <strong style={{ color: T.text }}>"이게 FOMO인가, 진짜 확신인가"</strong>를 한 번 더 생각하게 됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${T.primary}15`, color: T.primary }}>타겟</span>
            <span className="text-[13px]" style={{ color: T.muted }}>
              시장이 아닌 <strong style={{ color: T.text }}>과거의 나</strong>와 비교하며 성장하려는 장기 개인 투자자
            </span>
          </div>
        </div>

        {/* 하단: 구현 범위 6카드 3×2 */}
        <div className="grid grid-cols-3 gap-2.5 fade-up-3">
          {scope.map(s => (
            <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: T.primarySoft }}>
                <Icon d={s.icon} size={17} color={T.primary} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-[15px] font-bold" style={{ color: T.text }}>{s.label}</div>
                  {s.core && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${T.primary}20`, color: T.primary }}>핵심</span>}
                </div>
                <div className="text-[13px] mt-0.5" style={{ color: T.dim }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── S2-2: 경쟁사 비교 ───────────────────────────────────────────────────────
function SlideCompetitor({ T }: { T: Theme }) {
  type Mark = "check" | "x" | "partial";
  const rows: { section?: string; label?: string; cols?: Mark[] }[] = [
    { section: "매매 기록" },
    { label: "매매 이유 태그 기록",        cols: ["x",      "x",       "x",       "check"] },
    { label: "매매 심리 상태 기록",        cols: ["partial", "x",      "x",       "check"] },
    { section: "AI 분석" },
    { label: "AI 투자성향 진단",           cols: ["x",      "x",       "x",       "check"] },
    { label: "AI 패턴 코칭 리포트",        cols: ["x",      "x",       "x",       "check"] },
    { label: "AI 종목 분석 (SWOT·적정가)", cols: ["x",      "partial", "x",       "check"] },
  ];

  const Mark = ({ m }: { m: Mark }) => {
    if (m === "check") return (
      <div className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: `${T.primary}20`, color: T.primary }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
    );
    if (m === "x") return (
      <div className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: `${T.negative}18`, color: T.negative }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </div>
    );
    return (
      <div className="inline-flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: `${T.warning}18`, color: T.warning }}>
        <span className="text-xs font-bold">△</span>
      </div>
    );
  };

  const usColStyle = { background: `${T.primary}22`, borderLeft: `2px solid ${T.primary}50`, borderRight: `2px solid ${T.primary}50` };

  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden" style={{ padding: "0 72px" }}>
      <div className="max-w-5xl mx-auto w-full">

        {/* 헤더 + 서브타이틀 */}
        <div className="mb-6 fade-up-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: T.primarySoft, color: T.primary }}>03</span>
            <h2 className="text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>
              <span style={{ color: T.primary }}>이유까지</span> 기록하는 앱은 없었다
            </h2>
          </div>
          <p className="text-sm" style={{ color: T.muted, marginLeft: 2 }}>
            심리와 패턴을 기록하고, 내가 올바른 방향으로 가고 있는지 모니터링하는 도구
          </p>
        </div>

        <div className="fade-up-2 rounded-2xl overflow-hidden" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="text-left py-3 px-3 text-[11px] font-bold" style={{ color: T.dim, width: 220 }}></th>
                {["더리치", "도미노", "증권사 앱"].map(name => (
                  <th key={name} className="py-3 px-3 text-center text-[14px] font-bold" style={{ color: T.muted }}>{name}</th>
                ))}
                <th className="py-3 px-3 text-center text-[14px] font-bold rounded-t-xl" style={{ color: T.primary, ...usColStyle, borderTop: `2px solid ${T.primary}50` }}>
                  <span className="flex items-center justify-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon.png" alt="" style={{ width: 16, height: 16, borderRadius: 4 }} />
                    버텨일지
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => row.section ? (
                <tr key={i}>
                  <td colSpan={4} className="pt-3 pb-1 px-3 text-[12px] font-bold tracking-widest"
                    style={{ color: T.primary }}>{row.section.toUpperCase()}</td>
                  <td style={usColStyle}></td>
                </tr>
              ) : (
                <tr key={i}>
                  <td className="py-3 px-3 text-[15px] font-medium" style={{ color: T.muted }}>{row.label}</td>
                  {row.cols!.slice(0, 3).map((m, j) => (
                    <td key={j} className="py-3 px-3 text-center"><Mark m={m} /></td>
                  ))}
                  <td className="py-3 px-3 text-center" style={usColStyle}><Mark m={row.cols![3]} /></td>
                </tr>
              ))}
              <tr>
                <td colSpan={4}></td>
                <td className="rounded-b-xl" style={{ ...usColStyle, borderBottom: `2px solid ${T.primary}50`, height: 8 }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 fade-up-3">
          {[
            { icon: I.brain, title: "왜 기록하는가",
              desc: <>다른 앱은 결과만 보여줌<br /><strong style={{ color: T.text }}>이유와 심리까지 기록</strong>해 패턴을 만듦</> },
            { icon: I.cpu,   title: "AI의 깊이가 다름",
              desc: <>단순 뉴스 요약이 아닌<br /><strong style={{ color: T.text }}>누적 행동 데이터 기반</strong> 성향 진단 + 코칭</> },
          ].map(p => (
            <div key={p.title} className="flex items-start gap-4 p-5 rounded-2xl"
              style={{ backgroundColor: `${T.primary}08`, border: `1px solid ${T.primary}25` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${T.primary}18` }}>
                <Icon d={p.icon} size={18} color={T.primary} strokeWidth={1.8} />
              </div>
              <div>
                <div className="text-[15px] font-black mb-1.5" style={{ color: T.primary }}>{p.title}</div>
                <div className="text-[14px] leading-relaxed" style={{ color: T.muted }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── S3-1: 핵심 기능 ─────────────────────────────────────────────────────────
function OcrVideo({ T, active }: { T: Theme; active: boolean }) {
  const [err, setErr] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (active) {
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    } else {
      ref.current.pause();
    }
  }, [active]);

  const handleEnded = () => {
    setTimeout(() => {
      if (!ref.current) return;
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    }, 200);
  };

  if (err) return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2"
      style={{ backgroundColor: T.cardAlt }}>
      <Icon d={I.camera} size={28} color={T.dim} strokeWidth={1.5} />
      <span className="text-sm" style={{ color: T.dim }}>영상 준비 중</span>
    </div>
  );

  return (
    <div className="relative w-full h-full flex items-start justify-center overflow-hidden">
      <video
        ref={ref}
        muted playsInline
        className="w-full"
        style={{ objectFit: "contain", objectPosition: "top" }}
        src="/slides/portfolio.mp4"
        onEnded={handleEnded}
        onError={() => setErr(true)}
      />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
        style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}>
        <span style={{ color: "#F04452" }}>●</span> LIVE
      </div>
    </div>
  );
}

function Slide4a({ T, printMode }: { T: Theme; printMode?: boolean }) {
  const [activeCards, setActiveCards] = useState<Set<number>>(new Set([0]));
  const activate = (idx: number) => setActiveCards(prev => new Set([...prev, idx]));
  const isActive = (idx: number) => printMode || activeCards.has(idx);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ padding: "28px 64px" }}>
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0 gap-7">
        <SlideHeader num="04" title="핵심 기능" T={T} />
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">

          {/* 통합 포트폴리오 */}
          <div className="rounded-2xl flex flex-col fade-up-2 overflow-hidden relative"
            style={{
              backgroundColor: T.card,
              border: `1px solid ${T.border}`,
              opacity: isActive(0) ? 1 : 0.38,
              filter: isActive(0) ? "none" : "grayscale(0.9)",
              transform: isActive(0) ? "scale(1)" : "scale(0.97)",
              cursor: isActive(0) ? "default" : "pointer",
              transition: "opacity 0.45s ease, filter 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            onClick={() => !isActive(0) && activate(0)}
          >
            {!isActive(0) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl"
                  style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0m-4 8V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" /><path d="m18 11-2 9H6l-2-9h14Z" />
                  </svg>
                  <span className="text-[11px] font-bold text-white">클릭</span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-5 shrink-0" style={{ minHeight: 165 }}>
              <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: T.primarySoft }}>
                <Icon d={I.chart} size={20} color={T.primary} strokeWidth={2} />
              </div>
              <div>
                <div className="text-[17px] font-extrabold" style={{ color: T.text }}>통합 포트폴리오</div>
                <div className="text-[13px] font-semibold mt-0.5 mb-1" style={{ color: T.primary }}>국내·해외를 하나의 원화로</div>
                <div className="text-[14px] leading-snug" style={{ color: T.dim }}>
                  <span style={{ color: T.primary, fontWeight: 700 }}>국내·해외</span> 실시간 원화 환산
                </div>
                <div className="text-[12px] mt-1.5" style={{ color: T.dim }}>
                  KIS Open API · yahoo-finance2 · 실시간 환율 연동
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex items-start justify-center" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.cardAlt }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/slides/img_portfolio_1.png" alt="대시보드" className="w-full object-contain object-top" style={{ display: "block" }} />
            </div>
          </div>

          {/* 매매일지 — 핵심 기능 */}
          <div className="rounded-2xl flex flex-col fade-up-3 overflow-hidden relative"
            style={{
              backgroundColor: T.card,
              border: isActive(1) ? `1.5px solid ${T.primary}70` : `1px solid ${T.border}`,
              boxShadow: isActive(1) ? `0 0 28px ${T.primary}18` : "none",
              opacity: isActive(1) ? 1 : 0.38,
              filter: isActive(1) ? "none" : "grayscale(0.9)",
              transform: isActive(1) ? "scale(1)" : "scale(0.97)",
              cursor: isActive(1) ? "default" : "pointer",
              transition: "opacity 0.45s ease, filter 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.45s ease, border-color 0.45s ease",
            }}
            onClick={() => !isActive(1) && activate(1)}
          >
            {!isActive(1) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl"
                  style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0m-4 8V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" /><path d="m18 11-2 9H6l-2-9h14Z" />
                  </svg>
                  <span className="text-[11px] font-bold text-white">클릭</span>
                </div>
              </div>
            )}
            <div className="relative flex items-start gap-3 p-5 shrink-0" style={{ minHeight: 165 }}>
              <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: T.primarySoft }}>
                <Icon d={I.edit} size={20} color={T.primary} strokeWidth={2} />
              </div>
              <div>
                <div className="text-[17px] font-extrabold" style={{ color: T.text }}>매매일지</div>
                <div className="text-[13px] font-semibold mt-0.5 mb-1" style={{ color: T.primary }}>왜 샀는지 기억하는 유일한 앱</div>
                <div className="text-[14px] leading-snug" style={{ color: T.dim }}>
                  <span style={{ color: T.primary, fontWeight: 700 }}>이유 태그 + 심리 상태</span> 수기 기록
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {[
                    { label: "FOMO",   color: T.negative },
                    { label: "확신매수", color: T.primary },
                    { label: "지인추천", color: T.warning },
                    { label: "손절",    color: T.warning },
                  ].map(tag => (
                    <span key={tag.label} className="px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{ backgroundColor: tag.color + "18", color: tag.color, border: `1px solid ${tag.color}40` }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
              <span className="absolute top-4 right-3.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: T.primarySoft, border: `1px solid ${T.primary}50`, color: T.primary }}>
                핵심 기능
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex items-start justify-center" style={{ borderTop: `1px solid ${T.primary}25`, backgroundColor: T.cardAlt }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/slides/img_portfolio_3.png" alt="매매등록" className="w-full object-contain object-top" style={{ display: "block" }} />
            </div>
          </div>

          {/* 스크린샷 등록 */}
          <div className="rounded-2xl flex flex-col fade-up-4 overflow-hidden relative"
            style={{
              backgroundColor: T.card,
              border: `1px solid ${T.border}`,
              opacity: isActive(2) ? 1 : 0.38,
              filter: isActive(2) ? "none" : "grayscale(0.9)",
              transform: isActive(2) ? "scale(1)" : "scale(0.97)",
              cursor: isActive(2) ? "default" : "pointer",
              transition: "opacity 0.45s ease, filter 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            onClick={() => !isActive(2) && activate(2)}
          >
            {!isActive(2) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl"
                  style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0m-4 8V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" /><path d="m18 11-2 9H6l-2-9h14Z" />
                  </svg>
                  <span className="text-[11px] font-bold text-white">클릭</span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-5 shrink-0" style={{ minHeight: 165 }}>
              <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}>
                <Icon d={I.camera} size={20} color="white" strokeWidth={2} />
              </div>
              <div>
                <div className="text-[17px] font-extrabold" style={{ color: T.text }}>스크린샷 등록</div>
                <div className="text-[13px] font-semibold mt-0.5 mb-1" style={{ color: T.primary }}>캡처 한 장으로 계좌의 종목을 자동으로 인식</div>
                <div className="text-[14px] leading-snug" style={{ color: T.dim }}>
                  캡처 한 장 → <span style={{ color: T.primary, fontWeight: 700 }}>자동 등록</span>
                </div>
                <div className="text-[12px] mt-1.5" style={{ color: T.dim }}>
                  Claude Vision이 종목명·수량 자동 인식
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden" style={{ borderTop: `1px solid ${T.border}` }}>
              <OcrVideo T={T} active={isActive(2)} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── S3-2: AI 차별점 ──────────────────────────────────────────────────────────
function Slide4b({ T }: { T: Theme }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden" style={{ padding: "0 64px" }}>
      {/* subtle AI 그린 글로우 */}
      <div className="print-hide absolute rounded-full pointer-events-none"
        style={{ width: 700, height: 700, background: "radial-gradient(circle, rgba(5,192,114,0.1) 0%, transparent 65%)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

      <div className="relative max-w-5xl mx-auto w-full flex flex-col gap-7">
        <SlideHeader num="05" title="AI가 만드는 차별점" T={T} />
        <div className="grid grid-cols-2 gap-6">

          {/* AI 투자성향 진단 */}
          <div className="rounded-2xl fade-up-2 flex flex-col overflow-hidden"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-bold tracking-wide" style={{ color: T.muted }}>투자자 유형 진단</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${T.primary}15`, color: T.primary, border: `1px solid ${T.primary}40` }}>실제 6개월 데이터</span>
              </div>
              <div className="text-4xl font-extrabold mb-4" style={{ color: T.text }}>FOMO형 중기 투자자</div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: T.muted }}>
                실적 기반의 확신 매매에서 +23%의 성과를 낸 것처럼, 근거 있는 판단을 내릴 때는 뚜렷한 수익 잠재력을 보여줍니다. 다만 매매의 83%가 FOMO와 지인추천·테마 추종에서 비롯된 손절로 이어지고 있습니다.
              </p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: T.muted }}>
                6개월간 누적된 매매 이유 태그 데이터를 기반으로 AI가 분석한 투자 성향입니다. 태그를 고를수록 진단 정밀도가 높아집니다.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "승률",     value: "16.7%" },
                  { label: "평균보유", value: "43일" },
                  { label: "손절비율", value: "83.3%" },
                ].map(s => (
                  <div key={s.label} className="text-center py-3 rounded-xl"
                    style={{ backgroundColor: T.primarySoft }}>
                    <div className="text-lg font-extrabold" style={{ color: T.primary }}>{s.value}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: T.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI 코칭 리포트 */}
          <div className="rounded-2xl fade-up-3 flex flex-col overflow-hidden"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-bold tracking-wide" style={{ color: T.muted }}>이번 달 AI 코칭</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${T.primary}15`, color: T.primary, border: `1px solid ${T.primary}40` }}>실제 6개월 데이터</span>
              </div>
              <div className="text-4xl font-extrabold mb-4" style={{ color: T.text }}>패턴 기반 피드백</div>
              <div className="flex flex-col gap-3 flex-1">
                {[
                  { label: "잘한 것",      color: T.primary,  text: "손절 라인을 지킨 3번의 매도" },
                  { label: "반복 실수",    color: T.negative, text: "급등 직후 FOMO 매수 2회 반복" },
                  { label: "이번 달 목표", color: T.warning,  text: "매수 전 이유 태그 필수 작성" },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-xl"
                    style={{ backgroundColor: item.color + "12", border: `1px solid ${item.color}33` }}>
                    <div className="text-[13px] font-bold mb-1" style={{ color: item.color }}>{item.label}</div>
                    <div className="text-[16px]" style={{ color: T.text }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── S4: 기술 스택 ───────────────────────────────────────────────────────────
function Slide5({ T }: { T: Theme }) {
  const aiPoints = [
    { tag: "Vision",  tagColor: T.blue,    tagBg: `${T.blue}18`,             icon: I.camera,
      title: "스크린샷 종목 등록",
      example: "삼성증권 앱 캡처 → 종목·수량 자동 인식" },
    { tag: "분석",    tagColor: "#ffb832", tagBg: "rgba(255,184,50,0.12)",   icon: I.search,
      title: "AI 종목 분석 리포트",
      example: "SWOT · 적정가 · 호재/악재 실시간 요약" },
    { tag: "성향",    tagColor: "#c87aff", tagBg: "rgba(180,100,255,0.12)",  icon: I.brain,
      title: "투자성향 진단 + 코칭",
      example: "FOMO형 중기 투자자 — 6개월 패턴 분석" },
    { tag: "요약",    tagColor: T.primary, tagBg: `${T.primary}18`,          icon: I.cpu,
      title: "기업 소개 한국어 요약",
      example: "티커당 영구 캐시 → API 비용 최소화" },
  ];
  const techSections = [
    { label: "Frontend",      techs: "Next.js 16 · Tailwind v4 · Recharts 3" },
    { label: "Backend · DB",  techs: "PostgreSQL · Prisma 7 · Supabase · NextAuth v5" },
    { label: "시세 · 데이터", techs: "KIS Open API · yahoo-finance2 · R-ONE API" },
  ];
  const stats = [
    { num: "4",   label: "Claude API 호출 포인트", sub: "Vision · 종목분석 · 성향진단·코칭 · 기업요약" },
    { num: "$0",  label: "DB 비용",                sub: "Supabase 무료 티어로 운영" },
    { num: "~$9", label: "Claude API 월 예상비용",  sub: "캐시 전략으로 실사용 최소화" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-16">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-5">
        <SlideHeader num="06" title="AI 활용 & 기술 스택" T={T} />

        {/* 상단: Claude API 4카드 메인 */}
        <div className="fade-up-2">
          <div className="text-[11px] font-bold tracking-widest mb-3 flex items-center gap-1.5" style={{ color: T.primary }}>
            <Icon d={I.cpu} size={11} color={T.primary} strokeWidth={2} />
            CLAUDE API 활용 포인트
          </div>
          <div className="grid grid-cols-4 gap-3">
            {aiPoints.map((item) => (
              <div key={item.tag} className="rounded-2xl p-4 flex flex-col gap-3"
                style={{ backgroundColor: `${T.primary}06`, border: `1px solid ${T.primary}22` }}>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[12px] font-bold"
                    style={{ backgroundColor: item.tagBg, color: item.tagColor }}>{item.tag}</span>
                  <Icon d={item.icon} size={15} color={item.tagColor} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="text-[14px] font-extrabold mb-1.5" style={{ color: T.text }}>{item.title}</div>
                  <div className="text-[12px] leading-relaxed" style={{ color: T.muted }}>{item.example}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 중단: 기술 스택 축소 */}
        <div className="grid grid-cols-3 gap-3 fade-up-3">
          {techSections.map((sec) => (
            <div key={sec.label} className="rounded-xl px-4 py-3"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="text-[11px] font-bold tracking-widest mb-1.5" style={{ color: T.dim }}>{sec.label.toUpperCase()}</div>
              <div className="text-[13px]" style={{ color: T.muted }}>{sec.techs}</div>
            </div>
          ))}
        </div>

        {/* 하단 스탯 바 */}
        <div className="grid grid-cols-3 gap-3 fade-up-4">
          {stats.map((s) => (
            <div key={s.num} className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="text-[26px] font-extrabold shrink-0 tabular-nums" style={{ color: T.primary }}>{s.num}</div>
              <div>
                <div className="text-[14px] font-bold" style={{ color: T.text }}>{s.label}</div>
                <div className="text-[13px]" style={{ color: T.muted }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── S5: 개발 에피소드 ───────────────────────────────────────────────────────
function Slide6({ T }: { T: Theme }) {
  const weeks = useCounter(4, 800);
  const apis  = useCounter(30, 1000);
  const pages = useCounter(12, 1200);

  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-16">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-7">
        <SlideHeader num="07" title="개발 에피소드" T={T} />

        {/* 상단 통계 */}
        <div className="grid grid-cols-3 gap-3 fade-up-2">
          {[
            { num: weeks, suffix: "주", label: "개발 기간",  sub: "업무 중 틈틈이 · 2인 팀" },
            { num: apis,  suffix: "",   label: "API Route",  sub: "자체 개발 · 별도 서버 없음" },
            { num: pages, suffix: "",   label: "페이지",      sub: "반응형 · 다크모드 전체 지원" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="text-[30px] font-extrabold shrink-0 tabular-nums" style={{ color: T.primary }}>{s.num}{s.suffix}</div>
              <div>
                <div className="text-[14px] font-bold" style={{ color: T.text }}>{s.label}</div>
                <div className="text-[13px]" style={{ color: T.muted }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* EP 카드 3개 */}
        <div className="grid grid-cols-3 gap-3">

          {/* EP 01 */}
          <div className="p-4 rounded-2xl flex flex-col gap-3 fade-up-3"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold tracking-widest" style={{ color: T.dim }}>EP 01</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.primarySoft }}>
              <Icon d={I.cpu} size={20} color={T.primary} strokeWidth={2} />
            </div>
            <div>
              <div className="text-base font-extrabold leading-snug mb-1" style={{ color: T.text }}>Claude Code가 제3의 팀원</div>
              <div className="text-[13px] font-bold" style={{ color: T.primary }}>AI 활용 · 설계문서 = 맥락</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-1.5 text-[13px]" style={{ color: T.muted }}>
                <span className="shrink-0 mt-0.5" style={{ color: T.primary }}>→</span>
                <span>설계문서 전체를 CLAUDE.md에 연결 —<br /><strong style={{ color: T.text }}>매 세션 컨텍스트 유지, 제3의 팀원</strong></span>
              </div>
            </div>
            <div className="mt-auto px-3 py-2 rounded-lg text-[13px] italic" style={{ background: `${T.primary}08`, borderLeft: `2px solid ${T.primary}`, color: T.muted }}>"PM처럼 설계하고, 팀원처럼 코딩했다"</div>
          </div>

          {/* EP 02 */}
          <div className="p-4 rounded-2xl flex flex-col gap-3 fade-up-4"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold tracking-widest" style={{ color: T.dim }}>EP 02</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold" style={{ backgroundColor: `${T.primary}15`, color: T.primary }}><Icon d={I.zap} size={10} color={T.primary} strokeWidth={2.5} />팀워크</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.blue + "18" }}>
              <Icon d={I.zap} size={20} color={T.blue} strokeWidth={2} />
            </div>
            <div>
              <div className="text-base font-extrabold leading-snug mb-1" style={{ color: T.text }}>쓰다 보니 기능이 생겼다</div>
              <div className="text-[13px] font-bold" style={{ color: T.primary }}>실제 투자자가 만든 앱</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-1.5 text-[13px]" style={{ color: T.muted }}>
                <span className="shrink-0 mt-0.5" style={{ color: T.primary }}>→</span>
                <span>직접 투자하다 궁금한 것이 —<br /><strong style={{ color: T.text }}>바로 다음 기능이 됐다</strong></span>
              </div>
            </div>
            <div className="mt-auto px-3 py-2 rounded-lg text-[13px] italic" style={{ background: `${T.primary}08`, borderLeft: `2px solid ${T.primary}`, color: T.muted }}>"사용자가 곧 개발자 — 진짜 필요한 것만 만들었다"</div>
          </div>

          {/* EP 03 */}
          <div className="p-4 rounded-2xl flex flex-col gap-3 fade-up-5"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold tracking-widest" style={{ color: T.dim }}>EP 03</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(180,100,255,0.12)" }}>
              <Icon d={I.camera} size={20} color="#c87aff" strokeWidth={2} />
            </div>
            <div>
              <div className="text-base font-extrabold leading-snug mb-1" style={{ color: T.text }}>팀원 아이디어가 핵심 기능이 됐다</div>
              <div className="text-[13px] font-bold" style={{ color: T.primary }}>예상 외 에피소드 · OCR → Vision</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start gap-1.5 text-[13px]" style={{ color: T.muted }}>
                <span className="shrink-0 mt-0.5" style={{ color: T.primary }}>→</span>
                <span>팀원 아이디어 → OCR 실패 →<br /><strong style={{ color: T.text }}>Claude Vision으로 해결</strong></span>
              </div>
            </div>
            <div className="mt-auto px-3 py-2 rounded-lg text-[13px] italic" style={{ background: `${T.primary}08`, borderLeft: `2px solid ${T.primary}`, color: T.muted }}>"팀원 아이디어 + AI = 설계 밖에서 핵심 기능 탄생"</div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── DEMO: 내러티브 + 큐카드 ─────────────────────────────────────────────────
function Slide7({ T }: { T: Theme }) {
  const narrative = [
    { phase: "6개월 전",    label: "FOMO 충동매수",    desc: "급등 소식에 이유 없이 매수",           color: T.negative },
    { phase: "반복",        label: "기록 없음 → 재실수", desc: "왜 샀는지 기억 못함, 패턴 모름",       color: T.warning },
    { phase: "버텨일지 시작", label: "매매 이유 태그",   desc: "\"이게 FOMO인가\" 한 번 더 생각",      color: T.primary },
    { phase: "2개월 후",    label: "AI 성향 진단",      desc: "FOMO 패턴 발견 + 개선 코칭",          color: T.primary },
    { phase: "지금",        label: "수익률 개선",        desc: "기록이 투자 그릇을 키운다",            color: T.primary },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-16">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-7">
        <SlideHeader num="08" title="DEMO" T={T} />

        {/* 내러티브 타임라인 */}
        <div className="fade-up-2 rounded-2xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <div className="text-[12px] font-bold mb-4 tracking-widest" style={{ color: T.dim }}>USER JOURNEY — 데모에서 보여줄 흐름</div>
          <div className="flex items-start gap-0">
            {narrative.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col items-center text-center relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2 z-10"
                  style={{ backgroundColor: n.color + "20", border: `2px solid ${n.color}60` }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: n.color }} />
                </div>
                {i < narrative.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-px" style={{ backgroundColor: T.border }} />
                )}
                <div className="text-[11px] font-bold mb-1" style={{ color: n.color }}>{n.phase}</div>
                <div className="text-[13px] font-bold mb-1 leading-tight" style={{ color: T.text }}>{n.label}</div>
                <div className="text-[12px] leading-snug" style={{ color: T.muted }}>{n.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 데모 큐카드 */}
        <div className="grid grid-cols-4 gap-3 fade-up-3">
          {[
            { num: "01", icon: I.camera, label: "온보딩",      desc: "Claude Vision으로\n보유종목 등록" },
            { num: "02", icon: I.edit,   label: "매매 기록",  desc: "이유 태그 + 심리\n상태 기록" },
            { num: "03", icon: I.brain,  label: "AI 성향 진단", desc: "FOMO 패턴\n시각화", badge: "AI 실시간 생성 · 약 20초" },
            { num: "04", icon: I.cpu,    label: "AI 코칭",    desc: "잘한 것 / 실수\n이번 달 목표" },
          ].map((s, i) => (
            <div key={s.num} className={`p-4 rounded-2xl fade-up-${i + 3}`}
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}>
                  <Icon d={s.icon} size={18} color="white" strokeWidth={2} />
                </div>
                <div className="text-[12px] font-bold" style={{ color: T.primary }}>STEP {s.num}</div>
                <div className="text-sm font-bold" style={{ color: T.text }}>{s.label}</div>
                <div className="text-[13px] whitespace-pre-line leading-snug" style={{ color: T.muted }}>{s.desc}</div>
                {"badge" in s && (
                  <div className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: `${T.warning}18`, color: T.warning, border: `1px solid ${T.warning}40` }}>
                    ⏱ {s.badge}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── S7: 클로징 ──────────────────────────────────────────────────────────────
function Slide8({ T }: { T: Theme }) {
  const effects = [
    { icon: I.edit,     title: "기록 습관 형성", desc: "이유 태그가 다음 매매를 바꾼다" },
    { icon: I.brain,    title: "패턴 인식",      desc: "AI가 내 행동 데이터를 분석" },
    { icon: I.trending, title: "투자 행동 개선", desc: "시간이 쌓일수록 정밀해지는 코칭" },
  ];
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden px-16 py-10"
      style={{ backgroundColor: T.bg }}>
      {/* 배경 dot grid */}
      <div className="print-hide absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: `radial-gradient(circle, ${T.primary} 1px, transparent 1px)`, backgroundSize: "36px 36px" }} />
      {/* 그린 글로우 */}
      <div className="print-hide absolute rounded-full pointer-events-none"
        style={{ width: 800, height: 800, background: T.glow, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

      <div className="relative z-10 flex flex-col items-center justify-center gap-20 h-full">

        {/* 상단: 로고 + 타이틀 */}
        <div className="flex flex-col items-center text-center fade-up-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="버텨일지" className="mb-6"
            style={{ width: 100, height: 100, borderRadius: 24, boxShadow: "0 0 50px rgba(5,192,114,0.5), 0 15px 30px rgba(0,0,0,0.5)" }} />
          <h2 className="text-8xl font-extrabold tracking-tight" style={{ color: T.text }}>감사합니다</h2>
        </div>

        {/* 하단: 기대 효과 3단계 플로우 */}
        <div className="w-full max-w-2xl fade-up-3">
          <div className="mb-7" />
          <div className="flex items-start">
            {effects.map((e, i) => (
              <div key={e.title} className="flex-1 flex flex-col items-center text-center relative">
                {i < effects.length - 1 && (
                  <div className="absolute top-6 left-1/2 w-full flex items-center z-0" style={{ paddingLeft: 36 }}>
                    <div className="flex-1 h-px" style={{ backgroundColor: `${T.primary}35` }} />
                    <Icon d={I.arrow_r} size={13} color={`${T.primary}60`} strokeWidth={2} />
                  </div>
                )}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 relative z-10"
                  style={{ backgroundColor: T.primarySoft }}>
                  <Icon d={e.icon} size={20} color={T.primary} strokeWidth={1.8} />
                </div>
                <div className="text-[15px] font-extrabold mb-1.5" style={{ color: T.text }}>{e.title}</div>
                <div className="text-[13px] leading-snug" style={{ color: T.muted }}>{e.desc}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6 text-[13px]" style={{ color: T.dim }}>
            이유 태그 기반 심리 데이터 — <span style={{ color: T.primary, fontWeight: 700 }}>버텨일지</span>에만 있는 기반입니다
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
const SLIDE_LIST = [Slide1, SlideBackground, Slide3, SlideCompetitor, Slide4a, Slide4b, Slide5, Slide6, Slide7, Slide8];
const TOTAL = SLIDE_LIST.length;

export default function SlidesPage() {
  const [current, setCurrent] = useState(0);
  const [dark, setDark] = useState(true); // 다크 기본

  const T = dark ? DARK : LIGHT;
  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(TOTAL - 1, c + 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") next();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const SlideComponent = SLIDE_LIST[current];

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanDown {
          0%   { top: 28px; opacity: 0; }
          5%   { opacity: 1; }
          90%  { top: calc(100% - 4px); opacity: 1; }
          100% { top: calc(100% - 4px); opacity: 0; }
        }
        .scan-line  { animation: scanDown 1.6s ease-in-out forwards; position: absolute; left: 0; right: 0; height: 2px; }
        .fade-up-1  { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)   0ms both; }
        .fade-up-2  { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 120ms both; }
        .fade-up-3  { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 240ms both; }
        .fade-up-4  { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 360ms both; }
        .fade-up-5  { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 480ms both; }
        .fade-up-6  { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 600ms both; }

        /* ── 인쇄 ── */
        @page { size: landscape; margin: 0; }
        @media print {
          html, body, * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .screen-only { display: none !important; }
          .print-container { display: block !important; }
          .print-hide { display: none !important; }
          .print-page {
            position: relative;
            width: 100vw; height: 100vh;
            overflow: hidden;
            clip-path: inset(0);
            isolation: isolate;
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child { page-break-after: avoid; break-after: avoid; }
          .fade-up-1, .fade-up-2, .fade-up-3, .fade-up-4, .fade-up-5, .fade-up-6 { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
        .print-container { display: none; }
      `}</style>

      {/* 화면 전용 — 인쇄 시 숨김 */}
      <div className="screen-only fixed inset-0 flex flex-col select-none transition-colors duration-300"
        style={{ backgroundColor: T.bg, fontFamily: "'Pretendard','Apple SD Gothic Neo',-apple-system,system-ui,sans-serif" }}>

        <div className="flex-1 relative overflow-hidden">
          <div key={current} className="absolute inset-0 flex items-center justify-center">
            <SlideComponent T={T} />
          </div>

          {current !== 0 && (
            <div className="absolute top-5 right-6 flex items-center gap-2 pointer-events-none z-10"
              style={{ opacity: 0.4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="" style={{ width: 36, height: 36, borderRadius: 9 }} />
              <span className="text-sm font-extrabold" style={{ color: T.primary }}>버텨일지</span>
            </div>
          )}

          <button onClick={prev} className="absolute left-0 top-0 h-full w-1/5 cursor-pointer opacity-0" />
          <button onClick={next} className="absolute right-0 top-0 h-full w-1/5 cursor-pointer opacity-0" />
        </div>

        <div className="flex items-center justify-between px-8 py-3 shrink-0"
          style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.card }}>
          <div className="flex items-center gap-1.5">
            {SLIDE_LIST.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className="rounded-full transition-all cursor-pointer"
                style={{ width: i === current ? 20 : 6, height: 6, backgroundColor: i === current ? T.primary : T.border }} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={prev} disabled={current === 0}
              className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-30 flex items-center gap-1.5 transition-opacity"
              style={{ backgroundColor: T.cardAlt, border: `1px solid ${T.border}`, color: T.muted }}>
              <Icon d={I.arrow_l} size={13} color={T.muted} strokeWidth={2} /> 이전
            </button>
            <span className="text-sm font-bold tabular-nums" style={{ color: T.dim }}>{current + 1} / {TOTAL}</span>
            <button onClick={next} disabled={current === TOTAL - 1}
              className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-30 flex items-center gap-1.5 transition-opacity"
              style={{ backgroundColor: T.primary, color: "#fff" }}>
              다음 <Icon d={I.arrow_r} size={13} color="white" strokeWidth={2} />
            </button>
            <button onClick={() => {
                const prev = document.getElementById("__print_page__");
                if (prev) prev.remove();
                const s = document.createElement("style");
                s.id = "__print_page__";
                s.textContent = "@page { size: landscape !important; margin: 0 !important; }";
                document.head.insertBefore(s, document.head.firstChild);
                setTimeout(() => {
                  window.print();
                  setTimeout(() => s.remove(), 1000);
                }, 80);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer flex items-center gap-1.5 transition-opacity ml-1"
              style={{ backgroundColor: T.cardAlt, border: `1px solid ${T.border}`, color: T.muted }}>
              PDF
            </button>
            <button onClick={() => setDark(d => !d)}
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
              style={{ backgroundColor: T.cardAlt, border: `1px solid ${T.border}` }}>
              <Icon d={dark ? I.sun : I.moon} size={15} color={T.muted} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {/* 인쇄 전용 — 화면에서 숨김, 모든 슬라이드 렌더링 */}
      <div className="print-container"
        style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',-apple-system,system-ui,sans-serif" }}>
        {SLIDE_LIST.map((SlideComp, i) => (
          <div key={i} className="print-page" style={{ backgroundColor: T.bg }}>
            {SlideComp === Slide4a ? <Slide4a T={T} printMode={true} /> : <SlideComp T={T} />}
            {i !== 0 && (
              <div style={{ position: "absolute", top: 20, right: 24, display: "flex", alignItems: "center", gap: 8, opacity: 0.4, pointerEvents: "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.png" alt="" style={{ width: 36, height: 36, borderRadius: 9 }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: T.primary }}>버텨일지</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
