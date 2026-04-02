"use client";

import { EmptyState } from "@/components/ui";

export default function AnalysisPage() {
  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8] mb-6">
        종목 분석
      </h1>
      <EmptyState message="종목 분석 화면은 준비 중입니다." />
    </div>
  );
}
