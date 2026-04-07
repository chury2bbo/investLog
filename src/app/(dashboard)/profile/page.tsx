"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { Card, SectionTitle, Button, Input, Toast, ConfirmDialog, ThemeToggle } from "@/components/ui";

const PW_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,15}$/;

export default function ProfilePage() {
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
    <div className="w-full max-w-lg mx-auto px-5 py-6 pb-28 md:pb-6 animate-[fadeIn_0.4s_ease-out]">
      {/* 토스트 */}
      <Toast
        title={toast.title}
        message={toast.message}
        visible={toast.visible}
        variant={toast.ok ? "success" : "error"}
        onClose={() => setToast((p) => ({ ...p, visible: false }))}
      />

      {/* 모바일 다크모드 토글 */}
      <div className="flex justify-end md:hidden mb-2">
        <ThemeToggle />
      </div>

      {/* 프로필 헤더 */}
      <div className="flex flex-col items-center py-6 mb-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold text-white mb-4"
          style={{
            background: "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)",
            boxShadow: "0 4px 16px color-mix(in srgb, var(--color-primary) 35%, transparent)",
          }}
        >
          {name ? name.charAt(0).toUpperCase() : "?"}
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-(--color-text)">
          {name || "이름 없음"}
        </h1>
        <p className="text-sm text-(--color-g400) mt-1">{email}</p>
      </div>

      {/* 이름 변경 */}
      <div className="mb-4">
        <SectionTitle title="이름 변경" />
        <Card>
          <div className="space-y-4">
            <Input
              label="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
            <button
              onClick={handleNameSave}
              disabled={nameLoading}
              className="w-full py-3 text-sm font-semibold rounded-xl text-white cursor-pointer transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {nameLoading ? "저장 중..." : "저장"}
            </button>
          </div>
        </Card>
      </div>

      {/* 비밀번호 변경/설정 */}
      <div>
        <SectionTitle title={pwTitle} />
        {!hasPassword && (
          <p className="text-xs text-(--color-g400) mb-2 px-1">
            소셜 로그인 계정입니다. 비밀번호를 설정하면 이메일로도 로그인할 수 있습니다.
          </p>
        )}
        <Card>
          <div className="space-y-4">
            {pwFields.map(({ label, value, setter, placeholder }) => (
              <Input
                key={label}
                label={label}
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
              />
            ))}
            <button
              onClick={handlePasswordSave}
              disabled={pwLoading}
              className="w-full py-3 text-sm font-semibold rounded-xl text-white cursor-pointer transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {pwLoading ? "처리 중..." : pwTitle}
            </button>
          </div>
        </Card>
      </div>
      {/* 로그아웃 */}
      <div className="mt-6">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full py-3.5 rounded-2xl text-sm font-bold border border-[var(--color-g200)] dark:border-[var(--color-border)] text-[var(--color-text)] cursor-pointer transition-colors hover:bg-[var(--color-g100)] dark:hover:bg-[var(--color-border)]"
        >
          로그아웃
        </button>
      </div>

      {/* 회원 탈퇴 */}
      <div className="mt-3">
        <button
          onClick={() => setDeleteConfirm(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-negative)" }}
        >
          회원 탈퇴
        </button>
      </div>

      {/* 탈퇴 확인 모달 */}
      <ConfirmDialog
        open={deleteConfirm}
        title="정말 탈퇴하시겠어요?"
        message={"계좌, 보유 종목, 매매 기록, 예수금 등\n모든 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."}
        confirmLabel="탈퇴하기"
        destructive
        confirmLoading={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}
