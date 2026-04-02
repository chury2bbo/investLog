"use client";

import { EmptyState } from "@/components/ui";

export default function AnalysisPage() {
  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4F0] dark:bg-[#2D3D30] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A221A] dark:text-[#E8EEE8]"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
          종목 분석
        </h1>
      </div>
      <EmptyState message="종목 분석 화면은 준비 중입니다." />
    </div>
  );
}
