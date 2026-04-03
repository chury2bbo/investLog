"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui";

// ─── 샘플 더미 데이터 (실제 Claude 추출 결과 형태) ──────────
const SAMPLE_RESULT = {
  brokerage: "키움증권",
  holdings: [
    { ticker: "005930", name: "삼성전자", quantity: 50, avgPrice: 72000, country: "KR" },
    { ticker: "000660", name: "SK하이닉스", quantity: 20, avgPrice: 185000, country: "KR" },
    { ticker: "NVDA", name: "NVIDIA Corporation", quantity: 5, avgPrice: 820.5, country: "US" },
    { ticker: "AAPL", name: "Apple Inc.", quantity: 10, avgPrice: 178.3, country: "US" },
  ],
  cashBalances: [
    { currency: "KRW", amount: 1250000 },
    { currency: "USD", amount: 320.5 },
  ],
};

type Step = "upload" | "loading" | "confirm" | "done";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<typeof SAMPLE_RESULT | null>(null);
  const [checked, setChecked] = useState<boolean[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep("loading");

    // 실제 구현 시 Claude API 호출 — 여기선 2초 후 샘플 데이터로 대체
    setTimeout(() => {
      setResult(SAMPLE_RESULT);
      setChecked(SAMPLE_RESULT.holdings.map(() => true));
      setStep("confirm");
    }, 2000);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleConfirm() {
    setStep("done");
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-5 py-6 pb-28 md:pb-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => window.history.back()}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F0F4F0] dark:bg-[#2D3D30] hover:bg-[#E8EEE8] dark:hover:bg-[#354035] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A221A] dark:text-[#E8EEE8]">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
            계좌 캡쳐 불러오기
          </h1>
          <p className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-0.5">
            증권사 앱 잔고 화면을 캡쳐해서 업로드하세요
          </p>
        </div>
      </div>

      {/* ── STEP 1: 업로드 ── */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* 드래그 앤 드롭 영역 */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#D4DDD4] dark:border-[#2D3D30] rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#05C072] hover:bg-[#F0FAF5] dark:hover:bg-[#0D2A1D] transition-all"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#E8FAF2] dark:bg-[#0D2A1D] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#05C072" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1A221A] dark:text-[#E8EEE8]">
                이미지를 드래그하거나 클릭해서 업로드
              </p>
              <p className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-1">
                PNG, JPG, WEBP · 최대 10MB
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-[#05C072] text-white text-xs font-semibold">
              파일 선택
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />

          {/* 안내 카드 */}
          <Card>
            <p className="text-xs font-bold text-[#1A221A] dark:text-[#E8EEE8] mb-3">
              📌 이렇게 캡쳐해주세요
            </p>
            <div className="space-y-2">
              {[
                "증권사 앱의 보유 종목 / 잔고 화면을 캡쳐",
                "종목명, 수량, 평단가가 모두 보이도록",
                "여러 화면은 한 장씩 업로드",
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#E8FAF2] dark:bg-[#0D2A1D] text-[#05C072] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A]">{tip}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 2: 분석 중 ── */}
      {step === "loading" && (
        <div className="space-y-4">
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-[#E8EEE8] dark:border-[#2D3D30]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="업로드 이미지" className="w-full object-contain max-h-64" />
            </div>
          )}
          <Card>
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-[#05C072] border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">AI가 이미지를 분석 중이에요</p>
                <p className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-1">잠시만 기다려주세요 (보통 5~10초)</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── STEP 3: 확인 ── */}
      {step === "confirm" && result && (
        <div className="space-y-4">
          {/* 이미지 썸네일 */}
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-[#E8EEE8] dark:border-[#2D3D30]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="업로드 이미지" className="w-full object-contain max-h-40" />
            </div>
          )}

          {/* 추출 결과 헤더 */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#05C072] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">
              분석 완료 — 등록할 내용을 확인해주세요
            </p>
          </div>

          {/* 증권사 + 예수금 */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#6B7B6B] dark:text-[#7A8A7A]">증권사</span>
              <span className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">{result.brokerage}</span>
            </div>
            <div className="h-px bg-[#F0F4F0] dark:bg-[#2D3D30] mb-3" />
            <p className="text-xs font-bold text-[#6B7B6B] dark:text-[#7A8A7A] mb-2">예수금</p>
            <div className="flex gap-3">
              {result.cashBalances.map((c) => (
                <div key={c.currency} className="flex-1 bg-[#F5F7F5] dark:bg-[#2D3D30] rounded-xl px-3 py-2">
                  <p className="text-[10px] text-[#9AA99A] dark:text-[#5A6A5A]">{c.currency}</p>
                  <p className="text-sm font-bold text-[#1A221A] dark:text-[#E8EEE8]">
                    {c.currency === "KRW" ? `₩${c.amount.toLocaleString()}` : `$${c.amount.toLocaleString()}`}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* 보유 종목 */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-[#6B7B6B] dark:text-[#7A8A7A]">보유 종목</p>
              <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A]">{result.holdings.length}종목</span>
            </div>
            <div className="space-y-2">
              {result.holdings.map((h, i) => (
                <label
                  key={h.ticker}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                    checked[i]
                      ? "border-[#05C072] bg-[#F0FAF5] dark:bg-[#0D2A1D]"
                      : "border-[#E8EEE8] dark:border-[#2D3D30] bg-white dark:bg-[#1D2720]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() => setChecked((prev) => prev.map((v, j) => j === i ? !v : v))}
                    className="accent-[#05C072] w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#1A221A] dark:text-[#E8EEE8] truncate">{h.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${h.country === "KR" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                        {h.country}
                      </span>
                    </div>
                    <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A]">{h.ticker}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-[#1A221A] dark:text-[#E8EEE8]">
                      {h.country === "KR" ? `₩${h.avgPrice.toLocaleString()}` : `$${h.avgPrice.toLocaleString()}`}
                    </p>
                    <p className="text-[10px] text-[#9AA99A] dark:text-[#5A6A5A]">{h.quantity}주</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={() => { setStep("upload"); setPreviewUrl(null); setResult(null); }}
              className="flex-1 py-3 rounded-xl border border-[#E8EEE8] dark:border-[#2D3D30] text-sm font-semibold text-[#6B7B6B] dark:text-[#7A8A7A] hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] transition-colors"
            >
              다시 업로드
            </button>
            <button
              onClick={handleConfirm}
              disabled={!checked.some(Boolean)}
              className="flex-2 flex-1 py-3 rounded-xl bg-[#05C072] text-white text-sm font-bold hover:bg-[#04a862] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checked.filter(Boolean).length}종목 등록하기
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: 완료 ── */}
      {step === "done" && (
        <Card>
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#E8FAF2] dark:bg-[#0D2A1D] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#05C072" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-[#1A221A] dark:text-[#E8EEE8]">등록 완료!</p>
              <p className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mt-1">
                {checked.filter(Boolean).length}개 종목이 계좌에 추가됐어요
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2.5 rounded-xl bg-[#1A221A] dark:bg-[#E8EEE8] text-white dark:text-[#1A221A] text-sm font-bold"
            >
              확인
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
