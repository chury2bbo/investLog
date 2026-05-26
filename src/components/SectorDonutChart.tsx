"use client";

import { useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipContentProps, TooltipValueType } from "recharts";

// ── 섹터 색상 (모드 무관 고정) ─────────────────────────────
const SECTOR_COLORS = [
  "#05C072", "#34D399", "#4285F4", "#F07D05",
  "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4",
  "#EF4444", "#6366F1",
];
const COLOR_OTHERS = "var(--color-g400)";

// ── 유틸 ────────────────────────────────────────────────────
function formatKRW(value: number): string {
  if (Math.abs(value) >= 1_0000_0000) return `${Math.floor((value / 1_0000_0000) * 10) / 10}억`;
  if (Math.abs(value) >= 1_0000) return `${Math.floor((value / 10000) * 10) / 10}만`;
  return Math.floor(value).toLocaleString();
}

// ── 타입 ────────────────────────────────────────────────────
interface HoldingInput {
  ticker: string;
  name: string;
  country: string;
  avgPrice: number;
  quantity: number;
  sectorAuto?: string | null;
  sectorManual?: string | null;
  currentPrice?: number;
  exchangeRate?: number;
}

interface SectorItem {
  label: string;
  pct: number;
  value: number;
  color: string;
}

interface HoldingRow {
  ticker: string;
  name: string;
  country: string;
  value: number;
  pct: number;
}

interface SectorDonutChartProps {
  holdings: HoldingInput[];
}

// ── 섹터 분포 계산 ──────────────────────────────────────────
function calcSectors(holdings: HoldingInput[], type: "auto" | "manual") {
  const map: Record<string, number> = {};
  let total = 0;

  holdings.forEach((h) => {
    const sector =
      type === "auto"
        ? h.sectorAuto ?? "미분류"
        : h.sectorManual ?? (h.sectorAuto ?? "미지정");
    const price = h.currentPrice ?? h.avgPrice;
    const rate = h.exchangeRate ?? 1;
    const value = price * h.quantity * rate;
    map[sector] = (map[sector] ?? 0) + value;
    total += value;
  });

  return {
    items: Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, val], i) => ({
        label,
        pct: total > 0 ? parseFloat(((val / total) * 100).toFixed(1)) : 0,
        value: val,
        color:
          label === "기타" || label === "미분류" || label === "미지정"
            ? COLOR_OTHERS
            : SECTOR_COLORS[i % SECTOR_COLORS.length],
      })),
    total,
  };
}

// ── 커스텀 툴팁 ──────────────────────────────────────────────
interface SectorTooltipProps {
  active?: boolean;
  payload?: readonly { payload: SectorItem }[];
  T: Record<string, string>;
}

function CustomTooltip({ active, payload, T }: SectorTooltipProps) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: T.tooltipBg,
      border: `1px solid ${T.tooltipBorder}`,
      borderRadius: 12,
      padding: "10px 14px",
      boxShadow: T.tooltipShadow,
      minWidth: 140,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 6 }}>
        {d.label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: T.textSecondary }}>평가금액</span>
        <span style={{ color: T.textPrimary, fontWeight: 600 }}>₩{formatKRW(d.value)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: T.textSecondary }}>비중</span>
        <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>{d.pct}%</span>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function SectorDonutChart({ holdings }: SectorDonutChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const T = useMemo(() => ({
    textPrimary:       isDark ? "#DCE8DC" : "#1A221A",
    textSecondary:     isDark ? "#5C7A5C" : "#6B7D6B",
    textMuted:         isDark ? "#3D5C3D" : "#9EAD9E",
    surfaceHover:      isDark ? "#253022" : "var(--color-g100)",
    border:            isDark ? "#2A3828" : "#E4EAE4",
    tabActiveBg:       isDark ? "#0D2B1A" : "#E8FBF3",
    tabActiveBorder:   "#05C072",
    tabActiveColor:    isDark ? "#05C072" : "#027A47",
    tabInactiveColor:  isDark ? "#5C7A5C" : "#6B7D6B",
    tabInactiveBorder: isDark ? "#2A3828" : "#E4EAE4",
    tooltipBg:         isDark ? "var(--color-tooltip)" : "#FFFFFF",
    tooltipBorder:     isDark ? "#2A3828" : "#E4EAE4",
    tooltipShadow:     isDark
      ? "0 4px 16px rgba(0,0,0,0.4)"
      : "0 4px 16px rgba(0,0,0,0.08)",
  }), [isDark]);

  const hasManualSector = holdings.some((h) => h.sectorManual);
  const [sectorTab, setSectorTab] = useState<"auto" | "manual">(hasManualSector ? "manual" : "auto");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const { items: sectorData, total: totalValue } = useMemo(
    () => calcSectors(holdings, sectorTab),
    [holdings, sectorTab]
  );

  const selectedHoldings = useMemo<HoldingRow[]>(() => {
    if (!selectedSector) return [];

    // 같은 섹터 종목 필터 후 ticker 기준 합산 (여러 계좌에 동일 종목 보유 시)
    const map = new Map<string, HoldingRow>();
    holdings
      .filter((h) => {
        const sector =
          sectorTab === "auto"
            ? h.sectorAuto ?? "미분류"
            : h.sectorManual ?? (h.sectorAuto ?? "미지정");
        return sector === selectedSector;
      })
      .forEach((h) => {
        const price = h.currentPrice ?? h.avgPrice;
        const rate = h.exchangeRate ?? 1;
        const value = price * h.quantity * rate;
        const existing = map.get(h.ticker);
        if (existing) {
          existing.value += value;
        } else {
          map.set(h.ticker, { ticker: h.ticker, name: h.name, country: h.country, value, pct: 0 });
        }
      });

    const rows = Array.from(map.values()).sort((a, b) => b.value - a.value);
    const sectorTotal = rows.reduce((s, r) => s + r.value, 0);
    return rows.map((r) => ({
      ...r,
      pct: sectorTotal > 0 ? parseFloat(((r.value / sectorTotal) * 100).toFixed(1)) : 0,
    }));
  }, [selectedSector, holdings, sectorTab]);

  const renderTooltip = useCallback(
    (props: TooltipContentProps<TooltipValueType, string | number>) => {
      const payload = props.payload as readonly { payload: SectorItem }[] | undefined;
      return <CustomTooltip active={props.active} payload={payload} T={T} />;
    },
    [T]
  );

  if (holdings.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: T.textMuted }}>
        보유 종목이 없습니다.
      </p>
    );
  }

  return (
    <div>
      {/* 탭: 내 섹터 / 기본 섹터 토글 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-0.5 rounded-xl bg-[var(--color-g100)] dark:bg-[var(--color-border)] p-0.5">
          {hasManualSector && (
            <button
              onClick={() => setSectorTab("manual")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                sectorTab === "manual"
                  ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-g500)] dark:text-[var(--color-muted)]"
              }`}
            >
              내섹터
            </button>
          )}
          <button
            onClick={() => setSectorTab("auto")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              sectorTab === "auto"
                ? "bg-[var(--color-surface)] dark:bg-[var(--color-card)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-g500)] dark:text-[var(--color-muted)]"
            }`}
          >
            기본섹터
          </button>
        </div>
        {!hasManualSector && (
          <span className="text-[11px]" style={{ color: T.textMuted }}>
            내 섹터를 지정하면 탭이 추가돼요
          </span>
        )}
      </div>

      {sectorData.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: T.textMuted }}>
          섹터 데이터가 없습니다.
        </p>
      ) : (
        <>
          {/* 도넛 차트 */}
          <div className="relative" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  dataKey="value"
                  strokeWidth={2}
                  stroke={isDark ? "var(--color-tooltip)" : "#FFFFFF"}
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {sectorData.map((entry, index) => (
                    <Cell
                      key={entry.label}
                      fill={entry.color}
                      opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.4 : 1}
                      style={{ transition: "opacity 0.2s", cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} position={{ x: 0, y: -10 }} />
              </PieChart>
            </ResponsiveContainer>

            {/* 도넛 중앙 텍스트 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px]" style={{ color: T.textSecondary }}>총 평가금액</span>
              <span className="text-[17px] font-bold mt-0.5" style={{ color: T.textPrimary }}>
                ₩{formatKRW(totalValue)}
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: T.textMuted }}>
                {sectorData.length}개 섹터
              </span>
            </div>
          </div>

          {/* 범례 */}
          <div className="mt-3 space-y-1">
            {sectorData.map((item, index) => {
              const isSelected = selectedSector === item.label;
              return (
                <div key={item.label}>
                  <div
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                    style={{ background: isSelected ? T.tabActiveBg : hoveredIndex === index ? T.surfaceHover : "transparent" }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setSelectedSector(isSelected ? null : item.label)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-[13px] font-medium" style={{ color: isSelected ? T.tabActiveColor : T.textPrimary }}>{item.label}</span>
                      <span className="text-[11px]" style={{ color: T.textMuted }}>₩{formatKRW(item.value)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold" style={{ color: isSelected ? T.tabActiveColor : T.textPrimary }}>{item.pct}%</span>
                      <span className="text-[11px]" style={{ color: T.textMuted }}>{isSelected ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* 섹터 클릭 시 종목 목록 */}
                  {isSelected && (
                    <div className="mx-2 mb-1 mt-0.5 rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                      {selectedHoldings.map((h, i) => (
                        <div
                          key={h.ticker}
                          className="flex items-center gap-2 px-3 py-2"
                          style={{
                            borderTop: i > 0 ? `1px solid ${T.border}` : "none",
                            background: isDark ? "var(--color-card)" : "var(--color-g100)",
                          }}
                        >
                          <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded" style={{ background: T.border, color: T.textSecondary }}>
                            {h.country}
                          </span>
                          <span className="min-w-0 flex-1 text-[13px] font-medium truncate" style={{ color: T.textPrimary }}>{h.name}</span>
                          <span className="shrink-0 text-[11px]" style={{ color: T.textMuted }}>{h.ticker}</span>
                          <span className="shrink-0 text-[12px] font-bold" style={{ color: T.tabActiveColor }}>{h.pct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 안내 문구 */}
          <p className="text-[11px] mt-3 px-1" style={{ color: T.textMuted }}>
            평가금액 기준 · 해외 종목은 <span style={{ color: T.textSecondary }}>실시간 환율</span> 적용
          </p>
        </>
      )}
    </div>
  );
}
