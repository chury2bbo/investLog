"use client";

import { useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// ── 섹터 색상 (모드 무관 고정) ─────────────────────────────
const SECTOR_COLORS = [
  "#05C072", "#34D399", "#4285F4", "#F07D05",
  "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4",
  "#EF4444", "#6366F1",
];
const COLOR_OTHERS = "#9AA99A";

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
interface TooltipProps {
  active?: boolean;
  payload?: { payload: SectorItem }[];
  T: Record<string, string>;
}

function CustomTooltip({ active, payload, T }: TooltipProps) {
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
        <span style={{ color: "#05C072", fontWeight: 600 }}>{d.pct}%</span>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function SectorDonutChart({ holdings }: SectorDonutChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const T = {
    textPrimary:       isDark ? "#DCE8DC" : "#1A221A",
    textSecondary:     isDark ? "#5C7A5C" : "#6B7D6B",
    textMuted:         isDark ? "#3D5C3D" : "#9EAD9E",
    surfaceHover:      isDark ? "#253022" : "#F0F4F0",
    border:            isDark ? "#2A3828" : "#E4EAE4",
    tabActiveBg:       isDark ? "#0D2B1A" : "#E8FBF3",
    tabActiveBorder:   "#05C072",
    tabActiveColor:    isDark ? "#05C072" : "#027A47",
    tabInactiveColor:  isDark ? "#5C7A5C" : "#6B7D6B",
    tabInactiveBorder: isDark ? "#2A3828" : "#E4EAE4",
    tooltipBg:         isDark ? "#1D2720" : "#FFFFFF",
    tooltipBorder:     isDark ? "#2A3828" : "#E4EAE4",
    tooltipShadow:     isDark
      ? "0 4px 16px rgba(0,0,0,0.4)"
      : "0 4px 16px rgba(0,0,0,0.08)",
  };

  const hasManualSector = holdings.some((h) => h.sectorManual);
  const [sectorTab, setSectorTab] = useState<"auto" | "manual">(hasManualSector ? "manual" : "auto");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { items: sectorData, total: totalValue } = useMemo(
    () => calcSectors(holdings, sectorTab),
    [holdings, sectorTab]
  );

  const renderTooltip = useCallback(
    (props: { active?: boolean; payload?: { payload: SectorItem }[] }) => (
      <CustomTooltip {...props} T={T} />
    ),
    [isDark]
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
      {/* 탭: 내 섹터 먼저 */}
      <div className="flex gap-2 mb-4">
        {hasManualSector && (
          <button
            onClick={() => setSectorTab("manual")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              border: sectorTab === "manual" ? `1.5px solid ${T.tabActiveBorder}` : `1px solid ${T.tabInactiveBorder}`,
              background: sectorTab === "manual" ? T.tabActiveBg : "transparent",
              color: sectorTab === "manual" ? T.tabActiveColor : T.tabInactiveColor,
            }}
          >
            내 섹터
          </button>
        )}
        <button
          onClick={() => setSectorTab("auto")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            border: sectorTab === "auto" ? `1.5px solid ${T.tabActiveBorder}` : `1px solid ${T.tabInactiveBorder}`,
            background: sectorTab === "auto" ? T.tabActiveBg : "transparent",
            color: sectorTab === "auto" ? T.tabActiveColor : T.tabInactiveColor,
          }}
        >
          기본 섹터
        </button>
        {!hasManualSector && (
          <span className="text-[11px] self-center ml-1" style={{ color: T.textMuted }}>
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
                  stroke={isDark ? "#1D2720" : "#FFFFFF"}
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
                <Tooltip content={renderTooltip} />
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
            {sectorData.map((item, index) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors"
                style={{ background: hoveredIndex === index ? T.surfaceHover : "transparent" }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[13px] font-medium" style={{ color: T.textPrimary }}>{item.label}</span>
                  <span className="text-[11px]" style={{ color: T.textMuted }}>₩{formatKRW(item.value)}</span>
                </div>
                <span className="text-[13px] font-bold" style={{ color: T.textPrimary }}>{item.pct}%</span>
              </div>
            ))}
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
