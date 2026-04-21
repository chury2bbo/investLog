"use client";

import { useState, useEffect } from "react";
import { BottomSheet } from "@/components/ui";

interface Benchmark {
  name: string;
  ticker: string;
  returnRate: number | null;
}

interface BenchmarkSheetProps {
  open: boolean;
  onClose: () => void;
  myReturnRate: number;
}

export function BenchmarkSheet({ open, onClose, myReturnRate }: BenchmarkSheetProps) {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/benchmark")
      .then((r) => r.json())
      .then((d) => setBenchmarks(d.benchmarks ?? []))
      .catch(() => setBenchmarks([]))
      .finally(() => setLoading(false));
  }, [open]);

  const rows = [
    { name: "내 수익률", rate: myReturnRate, isMe: true },
    ...benchmarks.map((b) => ({ name: b.name, rate: b.returnRate ?? 0, isMe: false })),
  ];
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.rate)), 0.01);

  return (
    <BottomSheet open={open} onClose={onClose} title={`${year}년 수익률 비교`}>
      {/* 기간 라벨 */}
      <p className="text-[11px] text-[var(--color-g400)] dark:text-[var(--color-muted)] mb-4">
        {year}.01.01 ~ 현재 기준
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <svg className="animate-spin w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row, i) => {
            const positive = row.rate >= 0;
            return (
              <div key={row.name}>
                {/* 내 수익률 아래 구분선 */}
                {i === 1 && (
                  <div className="border-t border-dashed border-[var(--color-g200)] dark:border-[var(--color-border)] mb-2.5 mt-0.5" />
                )}
                <div className="flex items-center">
                  {/* 이름 */}
                  <div className={`w-[30%] text-xs truncate ${row.isMe ? "font-bold text-[var(--color-text)]" : "text-[var(--color-g500)] dark:text-[var(--color-muted)]"}`}>
                    {row.name}
                  </div>

                  {/* 음수 바 (오른쪽→왼쪽) */}
                  <div className="w-[35%] flex justify-end pr-1">
                    {!positive && (
                      <div
                        className="h-5 rounded-l-md transition-all duration-500"
                        style={{
                          width: `${Math.round((Math.abs(row.rate) / maxAbs) * 100)}%`,
                          minWidth: "2px",
                          backgroundColor: row.isMe ? "var(--color-negative)" : "#FCDDE0",
                        }}
                      />
                    )}
                  </div>

                  {/* 중심선 */}
                  <div className="w-px h-6 bg-[var(--color-g300)] dark:bg-[var(--color-border)] shrink-0" />

                  {/* 양수 바 (왼쪽→오른쪽) */}
                  <div className="w-[35%] flex pl-1">
                    {positive && (
                      <div
                        className="h-5 rounded-r-md transition-all duration-500"
                        style={{
                          width: `${Math.round((row.rate / maxAbs) * 100)}%`,
                          minWidth: "2px",
                          backgroundColor: row.isMe ? "var(--color-primary)" : "rgba(5,192,114,0.25)",
                        }}
                      />
                    )}
                  </div>

                  {/* 수치 */}
                  <div className={`ml-2 text-xs font-semibold w-12 text-right shrink-0 ${positive ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}>
                    {positive ? "+" : ""}{row.rate.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}

          <p className="text-[10px] text-[var(--color-g400)] dark:text-[var(--color-muted)] pt-2 border-t border-[var(--color-g100)] dark:border-[var(--color-border)]">
            * 내 수익률은 현재 보유 종목 전체 평가손익 기준입니다.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
