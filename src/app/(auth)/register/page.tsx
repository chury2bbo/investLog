"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner, Input, Logo } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 해요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setError("이미 사용 중인 이메일이에요.");
        } else {
          setError(data.error || "회원가입에 실패했습니다.");
        }
        setLoading(false);
        return;
      }

      // 성공 → Step 2 완료 화면
      setStep(2);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setLoading(true);
    // 자동 로그인 후 온보딩으로 이동
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-(--color-bg)">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-2.5 flex justify-center">
            <Logo size={48} />
          </div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-(--color-text)">
            버텨일지
          </h1>
        </div>

        {step === 1 ? (
          <>
            {/* Step 1 — 입력 카드 */}
            <div
              className="rounded-2xl p-7 bg-(--color-surface)"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
            >
              <h2 className="text-lg font-bold text-(--color-text) mb-1">
                회원가입
              </h2>
              <p className="text-sm text-(--color-g500) mb-6">
                투자 기록을 시작해보세요
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 이름 */}
                <Input
                  label="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                />

                {/* 이메일 */}
                <Input
                  label="이메일"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />

                {/* 비밀번호 */}
                <Input
                  label="비밀번호"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8자 이상 입력"
                  required
                  minLength={8}
                />

                {/* 비밀번호 확인 */}
                <Input
                  label="비밀번호 확인"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 다시 입력"
                  required
                />

                {/* 에러 메시지 — 빨간 배경 배너 */}
                {error && (
                  <div className="rounded-xl px-4 py-2.5 text-sm bg-(--color-negative-soft) dark:bg-[#3D1519] text-(--color-negative)">
                    {error}
                  </div>
                )}

                {/* 가입하기 버튼 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading && <LoadingSpinner size={16} />}
                  {loading ? "처리 중..." : "가입하기"}
                </button>
              </form>
            </div>

            {/* 로그인 링크 */}
            <p className="text-center text-sm mt-5 text-(--color-g400) dark:text-(--color-muted)">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="font-bold text-(--color-primary) hover:underline"
              >
                로그인
              </Link>
            </p>
          </>
        ) : (
          /* Step 2 — 완료 카드 */
          <div
            className="rounded-2xl px-6 py-10 text-center bg-(--color-surface)"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
          >
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-extrabold text-(--color-text) mb-2">
              가입 완료!
            </h2>
            <p className="text-sm leading-7 text-(--color-g500) mb-7">
              버텨일지에 오신 걸 환영해요.
              <br />
              나만의 투자 기록을 시작해볼까요?
            </p>
            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
              style={{
                backgroundColor: "var(--color-primary)",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading && <LoadingSpinner size={16} />}
              {loading ? "로그인 중..." : "시작하기 →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
