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
    { icon: I.chart,  label: "통합 포트폴리오" },
    { icon: I.edit,   label: "매매일지" },
    { icon: I.brain,  label: "AI 성향 진단" },
    { icon: I.search, label: "AI 종목 분석" },
    { icon: I.cpu,    label: "AI 코칭 리포트" },
    { icon: I.camera, label: "스크린샷 등록" },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-20">
      <div className="max-w-5xl mx-auto w-full">
        <SlideHeader num="02" title="개발 목표 & 구현 범위" T={T} />
        <div className="grid grid-cols-2 gap-10 items-start">
          <div className="fade-up-2">
            <div className="text-[11px] font-bold mb-5 tracking-widest" style={{ color: T.dim }}>CORE PHILOSOPHY</div>
            <blockquote className="text-5xl font-extrabold leading-tight mb-6" style={{ color: T.text }}>
              "수기 입력의<br />마찰 자체가<br />
              <span style={{ color: T.primary }}>제품 가치"</span>
            </blockquote>
            <div className="p-4 rounded-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <p className="text-base leading-relaxed" style={{ color: T.muted }}>
                매매 이유 태그를 고르는 순간,<br />
                <span className="font-bold" style={{ color: T.text }}>"이게 FOMO인가, 진짜 확신인가"</span>를<br />
                한 번 더 생각하게 됩니다.
              </p>
            </div>
          </div>
          <div className="fade-up-3">
            <div className="text-[11px] font-bold mb-4 tracking-widest" style={{ color: T.dim }}>IMPLEMENTATION SCOPE</div>
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {scope.map(s => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: T.primarySoft }}>
                    <Icon d={s.icon} size={14} color={T.primary} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: T.text }}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-2xl" style={{ backgroundColor: T.primarySoft, border: `1px solid ${T.primary}33` }}>
              <div className="text-[10px] font-bold mb-2 tracking-widest" style={{ color: T.dim }}>EXPECTED EFFECT</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: I.trending, label: "패턴 파악",     desc: "매매 이유 태그로\n나의 투자 습관 시각화" },
                  { icon: I.repeat,   label: "반복 손실 방지", desc: "AI 코칭으로\n실수 패턴 인식 · 개선" },
                  { icon: I.brain,    label: "투자 심리 개선", desc: "심리 기록 → 감정\n주도 매매 줄이기" },
                ].map(item => (
                  <div key={item.label} className="flex flex-col items-center text-center gap-1 p-2.5 rounded-xl"
                    style={{ backgroundColor: T.card, border: `1px solid ${T.primary}22` }}>
                    <Icon d={item.icon} size={14} color={T.primary} strokeWidth={2} />
                    <div className="text-xs font-bold leading-tight" style={{ color: T.primary }}>{item.label}</div>
                    <div className="text-[10px] leading-tight whitespace-pre-line" style={{ color: T.muted }}>{item.desc}</div>
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

// ─── S2-2: 경쟁사 비교 ───────────────────────────────────────────────────────
function SlideCompetitor({ T }: { T: Theme }) {
  type Mark = "check" | "x" | "partial";
  const rows: { section?: string; label?: string; cols?: Mark[] }[] = [
    { section: "포트폴리오" },
    { label: "국내 + 해외 통합 관리",    cols: ["check", "check", "x",       "check"] },
    { label: "실시간 환율 원화 환산",    cols: ["check", "check", "partial", "check"] },
    { label: "스크린샷 종목 일괄 등록",  cols: ["x",     "x",     "x",       "check"] },
    { section: "매매 기록" },
    { label: "매매일지 (수기 기록)",     cols: ["check", "x",     "x",       "check"] },
    { label: "매매 이유 태그 기록",      cols: ["x",     "x",     "x",       "check"] },
    { label: "매매 심리 상태 기록",      cols: ["partial","x",    "x",       "check"] },
    { section: "AI 분석" },
    { label: "AI 투자성향 진단",         cols: ["x",     "x",     "x",       "check"] },
    { label: "AI 패턴 코칭 리포트",      cols: ["x",     "x",     "x",       "check"] },
    { label: "AI 종목 분석 (SWOT·적정가)", cols: ["x",   "partial","x",       "check"] },
    { label: "벤치마크 수익률 비교",     cols: ["partial","x",    "partial", "check"] },
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

  const usColStyle = { background: `${T.primary}08`, borderLeft: `1px solid ${T.primary}20`, borderRight: `1px solid ${T.primary}20` };

  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden" style={{ padding: "0 72px" }}>
      <div className="max-w-5xl mx-auto w-full">
        <SlideHeader num="02-2" title="기존 앱이 못한 것, 버텨일지가 합니다" T={T} />

        <div className="fade-up-2">
          <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="text-left py-3 px-3 text-[11px] font-bold" style={{ color: T.dim, width: 220 }}></th>
                {["더리치", "도미노", "증권사 앱"].map(name => (
                  <th key={name} className="py-3 px-3 text-center text-[12px] font-bold" style={{ color: T.muted }}>{name}</th>
                ))}
                <th className="py-3 px-3 text-center text-[12px] font-bold rounded-t-xl" style={{ color: T.primary, ...usColStyle }}>
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
                  <td colSpan={4} className="pt-3 pb-1 px-3 text-[10px] font-bold tracking-widest" style={{ color: T.dim }}>{row.section.toUpperCase()}</td>
                  <td style={usColStyle}></td>
                </tr>
              ) : (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}60` }}>
                  <td className="py-2.5 px-3 text-[13px] font-medium" style={{ color: T.muted }}>{row.label}</td>
                  {row.cols!.slice(0, 3).map((m, j) => (
                    <td key={j} className="py-2.5 px-3 text-center"><Mark m={m} /></td>
                  ))}
                  <td className="py-2.5 px-3 text-center" style={usColStyle}><Mark m={row.cols![3]} /></td>
                </tr>
              ))}
              <tr>
                <td colSpan={4}></td>
                <td className="rounded-b-xl" style={{ ...usColStyle, borderBottom: `1px solid ${T.primary}20`, height: 8 }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 fade-up-3">
          {[
            { icon: I.brain,  title: "왜 기록하는가",    desc: "다른 앱은 결과만 보여줌\n버텨일지는 이유와 심리까지 기록해 패턴을 만듦" },
            { icon: I.cpu,    title: "AI의 깊이가 다름",  desc: "단순 뉴스 요약이 아닌\n누적 행동 데이터 기반 성향 진단 + 코칭" },
            { icon: I.camera, title: "온보딩 마찰 제로",  desc: "증권사 앱 캡처 한 장으로\n보유종목 전체 자동 등록 (Claude Vision)" },
          ].map(p => (
            <div key={p.title} className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ backgroundColor: `${T.primary}08`, border: `1px solid ${T.primary}18` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${T.primary}18` }}>
                <Icon d={p.icon} size={16} color={T.primary} strokeWidth={2} />
              </div>
              <div>
                <div className="text-[12px] font-bold mb-1" style={{ color: T.primary }}>{p.title}</div>
                <div className="text-[11px] whitespace-pre-line leading-relaxed" style={{ color: T.muted }}>{p.desc}</div>
              </div>
            </div>
          ))}
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
  const reasonTags = ["FOMO", "저평가", "실적발표", "기술적분석", "지인추천"];
  const emotionTags = [
    { label: "확신", color: T.primary },
    { label: "불안", color: T.warning },
    { label: "FOMO", color: T.negative },
  ];
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ padding: "28px 64px" }}>
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 mb-3 shrink-0 fade-up-1">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: T.primarySoft, color: T.primary }}>05</span>
          <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: T.text }}>핵심 기능</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">

          {/* 통합 포트폴리오 */}
          <div className="p-4 rounded-2xl flex flex-col fade-up-2 overflow-hidden"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-3 mb-2 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.primarySoft }}>
                <Icon d={I.chart} size={18} color={T.primary} strokeWidth={2} />
              </div>
              <div className="text-lg font-bold" style={{ color: T.text }}>통합 포트폴리오</div>
            </div>
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden mb-2" style={{ backgroundColor: T.cardAlt }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/slides/img_portfolio_1.png" alt="대시보드" className="w-full h-full object-contain object-top" />
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {["국내 + 해외 주식 실시간 통합", "환율 자동 환산 · 수익률 추이 차트", "계좌별 비중 · MDD 분석"].map(pt => (
                <div key={pt} className="flex items-center gap-2 text-[11px]" style={{ color: T.muted }}>
                  <span style={{ color: T.primary }}>·</span>{pt}
                </div>
              ))}
            </div>
          </div>

          {/* 매매일지 — 핵심 차별점 */}
          <div className="p-4 rounded-2xl flex flex-col fade-up-3 overflow-hidden"
            style={{ backgroundColor: T.card, border: `2px solid ${T.primary}55`, boxShadow: `0 0 24px ${T.primary}18` }}>
            <div className="flex items-center gap-3 mb-2 shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.primarySoft }}>
                <Icon d={I.edit} size={18} color={T.primary} strokeWidth={2} />
              </div>
              <div>
                <div className="text-lg font-bold leading-none" style={{ color: T.text }}>매매일지</div>
                <div className="text-[10px] font-bold mt-0.5" style={{ color: T.primary }}>핵심 차별점</div>
              </div>
            </div>
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden mb-2" style={{ backgroundColor: T.cardAlt }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/slides/img_portfolio_3.png" alt="매매등록" className="w-full h-full object-contain object-top" />
            </div>
            <div className="shrink-0 mb-1.5">
              <div className="text-[10px] font-bold mb-1" style={{ color: T.dim }}>매매 이유 태그</div>
              <div className="flex flex-wrap gap-1">
                {reasonTags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: T.primarySoft, color: T.primary }}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="shrink-0">
              <div className="text-[10px] font-bold mb-1" style={{ color: T.dim }}>심리 상태</div>
              <div className="flex gap-1.5">
                {emotionTags.map(e => (
                  <span key={e.label} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: e.color + "18", color: e.color, border: `1px solid ${e.color}40` }}>{e.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 스크린샷 등록 */}
          <div className="p-4 rounded-2xl flex flex-col fade-up-4 overflow-hidden"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
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
  const techSections = [
    {
      label: "Frontend",
      items: [
        { name: "Next.js 16",  desc: "App Router · TypeScript strict" },
        { name: "Tailwind v4", desc: "CSS · 다크모드" },
        { name: "Recharts 3",  desc: "차트 · 도넛 · MDD" },
      ],
    },
    {
      label: "Backend · DB",
      items: [
        { name: "NextAuth v5", desc: "JWT · Google · Kakao" },
        { name: "Prisma 7",    desc: "ORM · PostgreSQL" },
        { name: "Supabase",    desc: "클라우드 DB · 2인 공유" },
      ],
    },
    {
      label: "시세 · 데이터",
      items: [
        { name: "KIS Open API",    desc: "국내 실시간 시세 · 섹터" },
        { name: "yahoo-finance2",  desc: "해외 주가 · API키 불필요" },
        { name: "R-ONE API",       desc: "서울아파트 벤치마크" },
      ],
    },
  ];
  const aiPoints = [
    { tag: "Vision",  tagColor: T.blue,    tagBg: `${T.blue}18`,
      title: "스크린샷 종목 등록",
      desc: "증권사 앱 캡처 → 종목명·평단가·수량 자동 추출\n규칙 기반 OCR 불가 → LLM이 유일한 해법" },
    { tag: "분석",    tagColor: "#ffb832", tagBg: "rgba(255,184,50,0.12)",
      title: "AI 종목 분석 리포트",
      desc: "SWOT · 적정 매수/매도가 · 호재/악재\n당일 캐시 → 동일 종목 1회 호출" },
    { tag: "성향",    tagColor: "#c87aff", tagBg: "rgba(180,100,255,0.12)",
      title: "투자성향 진단 + 코칭",
      desc: "최근 6개월 매매 패턴 → 유형 분류 + 강점/약점\n누적 행동 데이터 기반 — 단순 뉴스 요약과 다름" },
    { tag: "요약",    tagColor: T.primary, tagBg: `${T.primary}18`,
      title: "기업 소개 한국어 요약",
      desc: "티커당 영구 캐시 → API 비용 최소화\n초보 투자자 눈높이 2~3줄 요약" },
  ];
  const stats = [
    { num: "6",   label: "Claude 호출 포인트", sub: "Vision · 분석 · 성향 · 코칭 · 요약 · 코드개발" },
    { num: "$0",  label: "DB 비용",            sub: "Supabase 무료 티어로 운영" },
    { num: "~$9", label: "Claude API 월 예상비용", sub: "캐시 전략으로 실사용 최소화" },
  ];

  return (
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-14">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-5">
        <SlideHeader num="03" title="기술 스택 & AI 활용" T={T} />

        <div className="grid grid-cols-2 gap-5 fade-up-2">
          {/* 왼쪽: 기술 목록 */}
          <div className="flex flex-col gap-3">
            {techSections.map((sec) => (
              <div key={sec.label} className="rounded-2xl px-5 py-4"
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: T.dim }}>{sec.label.toUpperCase()}</div>
                {sec.items.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between py-2"
                    style={{ borderBottom: i < sec.items.length - 1 ? `1px solid ${T.border}60` : "none" }}>
                    <span className="text-[13px] font-bold" style={{ color: T.text }}>{item.name}</span>
                    <span className="text-[11px]" style={{ color: T.muted }}>{item.desc}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 오른쪽: AI 활용 포인트 */}
          <div className="rounded-2xl px-5 py-4 flex flex-col gap-0"
            style={{ backgroundColor: `${T.primary}06`, border: `1px solid ${T.primary}20` }}>
            <div className="text-[10px] font-bold tracking-widest mb-3 flex items-center gap-2" style={{ color: T.primary }}>
              <span>🤖</span> CLAUDE API 활용 포인트
            </div>
            {aiPoints.map((item) => (
              <div key={item.tag} className="flex items-start gap-3 py-3"
                style={{ borderBottom: `1px solid ${T.primary}10` }}>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: item.tagBg, color: item.tagColor }}>{item.tag}</span>
                <div>
                  <div className="text-[13px] font-bold mb-1" style={{ color: T.text }}>{item.title}</div>
                  <div className="text-[11px] whitespace-pre-line leading-relaxed" style={{ color: T.muted }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 스탯 바 */}
        <div className="grid grid-cols-3 gap-3 fade-up-4">
          {stats.map((s) => (
            <div key={s.num} className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="text-[22px] font-extrabold shrink-0" style={{ color: T.primary }}>{s.num}</div>
              <div>
                <div className="text-[12px] font-bold" style={{ color: T.text }}>{s.label}</div>
                <div className="text-[11px]" style={{ color: T.muted }}>{s.sub}</div>
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
    <div className="absolute inset-0 flex flex-col justify-center overflow-hidden px-14">
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-5">
        <SlideHeader num="04" title="개발 에피소드" T={T} />

        {/* 상단 통계 */}
        <div className="grid grid-cols-3 gap-3 fade-up-2">
          {[
            { num: weeks, suffix: "주", label: "개발 기간",  sub: "업무 중 틈틈이 · 2인 팀" },
            { num: apis,  suffix: "+",  label: "API Route",  sub: "자체 개발 · 별도 서버 없음" },
            { num: pages, suffix: "",   label: "페이지",      sub: "반응형 · 다크모드 전체 지원" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="text-[26px] font-extrabold shrink-0 tabular-nums" style={{ color: T.primary }}>{s.num}{s.suffix}</div>
              <div>
                <div className="text-[12px] font-bold" style={{ color: T.text }}>{s.label}</div>
                <div className="text-[11px]" style={{ color: T.muted }}>{s.sub}</div>
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
              <span className="text-[10px] font-bold tracking-widest" style={{ color: T.dim }}>EP 01</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.primarySoft }}>
              <Icon d={I.cpu} size={20} color={T.primary} strokeWidth={2} />
            </div>
            <div>
              <div className="text-base font-extrabold leading-snug mb-1" style={{ color: T.text }}>Claude Code가<br />제3의 팀원</div>
              <div className="text-[11px] font-bold" style={{ color: T.primary }}>AI 활용 · 설계문서 = 맥락</div>
            </div>
            <div className="flex flex-col gap-1.5">
              {["설계문서 전체를 CLAUDE.md에 연결 — 매 세션 컨텍스트 유지", "단순 코드 생성이 아닌 설계 → 분업 → 구현까지 함께", "2인이 부족한 자리를 Claude Code가 채움"].map(t => (
                <div key={t} className="flex items-start gap-1.5 text-[11px]" style={{ color: T.muted }}>
                  <span className="shrink-0 mt-0.5" style={{ color: T.primary }}>→</span>{t}
                </div>
              ))}
            </div>
            <div className="mt-auto px-3 py-2 rounded-lg text-[11px] italic" style={{ background: `${T.primary}08`, borderLeft: `2px solid ${T.primary}`, color: T.muted }}>"PM처럼 설계하고, 팀원처럼 코딩했다"</div>
          </div>

          {/* EP 02 */}
          <div className="p-4 rounded-2xl flex flex-col gap-3 fade-up-4"
            style={{ backgroundColor: `${T.primary}04`, border: `1px solid ${T.primary}20` }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest" style={{ color: T.dim }}>EP 02</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${T.primary}15`, color: T.primary }}>⭐ 팀워크</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.blue + "18" }}>
              <Icon d={I.zap} size={20} color={T.blue} strokeWidth={2} />
            </div>
            <div>
              <div className="text-base font-extrabold leading-snug mb-1" style={{ color: T.text }}>쓰다 보니<br />기능이 생겼다</div>
              <div className="text-[11px] font-bold" style={{ color: T.primary }}>실제 투자자가 만든 앱</div>
            </div>
            <div className="flex flex-col gap-1.5">
              {["직접 쓰면서 불편한 것이 바로 다음 기능이 됨", "벤치마크 비교 — \"비트코인·금·서울집값에 넣었으면?\" 실제로 궁금해서 추가", "KOSPI 비교 → 금·BTC·서울아파트까지 확장"].map(t => (
                <div key={t} className="flex items-start gap-1.5 text-[11px]" style={{ color: T.muted }}>
                  <span className="shrink-0 mt-0.5" style={{ color: T.primary }}>→</span>{t}
                </div>
              ))}
            </div>
            <div className="mt-auto px-3 py-2 rounded-lg text-[11px] italic" style={{ background: `${T.primary}08`, borderLeft: `2px solid ${T.primary}`, color: T.muted }}>"사용자가 곧 개발자 — 진짜 필요한 것만 만들었다"</div>
          </div>

          {/* EP 03 */}
          <div className="p-4 rounded-2xl flex flex-col gap-3 fade-up-5"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest" style={{ color: T.dim }}>EP 03</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(180,100,255,0.12)" }}>
              <Icon d={I.camera} size={20} color="#c87aff" strokeWidth={2} />
            </div>
            <div>
              <div className="text-base font-extrabold leading-snug mb-1" style={{ color: T.text }}>팀원 아이디어가<br />핵심 기능이 됐다</div>
              <div className="text-[11px] font-bold" style={{ color: T.primary }}>예상 외 에피소드 · OCR → Vision</div>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { badge: "아이디어", badgeColor: T.muted,    badgeBg: `${T.border}80`,   text: "\"캡처 한 장으로 종목 등록되면?\" — 설계에 없던 기능" },
                { badge: "실패",     badgeColor: T.negative, badgeBg: `${T.negative}15`, text: "규칙 기반 OCR — 증권사마다 레이아웃 달라서 불가" },
                { badge: "해결",     badgeColor: T.primary,  badgeBg: `${T.primary}15`,  text: "Claude Vision 전환 — 오히려 더 정확하고 빠름" },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0" style={{ backgroundColor: f.badgeBg, color: f.badgeColor }}>{f.badge}</span>
                  <span style={{ color: T.muted }}>{f.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto px-3 py-2 rounded-lg text-[11px] italic" style={{ background: `${T.primary}08`, borderLeft: `2px solid ${T.primary}`, color: T.muted }}>"팀원 아이디어 + AI = 설계 밖에서 핵심 기능 탄생"</div>
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
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-5">
        <SlideHeader num="06" title="DEMO" T={T} />

        {/* 내러티브 타임라인 */}
        <div className="fade-up-2 rounded-2xl p-5" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <div className="text-[10px] font-bold mb-4 tracking-widest" style={{ color: T.dim }}>USER JOURNEY — 데모에서 보여줄 흐름</div>
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
                <div className="text-[9px] font-bold mb-1" style={{ color: n.color }}>{n.phase}</div>
                <div className="text-[11px] font-bold mb-1 leading-tight" style={{ color: T.text }}>{n.label}</div>
                <div className="text-[10px] leading-snug" style={{ color: T.muted }}>{n.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 데모 큐카드 */}
        <div className="grid grid-cols-4 gap-3 fade-up-3">
          {[
            { num: "01", icon: I.camera, label: "온보딩", desc: "OCR로 보유종목\n일괄 등록" },
            { num: "02", icon: I.edit,   label: "매매 기록", desc: "이유 태그 + 심리\n상태 기록" },
            { num: "03", icon: I.brain,  label: "AI 성향 진단", desc: "FOMO 패턴\n시각화" },
            { num: "04", icon: I.cpu,    label: "AI 코칭", desc: "잘한 것 / 실수\n이번 달 목표" },
          ].map((s, i) => (
            <div key={s.num} className={`p-4 rounded-2xl fade-up-${i + 3}`}
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${T.primaryDark}, ${T.primary})` }}>
                  <Icon d={s.icon} size={18} color="white" strokeWidth={2} />
                </div>
                <div className="text-[10px] font-bold" style={{ color: T.primary }}>STEP {s.num}</div>
                <div className="text-sm font-bold" style={{ color: T.text }}>{s.label}</div>
                <div className="text-[11px] whitespace-pre-line leading-snug" style={{ color: T.muted }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* URL 바 */}
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl fade-up-6"
          style={{ backgroundColor: T.primarySoft, border: `1px solid ${T.primary}44` }}>
          <Icon d={I.globe} size={16} color={T.primary} strokeWidth={2} />
          <span className="text-base font-extrabold" style={{ color: T.primary }}>localhost:3000</span>
          <span className="text-sm" style={{ color: T.muted }}>demo@demo.com · demo1234</span>
        </div>
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
const SLIDE_LIST = [Slide1, SlideBackground, Slide3, SlideCompetitor, Slide5, Slide6, Slide4a, Slide4b, Slide7, Slide8];
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
