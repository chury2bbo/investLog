"use client";

import { useState, useEffect } from "react";
import { Card, SectionTitle, LoadingSpinner } from "@/components/ui";

interface TypeStat {
  calls: number;
  input: number;
  output: number;
}

interface ApiStatusItem {
  name: string;
  status: "ok" | "error";
  latency: number;
  message?: string;
}

interface DailyTrendItem {
  date: string;
  calls: number;
  input: number;
  output: number;
  cost: number;
}

interface PeriodSummary {
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  byType: Record<string, TypeStat>;
}

interface AdminData {
  currentMonth: string;
  month: PeriodSummary;
  week: PeriodSummary;
  total: PeriodSummary;
  dailyTrend: DailyTrendItem[];
  apiStatus: ApiStatusItem[];
}

const TYPE_LABELS: Record<string, string> = {
  analysis: "종목분석",
  summary: "기업소개",
  personality_summary: "유형진단",
  coaching: "AI코칭",
  import: "이미지분석",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin")
      .then((res) => {
        if (res.status === 403) throw new Error("관리자 권한이 필요합니다.");
        if (!res.ok) throw new Error("데이터 로딩 실패");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[var(--color-negative)]">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full max-w-3xl mx-auto px-5 py-6 pb-28 md:pb-6 animate-[fadeIn_0.4s_ease-out]">
      <h1 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] mb-6">
        관리자 대시보드
      </h1>

      {/* ── API 상태 ── */}
      <SectionTitle title="API 상태" />
      <Card>
        <div className="space-y-2.5">
          {data.apiStatus.map((api) => (
            <div key={api.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: api.status === "ok" ? "var(--color-positive)" : "var(--color-negative)",
                  }}
                />
                <span className="text-sm font-medium text-[var(--color-text)]">{api.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-g400)]">
                {api.latency > 0 && <span>{api.latency}ms</span>}
                {api.message && <span>{api.message}</span>}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    api.status === "ok"
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-positive)]"
                      : "bg-[var(--color-negative-soft)] text-[var(--color-negative)]"
                  }`}
                >
                  {api.status === "ok" ? "정상" : "오류"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 사용량 요약 카드 ── */}
      <div className="mt-4">
        <SectionTitle title="Claude API 사용량" />
        <div className="grid grid-cols-3 gap-2.5">
          {([
            { label: `${data.currentMonth} 예상`, d: data.month },
            { label: "최근 7일", d: data.week },
            { label: "전체 누적", d: data.total },
          ] as const).map(({ label, d }) => (
            <Card key={label}>
              <div className="text-[10px] text-[var(--color-g400)] mb-1">{label}</div>
              <div className="text-lg font-bold text-[var(--color-text)]">{d.totalCalls}<span className="text-xs font-normal text-[var(--color-g400)]">건</span></div>
              <div className="mt-1.5 space-y-0.5 text-[10px] text-[var(--color-g400)]">
                <div>입력 {formatTokens(d.inputTokens)} tokens</div>
                <div>출력 {formatTokens(d.outputTokens)} tokens</div>
              </div>
              <div className="mt-1.5 text-sm font-bold text-[var(--color-primary)]">
                {"$"}{(d.cost ?? 0).toFixed(4)}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── 유형별 사용량 ── */}
      <div className="mt-4">
        <SectionTitle title="유형별 사용량 (전체)" />
        <Card>
          <div className="space-y-2">
            {Object.entries(data.total.byType).map(([type, stat]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text)] font-medium">{TYPE_LABELS[type] ?? type}</span>
                <div className="flex items-center gap-3 text-xs text-[var(--color-g400)]">
                  <span>{stat.calls}건</span>
                  <span>{formatTokens(stat.input + stat.output)} tokens</span>
                  <span className="font-bold text-[var(--color-primary)]">
                    {"$"}{(((stat.input / 1_000_000) * 3 + (stat.output / 1_000_000) * 15) ).toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── 일별 추이 ── */}
      {data.dailyTrend.length > 0 && (
        <div className="mt-4">
          <SectionTitle title="일별 추이 (최근 7일)" />
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--color-g400)] border-b border-[var(--color-g200)] dark:border-[var(--color-border)]">
                    <th className="text-left py-2 font-medium">날짜</th>
                    <th className="text-right py-2 font-medium">호출</th>
                    <th className="text-right py-2 font-medium">입력</th>
                    <th className="text-right py-2 font-medium">출력</th>
                    <th className="text-right py-2 font-medium">비용</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyTrend.map((d) => (
                    <tr key={d.date} className="border-b border-[var(--color-g100)] dark:border-[var(--color-border)] last:border-0">
                      <td className="py-2 text-[var(--color-text)]">{d.date.slice(5)}</td>
                      <td className="py-2 text-right text-[var(--color-text)]">{d.calls}건</td>
                      <td className="py-2 text-right text-[var(--color-g400)]">{formatTokens(d.input)}</td>
                      <td className="py-2 text-right text-[var(--color-g400)]">{formatTokens(d.output)}</td>
                      <td className="py-2 text-right font-bold text-[var(--color-primary)]">{"$"}{(d.cost ?? 0).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
