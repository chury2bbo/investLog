"use client";

import { useState, useRef, useEffect } from "react";
import { Card, ConfirmDialog, BottomSheet } from "@/components/ui";

interface EditableHolding {
  ticker: string;
  name: string;
  avgPrice: string;
  quantity: string;
  country: string;
  checked: boolean;
}

interface CashBalance {
  currency: string;
  amount: number;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (holdings: EditableHolding[], cashBalances: CashBalance[]) => void;
}

type Step = "upload" | "loading" | "confirm";

export function ImportModal({ open, onClose, onConfirm }: ImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<EditableHolding[]>([]);
  const [cashBalances, setCashBalances] = useState<CashBalance[]>([]);
  const [toast, setToast] = useState<{ title: string; message: string; visible: boolean }>({ title: "", message: "", visible: false });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFileNameRef = useRef<string | null>(null);

  // 모달 열릴 때 상태 초기화 (lastFileNameRef는 유지 — 재오픈 시에도 동일 파일 감지)
  useEffect(() => {
    if (open) {
      setStep("upload");
      setPreviewUrl(null);
      setHoldings([]);
      setCashBalances([]);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (file.name === lastFileNameRef.current) {
      setPendingFile(file);
      return;
    }
    lastFileNameRef.current = file.name;
    handleFile(file);
  }

  function showToast(title: string, message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, message, visible: true });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3500);
  }

  function handleClose() {
    setStep("upload");
    setPreviewUrl(null);
    setHoldings([]);
    setCashBalances([]);
    onClose();
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPreviewUrl(URL.createObjectURL(file));
    setStep("loading");

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/import/analyze", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) {
      showToast("분석 실패", data.error ?? "이미지 분석에 실패했습니다.");
      setStep("upload");
      setPreviewUrl(null);
      return;
    }

    if (data.valid === false) {
      showToast("인식 불가", "증권사 잔고 화면이 아닌 것 같아요. 보유 종목 화면을 캡처해주세요.");
      setStep("upload");
      setPreviewUrl(null);
      return;
    }

    const extracted = (data.holdings ?? []).map((h: { ticker?: string; name?: string; avgPrice?: number; quantity?: number; country?: string }) => ({
      ticker: h.ticker ?? "",
      name: h.name ?? "",
      avgPrice: String(h.avgPrice ?? ""),
      quantity: String(h.quantity ?? ""),
      country: h.country ?? "KR",
      checked: !!(h.ticker),
    }));

    if (extracted.length === 0) {
      showToast("종목 없음", "종목 정보를 찾을 수 없어요. 종목명·수량·평단가가 모두 보이는 화면을 캡처해주세요.");
      setStep("upload");
      setPreviewUrl(null);
      return;
    }

    setHoldings(extracted);
    setCashBalances(data.cashBalances ?? []);
    setStep("confirm");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function updateHolding(i: number, field: keyof EditableHolding, value: string | boolean) {
    setHoldings((prev) => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h));
  }

  return (
    <>
      <ConfirmDialog
        open={!!pendingFile}
        title="동일한 이미지"
        message="이미 분석한 이미지입니다. 다시 분석할까요?"
        confirmLabel="다시 분석"
        cancelLabel="취소"
        onConfirm={() => {
          if (pendingFile) {
            lastFileNameRef.current = pendingFile.name;
            handleFile(pendingFile);
          }
          setPendingFile(null);
        }}
        onCancel={() => setPendingFile(null)}
      />
      {/* 토스트 */}
      <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl bg-[var(--color-negative)] min-w-[260px] max-w-[calc(100vw-40px)] transition-all duration-300 ${toast.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"}`}>
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-tight">{toast.title}</p>
          <p className="text-xs text-white/80 mt-0.5 leading-tight">{toast.message}</p>
        </div>
        <button onClick={() => setToast((p) => ({ ...p, visible: false }))} className="text-white/60 hover:text-white transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <BottomSheet open={open} onClose={handleClose} title="계좌 캡처 불러오기">
        <p className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] -mt-2 mb-4">증권사 앱 잔고 화면을 캡처해서 업로드하세요</p>
        <div className="space-y-4">

          {/* 업로드 */}
          {step === "upload" && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--color-g200)] dark:border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--color-positive)] hover:bg-[var(--color-primary-soft)] dark:hover:bg-[#0D2A1D] transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-soft)] dark:bg-[#0D2A1D] flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-positive)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--color-text)]">이미지를 드래그하거나 클릭해서 업로드</p>
                  <p className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] mt-1">PNG, JPG, WEBP · 최대 10MB</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-[var(--color-positive)] text-white text-xs font-semibold">파일 선택</div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={handleFileChange} />
              <Card>
                <p className="text-xs font-bold text-[var(--color-text)] mb-2 flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> 이렇게 캡처해주세요</p>
                <div className="space-y-1.5">
                  {["증권사 앱의 보유 종목 / 잔고 화면을 캡처", "종목명, 수량, 평단가가 모두 보이도록", "여러 화면은 한 장씩 업로드"].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[var(--color-primary-soft)] dark:bg-[#0D2A1D] text-[var(--color-positive)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-[var(--color-g500)] dark:text-[var(--color-muted)]">{tip}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* 로딩 */}
          {step === "loading" && (
            <>
              {previewUrl && (
                <div className="rounded-2xl overflow-hidden border border-[var(--color-g200)] dark:border-[var(--color-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="업로드 이미지" className="w-full object-contain max-h-48" />
                </div>
              )}
              <Card>
                <div className="flex flex-col items-center py-6 gap-4">
                  <div className="w-10 h-10 rounded-full border-4 border-[var(--color-positive)] border-t-transparent animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-[var(--color-text)]">AI가 이미지를 분석 중이에요</p>
                    <p className="text-xs text-[var(--color-g400)] dark:text-[var(--color-muted)] mt-1">잠시만 기다려주세요 (보통 5~10초)</p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* 확인 + 수정 */}
          {step === "confirm" && (
            <>
              {previewUrl && (
                <div className="rounded-2xl overflow-hidden border border-[var(--color-g200)] dark:border-[var(--color-border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="업로드 이미지" className="w-full object-contain max-h-32" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[var(--color-positive)] flex items-center justify-center shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <p className="text-sm font-bold text-[var(--color-text)]">분석 완료 — 내용을 확인하고 수정해주세요</p>
              </div>

              {cashBalances.length > 0 && (
                <Card>
                  <p className="text-xs font-bold text-[var(--color-g500)] dark:text-[var(--color-muted)] mb-2">예수금</p>
                  <div className="flex gap-2">
                    {cashBalances.map((c) => (
                      <div key={c.currency} className="flex-1 bg-[var(--color-bg)] dark:bg-[var(--color-border)] rounded-xl px-3 py-2">
                        <p className="text-[10px] text-[#9AA99A]">{c.currency}</p>
                        <p className="text-sm font-bold text-[var(--color-text)]">
                          {c.currency === "KRW" ? `₩${c.amount.toLocaleString()}` : `$${c.amount}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-[var(--color-g500)] dark:text-[var(--color-muted)]">보유 종목</p>
                  <span className="text-xs text-[#9AA99A]">{holdings.length}종목</span>
                </div>
                <div className="space-y-3">
                  {holdings.map((h, i) => (
                    <div key={i} className={`rounded-xl border p-3 transition-colors ${h.checked ? "border-[var(--color-positive)] bg-[var(--color-primary-soft)] dark:bg-[#0D2A1D]" : "border-[var(--color-g200)] dark:border-[var(--color-border)] opacity-50"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={h.checked}
                          onChange={(e) => updateHolding(i, "checked", e.target.checked)}
                          className="accent-[var(--color-positive)] w-4 h-4 shrink-0 cursor-pointer" />
                        <span className="text-sm font-semibold text-[var(--color-text)] flex-1 truncate">{h.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${h.country === "KR" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"}`}>
                          {h.country}
                        </span>
                      </div>
                      {!h.ticker && (
                        <p className="text-[10px] text-[var(--color-negative)] mb-2">종목코드를 인식하지 못해 제외됩니다</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#9AA99A] block mb-0.5">평단가</label>
                          <input type="text" value={h.avgPrice ? Number(h.avgPrice).toLocaleString() : ""}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, "");
                              if (raw === "" || /^\d*$/.test(raw)) updateHolding(i, "avgPrice", raw);
                            }}
                            disabled={!h.checked}
                            className="w-full bg-white dark:bg-[var(--color-card)] border border-[var(--color-g200)] dark:border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-positive)] disabled:opacity-40"
                            placeholder="평단가" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#9AA99A] block mb-0.5">수량</label>
                          <input type="text" value={h.quantity ? Number(h.quantity).toLocaleString() : ""}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, "");
                              if (raw === "" || /^\d*$/.test(raw)) updateHolding(i, "quantity", raw);
                            }}
                            disabled={!h.checked}
                            className="w-full bg-white dark:bg-[var(--color-card)] border border-[var(--color-g200)] dark:border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-positive)] disabled:opacity-40"
                            placeholder="수량" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="flex gap-2">
                <button onClick={() => { setStep("upload"); setPreviewUrl(null); setHoldings([]); }}
                  className="flex-1 py-3 rounded-xl border border-[var(--color-g200)] dark:border-[var(--color-border)] text-sm font-semibold text-[#6B7B6B] cursor-pointer hover:bg-[#F0F4F0] dark:hover:bg-[#2D3D30] transition-colors">
                  다시 업로드
                </button>
                <button
                  onClick={() => { onConfirm(holdings.filter((h) => h.checked), cashBalances); handleClose(); }}
                  disabled={!holdings.some((h) => h.checked)}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-positive)] text-white text-sm font-bold cursor-pointer hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {holdings.filter((h) => h.checked).length}종목 가져오기
                </button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
