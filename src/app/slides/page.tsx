"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── 테마 토큰 ───────────────────────────────────────────────────────────────
const LIGHT = {
  bg: "#F5F7F5", card: "#FFFFFF", cardAlt: "#F0F4F0", border: "#E4EAE4",
  primary: "#05C072", primaryDark: "#027A47", primaryMid: "#1F9E64", primarySoft: "#E8F5EF",
  text: "#1A221A", muted: "#6B7B6B", dim: "#9DAD9D",
  negative: "#F04452", negativeSoft: "#FFF0F1",
  warning: "#FF7B00", warningSoft: "#FFF5ED",
  blue: "#4285F4",
  glow: "radial-gradient(circle, rgba(5,192,114,0.22) 0%, rgba(5,192,114,0.07) 45%, transparent 70%)",
};
const DARK = {
  bg: "#0D1210", card: "#1D2720", cardAlt: "#151C14", border: "#2A3828",
  primary: "#05C072", primaryDark: "#027A47", primaryMid: "#1F9E64", primarySoft: "rgba(5,192,114,0.14)",
  text: "#DCE8DC", muted: "#9DAD9D", dim: "#4A6A4A",
  negative: "#F04452", negativeSoft: "rgba(240,68,82,0.12)",
  warning: "#FF7B00", warningSoft: "rgba(255,123,0,0.12)",
  blue: "#4285F4",
  glow: "radial-gradient(circle, rgba(5,192,114,0.45) 0%, rgba(5,192,114,0.15) 45%, transparent 70%)",
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
    <div className={`flex items-center gap-3 mb-8 fade-up-1 ${center ? "justify-center" : ""}`}>
      <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: T.primarySoft, color: T.primary }}>{num}</span>
      <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: T.text }}>{title}</h2>
    </div>
  );
}

function TechBadge({ label, sub, color, T }: { label: string; sub: string; color: string; T: Theme }) {
  return (
    <div className="px-3 py-2.5 rounded-xl text-center" style={{ backgroundColor: color + "18", border: `1px solid ${color}33` }}>
      <div className="text-sm font-bold" style={{ color }}>{label}</div>
      <div className="text-[11px] mt-0.5" style={{ color: T.dim }}>{sub}</div>
    </div>
  );
}

// ─── OCR 애니메이션 ──────────────────────────────────────────────────────────
function OcrAnimation({ T }: { T: Theme }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(1);
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setPhase(0);
      t1 = setTimeout(() => setPhase(1), 600);
      t2 = setTimeout(() => setPhase(2), 2400);
    };
    cycle();
    const iv = setInterval(cycle, 5000);
    return () => { clearInterval(iv); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative rounded-xl overflow-hidden flex-1" style={{ border: `1px solid ${T.border}`, backgroundColor: T.cardAlt }}>
        <div className="flex items-center gap-1 px-2.5 py-1.5 border-b" style={{ borderColor: T.border }}>
          {["#FF5F57","#FFBD2E","#28CA41"].map(c => <div key={c} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />)}
          <span className="text-[9px] ml-1" style={{ color: T.dim }}>증권사 앱 화면</span>
        </div>
        <div className="p-2.5 space-y-1 text-[10px]" style={{ color: T.muted }}>
          <div className="flex justify-between"><span>삼성전자 005930</span><span>72,500원</span></div>
          <div className="flex justify-between"><span>50주 · 평균 69,500</span><span style={{ color: T.primary }}>+4.3%</span></div>
          <div className="h-px" style={{ backgroundColor: T.border }} />
          <div className="flex justify-between"><span>Apple AAPL</span><span>$178.20</span></div>
          <div className="flex justify-between"><span>10주 · 평균 $159.80</span><span style={{ color: T.primary }}>+11.5%</span></div>
        </div>
        {phase === 1 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="scan-line absolute left-0 right-0 h-0.5"
              style={{ backgroundColor: T.primary, boxShadow: `0 0 8px ${T.primary}, 0 0 16px ${T.primary}66` }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent, ${T.primary}14, transparent)` }} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-1.5 py-0.5">
        <Icon d={I.brain} size={10} color={T.primary} strokeWidth={2.5} />
        <span className="text-[9px] font-bold" style={{ color: T.primary }}>
          {phase === 1 ? "Claude Vision 분석 중..." : phase === 2 ? "추출 완료" : "대기 중"}
        </span>
      </div>
      <div style={{ opacity: phase === 2 ? 1 : 0, transition: "opacity 0.6s ease", height: 60 }}>
        {[{ name:"삼성전자", ticker:"005930", qty:"50주", price:"72,500원" }, { name:"Apple", ticker:"AAPL", qty:"10주", price:"$178.20" }].map(item => (
          <div key={item.ticker} className="flex items-center justify-between px-2.5 py-2 rounded-lg mb-1"
            style={{ backgroundColor: T.primarySoft, border: `1px solid ${T.primary}33` }}>
            <div>
              <div className="text-[10px] font-bold" style={{ color: T.text }}>{item.name}</div>
              <div className="text-[9px]" style={{ color: T.muted }}>{item.ticker} · {item.qty}</div>
            </div>
            <div className="text-[10px] font-bold" style={{ color: T.primary }}>{item.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── S0: 표지 (다크 + 그린 글로우) ──────────────────────────────────────────
function Slide1({ T }: { T: Theme }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ backgroundColor: T.bg }}>
      {/* 배경 dot grid */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: `radial-gradient(circle, ${T.primary} 1px, transparent 1px)`, backgroundSize: "36px 36px" }} />
      {/* 그린 글로우 */}
      <div className="absolute rounded-full pointer-events-none"
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

        <div className="flex items-center gap-4 mb-10 fade-up-5">
          {["김수현", "최우철"].map(name => (
            <div key={name} className="flex items-center gap-2.5 px-6 py-3 rounded-full text-base font-bold"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, color: T.text }}>
              <Icon d={I.person} size={15} color={T.primary} strokeWidth={2} /> {name}
            </div>
          ))}
        </div>
        <div className="text-base fade-up-6" style={{ color: T.dim }}>2026.05.22</div>
      </div>
    </div>
  );
}

// ─── S1: 탄생 배경 (Why + Problem 통합) ──────────────────────────────────────
function SlideBackground({ T }: { T: Theme }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden" style={{ padding: "0 80px" }}>
      <div className="max-w-5xl mx-auto w-full">
        <SlideHeader num="01" title="탄생 배경" T={T} />

        <div className="grid grid-cols-2 gap-5 mb-5">
          {/* 왼쪽: 나의 이야기 */}
          <div className="flex flex-col gap-3">
            <div className="p-6 rounded-2xl fade-up-2" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.primary + "20" }}>
                  <Icon d={I.edit} size={18} color={T.primary} strokeWidth={2} />
                </div>
                <span className="text-lg font-bold" style={{ color: T.text }}>엑셀로 관리하던 가족 계좌</span>
              </div>
              <p className="text-base leading-relaxed" style={{ color: T.muted }}>
                직접 엑셀로 가족 계좌를 정리했어요.<br />
                종목·수익률은 기록할 수 있었지만<br />
                <span className="font-semibold" style={{ color: T.text }}>"왜 샀는지"는 어디에도 남길 수 없었습니다.</span>
              </p>
            </div>
            <div className="p-6 rounded-2xl fade-up-3" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.warning + "20" }}>
                  <Icon d={I.search} size={18} color={T.warning} strokeWidth={2} />
                </div>
                <span className="text-lg font-bold" style={{ color: T.text }}>기존 금융앱의 한계</span>
              </div>
              <p className="text-base leading-relaxed" style={{ color: T.muted }}>
                더리치, 도미노 등 좋은 앱이 많지만<br />
                매매 이유·심리 상태는 기록할 수 없어요.<br />
                <span className="font-semibold" style={{ color: T.text }}>"왜"가 빠진 데이터는 반성의 재료가 아닙니다.</span>
              </p>
            </div>
          </div>

          {/* 오른쪽: 문제 흐름 */}
          <div className="flex flex-col gap-3 fade-up-3">
            {[
              { icon: I.zap,    color: T.negative, soft: T.negativeSoft, label: "FOMO 충동매매",
                desc: "급등 소식에 이유 없이 매수, 손절 기준도 없이 보유" },
              { icon: I.repeat, color: T.warning,  soft: T.warningSoft,  label: "기록 없음 → 반복 손실",
                desc: "왜 샀는지 기억 못 함 · 패턴을 모르니 개선 불가" },
              { icon: I.brain,  color: T.primary,  soft: T.primarySoft,  label: "내 심리가 핵심",
                desc: "남의 심리보다 나를 아는 것 · 약점 극복이 투자 그릇" },
            ].map((p, i) => (
              <div key={p.label} className={`flex items-center gap-4 p-4 rounded-2xl fade-up-${i + 3}`}
                style={{ backgroundColor: p.soft, border: `1px solid ${p.color}33` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: p.color + "25" }}>
                  <Icon d={p.icon} size={18} color={p.color} strokeWidth={2} />
                </div>
                <div>
                  <div className="text-base font-bold mb-0.5" style={{ color: p.color }}>{p.label}</div>
                  <div className="text-sm" style={{ color: T.muted }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl fade-up-6"
          style={{ background: `linear-gradient(135deg, ${T.primaryDark}22, ${T.primary}18)`, border: `1px solid ${T.primary}44` }}>
          <div className="flex items-center gap-3">
            <Icon d={I.trending} size={20} color={T.primary} strokeWidth={2} />
            <p className="text-xl font-extrabold" style={{ color: T.text }}>
              기록 부재 → 패턴 학습 불가 → 반복 손실 →
              <span style={{ color: T.primary }}> 매매일지로 나를 알아가는 과정</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── S2: 철학·개발목표 ───────────────────────────────────────────────────────
function Slide3({ T }: { T: Theme }) {
  const scope = [
    { icon: I.chart,      label: "통합 포트폴리오" },
    { icon: I.edit,       label: "매매일지" },
    { icon: I.brain,      label: "AI 성향 진단" },
    { icon: I.search,     label: "AI 종목 분석" },
    { icon: I.cpu,        label: "AI 코칭 리포트" },
    { icon: I.camera,     label: "스크린샷 등록" },
  ];

  return (
    <div className="flex flex-col justify-center h-full px-20 max-w-5xl mx-auto w-full">
      <SlideHeader num="02" title="개발 목표 & 구현 범위" T={T} />
      <div className="grid grid-cols-2 gap-10 items-center">

        <div className="fade-up-2">
          <div className="text-[11px] font-bold mb-5 tracking-widest" style={{ color: T.dim }}>CORE PHILOSOPHY</div>
          <blockquote className="text-5xl font-extrabold leading-tight mb-8" style={{ color: T.text }}>
            "수기 입력의<br />마찰 자체가<br />
            <span style={{ color: T.primary }}>제품 가치"</span>
          </blockquote>
          <div className="p-4 rounded-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-lg leading-relaxed" style={{ color: T.muted }}>
              매매 이유 태그를 고르는 순간,<br />
              <span className="font-bold" style={{ color: T.text }}>"이게 FOMO인가, 진짜 확신인가"</span>를<br />
              한 번 더 생각하게 됩니다.
            </p>
          </div>
        </div>

        <div className="fade-up-3">
          <div className="text-[11px] font-bold mb-5 tracking-widest" style={{ color: T.dim }}>IMPLEMENTATION SCOPE</div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {scope.map(s => (
              <div key={s.label} className="flex items-center gap-3 p-3.5 rounded-xl"
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: T.primarySoft }}>
                  <Icon d={s.icon} size={14} color={T.primary} strokeWidth={2} />
                </div>
                <span className="text-base font-medium" style={{ color: T.text }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl" style={{ backgroundColor: T.primarySoft, border: `1px solid ${T.primary}33` }}>
            <div className="flex items-center gap-2">
              <Icon d={I.trending} size={16} color={T.primary} strokeWidth={2} />
              <span className="text-base font-bold" style={{ color: T.primary }}>
                기록 → 패턴 인식 → 투자 개선 사이클
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── S3-1: 핵심 기능 ─────────────────────────────────────────────────────────
function OcrVideo({ T }: { T: Theme }) {
  const [err, setErr] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  const handleEnded = () => {
    setTimeout(() => {
      if (!ref.current) return;
      ref.current.currentTime = 0;
      ref.current.play();
    }, 200);
  };

  if (err) return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-xl"
      style={{ backgroundColor: T.cardAlt }}>
      <Icon d={I.camera} size={28} color={T.dim} strokeWidth={1.5} />
      <span className="text-sm" style={{ color: T.dim }}>영상 준비 중</span>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden">
        <video
          ref={ref}
          autoPlay muted playsInline
          className="w-full h-full"
          style={{ objectFit: "contain" }}
          src="/slides/portfolio.mp4"
          onEnded={handleEnded}
          onError={() => setErr(true)}
        />
        {/* LIVE 뱃지 */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}>
          <span style={{ color: "#F04452" }}>●</span> LIVE
        </div>
      </div>
    </div>
  );
}

function Slide4a({ T }: { T: Theme }) {
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ padding: "28px 64px" }}>
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 mb-4 fade-up-1">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: T.primarySoft, color: T.primary }}>03</span>
          <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: T.text }}>핵심 기능</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">

          {/* 통합 포트폴리오 */}
          <div className="p-4 rounded-2xl flex flex-col fade-up-2"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-3 mb-2 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: T.primarySoft }}>
                <Icon d={I.chart} size={18} color={T.primary} strokeWidth={2} />
              </div>
              <div className="text-lg font-bold" style={{ color: T.text }}>통합 포트폴리오</div>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <div className="flex-[2] min-h-0 rounded-xl overflow-hidden" style={{ backgroundColor: T.cardAlt }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/slides/img_portfolio_1.png" alt="대시보드"
                  className="w-full h-full object-contain object-top" />
              </div>
              <div className="flex-[1] min-h-0 rounded-xl overflow-hidden" style={{ backgroundColor: T.cardAlt }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/slides/img_portfolio_2.png" alt="자산추이"
                  className="w-full h-full object-contain object-center" />
              </div>
            </div>
          </div>

          {/* 매매일지 */}
          <div className="p-4 rounded-2xl flex flex-col fade-up-3"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-3 mb-2 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: T.primarySoft }}>
                <Icon d={I.edit} size={18} color={T.primary} strokeWidth={2} />
              </div>
              <div className="text-lg font-bold" style={{ color: T.text }}>매매일지</div>
            </div>
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden"
              style={{ backgroundColor: T.cardAlt }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/slides/img_portfolio_3.png" alt="매매등록"
                className="w-full h-full object-contain object-top" />
            </div>
          </div>

          {/* 스크린샷 등록 */}
          <div className="p-4 rounded-2xl flex flex-col fade-up-4"
            style={{ backgroundColor: T.card, border: `2px solid ${T.primary}66`, boxShadow: `0 0 32px ${T.primary}22` }}>
            <div className="flex items-center gap-3 mb-2 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}>
                <Icon d={I.camera} size={18} color="white" strokeWidth={2} />
              </div>
              <div className="text-lg font-bold" style={{ color: T.text }}>스크린샷 등록</div>
            </div>
            <div className="flex-1 min-h-0">
              <OcrVideo T={T} />
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
      <div className="absolute rounded-full pointer-events-none"
        style={{ width: 700, height: 700, background: "radial-gradient(circle, rgba(5,192,114,0.1) 0%, transparent 65%)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

      <div className="relative max-w-5xl mx-auto w-full">
        <SlideHeader num="03-2" title="AI가 만드는 차별점" T={T} />
        <div className="grid grid-cols-3 gap-4">

          {/* AI 투자성향 진단 */}
          <div className="rounded-2xl fade-up-2 flex flex-col overflow-hidden"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="p-5 flex flex-col flex-1">
              <div className="text-xs font-semibold mb-2" style={{ color: T.muted }}>나의 투자자 유형</div>
              <div className="text-2xl font-extrabold mb-3" style={{ color: T.text }}>FOMO형 중기 투자자</div>
              <p className="text-xs leading-relaxed mb-4 flex-1" style={{ color: T.muted }}>
                실적 기반의 확신 매매에서 +23%의 성과를 낸 것처럼, 근거 있는 판단을 내릴 때는 뚜렷한 수익 잠재력을 보여줍니다. 다만 매매의 83%가 FOMO와 지인추천·테마 추종에서 비롯된 손절로 이어지고 있습니다.
              </p>
              <div className="grid grid-cols-3 gap-2 mt-auto">
                {[
                  { label: "승률",     value: "16.7%" },
                  { label: "평균보유", value: "43일" },
                  { label: "손절비율", value: "83.3%" },
                ].map(s => (
                  <div key={s.label} className="text-center py-2.5 rounded-xl"
                    style={{ backgroundColor: T.primarySoft }}>
                    <div className="text-base font-extrabold" style={{ color: T.primary }}>{s.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: T.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI 코칭 리포트 */}
          <div className="rounded-2xl fade-up-3 flex flex-col overflow-hidden"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="p-5 flex flex-col flex-1">
              <div className="text-xs font-semibold mb-2" style={{ color: T.muted }}>이번 달 AI 코칭</div>
              <div className="text-2xl font-extrabold mb-3" style={{ color: T.text }}>패턴 기반 피드백</div>
              <div className="space-y-2.5 flex-1">
                {[
                  { label: "잘한 것",      color: T.primary,  text: "손절 라인을 지킨 3번의 매도" },
                  { label: "반복 실수",    color: T.negative, text: "급등 직후 FOMO 매수 2회 반복" },
                  { label: "이번 달 목표", color: T.warning,  text: "매수 전 이유 태그 필수 작성" },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl"
                    style={{ backgroundColor: item.color + "12", border: `1px solid ${item.color}33` }}>
                    <div className="text-[11px] font-bold mb-0.5" style={{ color: item.color }}>{item.label}</div>
                    <div className="text-sm" style={{ color: T.text }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI 종목 분석 */}
          <div className="rounded-2xl fade-up-4 flex flex-col overflow-hidden"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="p-5 flex flex-col flex-1">
              <div className="text-xs font-semibold mb-2" style={{ color: T.muted }}>AI 종목 분석</div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-2xl font-extrabold" style={{ color: T.text }}>NVDA</span>
                <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold"
                  style={{ backgroundColor: T.primary, color: "#fff" }}>BUY</span>
                <span className="text-base font-bold" style={{ color: T.primary }}>$850 ~ $900</span>
              </div>
              <div className="space-y-2 flex-1">
                {[
                  { label: "S", color: T.primary,  text: "AI 반도체 독점적 시장 지위" },
                  { label: "W", color: T.negative, text: "고PER 밸류에이션 부담" },
                  { label: "O", color: T.blue,     text: "데이터센터 수요 급증" },
                  { label: "T", color: T.warning,  text: "미중 무역규제 리스크" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5 text-sm">
                    <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-extrabold shrink-0"
                      style={{ backgroundColor: item.color + "20", color: item.color }}>{item.label}</span>
                    <span style={{ color: T.muted }}>{item.text}</span>
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
  const rows = [
    { label: "FRONTEND", items: [          // CLIENT 레이어 → 파랑
      { label: "Next.js 16",  sub: "App Router",  color: T.blue },
      { label: "TypeScript",  sub: "Strict Mode",  color: T.blue },
      { label: "Tailwind v4", sub: "CSS",           color: T.blue },
      { label: "Recharts",    sub: "차트",           color: T.blue },
      { label: "next-themes", sub: "다크모드",       color: T.blue },
    ]},
    { label: "BACKEND & DB", items: [     // SERVER→그린 / DATA→주황
      { label: "NextAuth v5",    sub: "인증",         color: T.primary },
      { label: "KIS Open API",   sub: "국내 주가",    color: T.primary },
      { label: "yahoo-finance2", sub: "해외 주가",    color: T.primary },
      { label: "Prisma 7",       sub: "ORM",          color: T.warning },
      { label: "PostgreSQL",     sub: "Supabase",      color: T.warning },
    ]},
    { label: "AI & TOOLS", items: [       // NEXT.JS SERVER 레이어 → 그린
      { label: "Claude API",    sub: "claude-sonnet-4-6", color: T.primary },
      { label: "Claude Vision", sub: "스크린샷 OCR",       color: T.primary },
      { label: "Claude Code",   sub: "AI 개발 도구",       color: T.primary },
      { label: "Google OAuth",  sub: "소셜 로그인",        color: T.primary },
      { label: "Kakao OAuth",   sub: "소셜 로그인",        color: T.primary },
    ]},
  ];

  return (
    <div className="flex flex-col justify-center h-full px-16 max-w-5xl mx-auto w-full gap-4">
      <SlideHeader num="04" title="기술 스택 & 아키텍처" T={T} />

      {/* 기술 스택 — 풀폭 */}
      <div className="space-y-3 fade-up-2">
        {rows.map(row => (
          <div key={row.label}>
            <div className="text-[10px] font-bold mb-2 tracking-widest" style={{ color: T.dim }}>{row.label}</div>
            <div className="grid grid-cols-5 gap-2">
              {row.items.map(item => <TechBadge key={item.label} {...item} T={T} />)}
            </div>
          </div>
        ))}
      </div>

      {/* 아키텍처 — 하단 풀폭 */}
      <div className="p-5 rounded-2xl fade-up-4" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
        <div className="text-[10px] font-bold mb-4 tracking-widest" style={{ color: T.dim }}>ARCHITECTURE</div>

        {/* 3레이어 — CLIENT / NEXT.JS SERVER / DATA LAYER */}
        <div className="flex items-start gap-2 mb-4">

          {/* CLIENT */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: T.blue + "22", color: T.blue }}>CLIENT</span>
            <div className="w-full py-3 px-2 rounded-xl text-center"
              style={{ backgroundColor: T.blue + "18", border: `2px solid ${T.blue}44` }}>
              <div className="text-sm font-extrabold" style={{ color: T.blue }}>Browser</div>
            </div>
          </div>

          <span className="text-xl font-black mt-7 shrink-0" style={{ color: T.dim }}>→</span>

          {/* NEXT.JS SERVER */}
          <div className="flex flex-col items-center gap-1.5 flex-[2]">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: T.primary + "22", color: T.primary }}>NEXT.JS SERVER</span>
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 py-3 px-2 rounded-xl text-center"
                style={{ backgroundColor: T.primary + "18", border: `2px solid ${T.primary}44` }}>
                <div className="text-sm font-extrabold" style={{ color: T.primary }}>App Router</div>
              </div>
              <span className="text-base font-black shrink-0" style={{ color: T.dim }}>→</span>
              <div className="flex-1 py-3 px-2 rounded-xl text-center"
                style={{ backgroundColor: T.primary + "18", border: `2px solid ${T.primary}44` }}>
                <div className="text-sm font-extrabold leading-snug" style={{ color: T.primary }}>API Routes<br />30+</div>
              </div>
            </div>
          </div>

          <span className="text-xl font-black mt-7 shrink-0" style={{ color: T.dim }}>→</span>

          {/* DATA LAYER */}
          <div className="flex flex-col items-center gap-1.5 flex-[2]">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: T.warning + "22", color: T.warning }}>DATA LAYER</span>
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 py-3 px-2 rounded-xl text-center"
                style={{ backgroundColor: T.warning + "18", border: `2px solid ${T.warning}44` }}>
                <div className="text-sm font-extrabold" style={{ color: T.warning }}>Prisma ORM</div>
              </div>
              <span className="text-base font-black shrink-0" style={{ color: T.dim }}>→</span>
              <div className="flex-1 py-3 px-2 rounded-xl text-center"
                style={{ backgroundColor: T.warning + "18", border: `2px solid ${T.warning}44` }}>
                <div className="text-sm font-extrabold" style={{ color: T.warning }}>Supabase DB</div>
              </div>
            </div>
          </div>
        </div>

        {/* 외부 API 연결 */}
        <div className="flex items-center gap-3 justify-center mb-4">
          <span className="text-sm font-medium" style={{ color: T.dim }}>↑ 외부 연동 (API Routes)</span>
          <div className="w-px h-5" style={{ backgroundColor: T.border }} />
          {[
            { label: "KIS Open API",   color: T.primary },
            { label: "yahoo-finance2", color: T.primary },
            { label: "Claude API",     color: T.primary },
            { label: "R-ONE API",      color: T.warning },
          ].map(api => (
            <div key={api.label} className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ backgroundColor: api.color + "18", color: api.color, border: `2px solid ${api.color}44` }}>
              {api.label}
            </div>
          ))}
        </div>

        {/* 팀 롤 — 작은 텍스트 */}
        <div className="flex items-center justify-center gap-6 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
          {[
            { name: "김수현", role: "Frontend · UI/UX" },
            { name: "최우철", role: "Backend · API · DB" },
          ].map(m => (
            <div key={m.name} className="flex items-center gap-2">
              <Icon d={I.person} size={12} color={T.primary} strokeWidth={2} />
              <span className="text-xs font-bold" style={{ color: T.text }}>{m.name}</span>
              <span className="text-xs" style={{ color: T.dim }}>{m.role}</span>
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
  const pages = useCounter(12, 1000);
  const apis  = useCounter(30, 1200);
  const stats = [
    { label: "개발 기간", value: `${weeks}주` },
    { label: "페이지",    value: `${pages}개` },
    { label: "API Route", value: `${apis}+` },
  ];

  return (
    <div className="flex flex-col justify-center h-full px-16 max-w-5xl mx-auto w-full">
      <SlideHeader num="05" title="개발 에피소드" T={T} />

      {/* 숫자 단독 크게 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={s.label} className={`text-center py-6 rounded-2xl fade-up-${i + 2}`}
            style={{ backgroundColor: T.primarySoft, border: `1px solid ${T.primary}33` }}>
            <div className="text-7xl font-extrabold tabular-nums" style={{ color: T.primary }}>{s.value}</div>
            <div className="text-lg mt-2 font-medium" style={{ color: T.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { num: "01", icon: I.cpu,    title: "Claude Code — 설계문서가 맥락",
            desc: "CLAUDE.md + 00~08 설계 문서 첨부\n실질적인 제3의 팀원" },
          { num: "02", icon: I.users,  title: "MOCK→API 병렬 개발",
            desc: "백엔드 전 USE_MOCK 플래그로\n프론트 독립 개발, 연결 마찰 최소화" },
          { num: "03", icon: I.camera, title: "OCR 정확도 난관",
            desc: "정규식 불가 → Claude Vision 전환\n\"LLM이 더 실용적인 케이스\"" },
        ].map((ep, i) => (
          <div key={ep.num} className={`p-5 rounded-2xl fade-up-${i + 4}`}
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: T.primarySoft }}>
                <Icon d={ep.icon} size={16} color={T.primary} strokeWidth={2} />
              </div>
              <span className="text-sm font-bold" style={{ color: T.primary }}>EP {ep.num}</span>
            </div>
            <div className="text-xl font-bold mb-2" style={{ color: T.text }}>{ep.title}</div>
            <div className="text-base leading-relaxed whitespace-pre-line" style={{ color: T.muted }}>{ep.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DEMO: 큐카드 ────────────────────────────────────────────────────────────
function Slide7({ T }: { T: Theme }) {
  const steps = [
    { num: "01", icon: I.camera,    label: "신중한 시작",  desc: "온보딩 + OCR 일괄 등록" },
    { num: "02", icon: I.zap,       label: "FOMO 손실",    desc: "충동매매 기록\n이유: FOMO · 심리: 불안" },
    { num: "03", icon: I.chart,     label: "패턴 발견",    desc: "AI 성향 진단\n'FOMO 패턴' 생성" },
    { num: "04", icon: I.brain,     label: "AI 코칭",      desc: "잘한 것 / 실수\n/ 이번 달 목표" },
  ];

  return (
    <div className="flex flex-col justify-center h-full px-20 max-w-5xl mx-auto w-full">
      <SlideHeader num="06" title="DEMO" T={T} />
      <div className="grid grid-cols-4 gap-3 w-full max-w-4xl mb-8">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex-1 fade-up-${i + 2}`}>
              <div className="p-5 rounded-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex flex-col items-center py-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}>
                    <Icon d={s.icon} size={22} color="white" strokeWidth={2} />
                  </div>
                  <div className="text-[10px] font-bold mb-1" style={{ color: T.primary }}>STEP {s.num}</div>
                  <div className="text-xl font-bold mb-2" style={{ color: T.text }}>{s.label}</div>
                  <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: T.muted }}>{s.desc}</div>
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-1 shrink-0">
                <Icon d={I.arrow_r} size={16} color={T.dim} strokeWidth={1.5} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-8 py-4 rounded-2xl fade-up-6" style={{ backgroundColor: T.primarySoft, border: `1px solid ${T.primary}44` }}>
        <div className="text-lg font-bold" style={{ color: T.primary }}>localhost:3000</div>
        <div className="text-base mt-1" style={{ color: T.muted }}>demo@demo.com / demo1234</div>
      </div>
    </div>
  );
}

// ─── S7: 클로징 ──────────────────────────────────────────────────────────────
function Slide8({ T }: { T: Theme }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 overflow-hidden"
      style={{ backgroundColor: T.bg }}>
      {/* 배경 dot grid — 커버와 동일 */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: `radial-gradient(circle, ${T.primary} 1px, transparent 1px)`, backgroundSize: "36px 36px" }} />
      {/* 그린 글로우 — 커버와 동일 강도 */}
      <div className="absolute rounded-full pointer-events-none"
        style={{ width: 800, height: 800, background: T.glow, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

      <div className="relative z-10 flex flex-col items-center w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="버텨일지" className="mb-10 fade-up-1"
          style={{ width: 140, height: 140, borderRadius: 32, boxShadow: "0 0 60px rgba(5,192,114,0.45), 0 20px 40px rgba(0,0,0,0.6)" }} />
        <h2 className="text-8xl font-extrabold tracking-tight mb-6 fade-up-2" style={{ color: T.text }}>감사합니다</h2>
        <p className="text-4xl font-extrabold mb-4 fade-up-3" style={{ color: T.primary }}>버텨야 이긴다</p>
        <p className="text-2xl fade-up-4" style={{ color: T.muted }}>기록이 수익이 된다</p>

        <div className="mt-20 flex gap-4 fade-up-5">
          {[{ name: "김수현", role: "Frontend · UI/UX" }, { name: "최우철", role: "Backend · API · DB" }].map(m => (
            <div key={m.name} className="flex items-center gap-3 px-6 py-4 rounded-2xl"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <Icon d={I.person} size={16} color={T.primary} strokeWidth={2} />
              <div className="text-left">
                <div className="text-lg font-bold" style={{ color: T.text }}>{m.name}</div>
                <div className="text-sm" style={{ color: T.muted }}>{m.role}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-base fade-up-6" style={{ color: T.dim }}>2026.05.22</div>
      </div>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
const SLIDE_LIST = [Slide1, SlideBackground, Slide3, Slide4a, Slide4b, Slide5, Slide6, Slide7, Slide8];
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
      `}</style>

      <div className="fixed inset-0 flex flex-col select-none transition-colors duration-300"
        style={{ backgroundColor: T.bg, fontFamily: "'Pretendard','Apple SD Gothic Neo',-apple-system,system-ui,sans-serif" }}>

        <div className="flex-1 relative overflow-hidden">
          {/* key로 슬라이드 교체 시 자동 remount → fade-up 재실행 */}
          <div key={current} className="absolute inset-0 flex items-center justify-center">
            <SlideComponent T={T} />
          </div>

          {/* 브랜드 워터마크 — 커버 제외 전 슬라이드 우상단 고정 */}
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

        {/* 하단 네비 */}
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
            <button onClick={() => setDark(d => !d)}
              className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer ml-2 transition-colors"
              style={{ backgroundColor: T.cardAlt, border: `1px solid ${T.border}` }}>
              <Icon d={dark ? I.sun : I.moon} size={15} color={T.muted} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
