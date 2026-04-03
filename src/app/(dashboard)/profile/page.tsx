"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Card, SectionTitle, Button, BottomSheet } from "@/components/ui";

const PW_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,15}$/;

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ title: string; message: string; visible: boolean; ok: boolean }>({
    title: "", message: "", visible: false, ok: false,
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(title: string, message: string, ok = false) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ title, message, visible: true, ok });
    toastTimerRef.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3500);
  }

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setHasPassword(d.hasPassword ?? false);
      });
  }, []);

  async function handleNameSave() {
    if (!name.trim()) {
      showToast("이름 오류", "이름을 입력해주세요.");
      return;
    }
    setNameLoading(true);
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("저장 완료", "이름이 변경되었습니다.", true);
    } else {
      showToast("저장 실패", data.error ?? "오류가 발생했습니다.");
    }
    setNameLoading(false);
  }

  async function handlePasswordSave() {
    // 기존 비밀번호가 있는 경우 현재 비밀번호 필수
    if (hasPassword && !currentPassword) {
      showToast("입력 오류", "현재 비밀번호를 입력해주세요.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      showToast("입력 오류", "새 비밀번호를 입력해주세요.");
      return;
    }
    if (!PW_REGEX.test(newPassword)) {
      showToast("비밀번호 오류", "영문·숫자·특수문자 포함 8~15자리로 입력해주세요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("비밀번호 오류", "새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setPwLoading(true);
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: hasPassword ? currentPassword : undefined, newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("완료", hasPassword ? "비밀번호가 변경되었습니다." : "비밀번호가 설정되었습니다.", true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasPassword(true);
    } else {
      showToast("실패", data.error ?? "오류가 발생했습니다.");
    }
    setPwLoading(false);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    const res = await fetch("/api/user/me", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/login" });
    } else {
      showToast("탈퇴 실패", "오류가 발생했습니다. 다시 시도해주세요.");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  const pwTitle = hasPassword ? "비밀번호 변경" : "비밀번호 설정";
  const pwFields = [
    ...(hasPassword ? [{ label: "현재 비밀번호", value: currentPassword, setter: setCurrentPassword, placeholder: "현재 비밀번호" }] : []),
    { label: "새 비밀번호", value: newPassword, setter: setNewPassword, placeholder: "영문·숫자·특수문자 포함 8~15자리" },
    { label: "새 비밀번호 확인", value: confirmPassword, setter: setConfirmPassword, placeholder: "새 비밀번호 재입력" },
  ];

  return (
    <div className="w-full max-w-lg mx-auto px-5 py-6 pb-28 md:pb-6">
      {/* 토스트 */}
      {toast.visible && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[300] flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl min-w-[260px] max-w-[calc(100vw-40px)] animate-in fade-in slide-in-from-top-2 duration-300 ${
            toast.ok ? "bg-[#05C072]" : "bg-[#F04452]"
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white leading-tight">{toast.title}</p>
            <p className="text-xs text-white/80 mt-0.5 leading-tight">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast((p) => ({ ...p, visible: false }))}
            className="text-white/60 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 프로필 헤더 */}
      <div className="flex flex-col items-center py-6 mb-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold text-white mb-4"
          style={{
            background: "linear-gradient(135deg, #027A47 0%, #05C072 100%)",
            boxShadow: "0 4px 16px rgba(5,192,114,0.35)",
          }}
        >
          {name ? name.charAt(0).toUpperCase() : "?"}
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
          {name || "이름 없음"}
        </h1>
        <p className="text-sm text-[#9AA99A] dark:text-[#5A6A5A] mt-1">{email}</p>
      </div>

      {/* 이름 변경 */}
      <div className="mb-4">
        <SectionTitle title="이름 변경" />
        <Card>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A] mb-1 block">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-[#E0E8E0] dark:border-[#2D3D30] pb-1.5 text-sm text-[#1A221A] dark:text-[#E8EEE8] focus:outline-none focus:border-[#05C072]"
                placeholder="이름을 입력하세요"
              />
            </div>
            <div className="flex justify-center">
              <Button onClick={handleNameSave} disabled={nameLoading} className="w-40">
                {nameLoading ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 비밀번호 변경/설정 */}
      <div>
        <SectionTitle title={pwTitle} />
        {!hasPassword && (
          <p className="text-xs text-[#9AA99A] dark:text-[#5A6A5A] mb-2 px-1">
            소셜 로그인 계정입니다. 비밀번호를 설정하면 이메일로도 로그인할 수 있습니다.
          </p>
        )}
        <Card>
          <div className="space-y-4">
            {pwFields.map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label className="text-xs text-[#6B7B6B] dark:text-[#7A8A7A] mb-1 block">{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full bg-transparent border-b border-[#E0E8E0] dark:border-[#2D3D30] pb-1.5 text-sm text-[#1A221A] dark:text-[#E8EEE8] focus:outline-none focus:border-[#05C072]"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div className="flex justify-center">
              <Button onClick={handlePasswordSave} disabled={pwLoading} className="w-40">
                {pwLoading ? "처리 중..." : pwTitle}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      {/* 회원 탈퇴 */}
      <div className="mt-6">
        <button
          onClick={() => setDeleteConfirm(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#F04452" }}
        >
          회원 탈퇴
        </button>
      </div>

      {/* 탈퇴 확인 모달 */}
      <BottomSheet
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="정말 탈퇴하시겠어요?"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#6B7B6B] dark:text-[#7A8A7A] leading-relaxed">
            계좌, 보유 종목, 매매 기록, 예수금 등 <strong>모든 데이터가 삭제</strong>됩니다.
            이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#F0F4F0] dark:bg-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: "#F04452" }}
            >
              {deleting ? "탈퇴 중..." : "탈퇴하기"}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
