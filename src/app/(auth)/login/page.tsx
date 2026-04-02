"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 로그인된 사용자 리다이렉트
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.replace("/");
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("이메일 또는 비밀번호가 틀렸어요.");
    } else {
      // onboardingDone 체크를 위해 세션 재확인
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (sessionData?.user?.onboardingDone === false) {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    }
  }

  // 세션 로딩 중
  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#F5F7F5] dark:bg-[#0D1210]"
      >
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F5F7F5] dark:bg-[#0D1210]">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
            style={{
              backgroundColor: "#05C072",
              boxShadow: "0 8px 24px rgba(5,192,114,0.25)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A221A] dark:text-[#E8EEE8]">
            버텨일지
          </h1>
          <p className="text-sm mt-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
            한국 개미의 정신력 관리 및 기록
          </p>
        </div>

        {/* 로그인 카드 */}
        <div
          className="rounded-2xl p-7 bg-white dark:bg-[#1D2720]"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
        >
          <h2 className="text-lg font-bold mb-6 text-[#1A221A] dark:text-[#E8EEE8]">
            로그인
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 이메일 */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A]"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-xs font-medium mb-1 text-[#6B7B6B] dark:text-[#7A8A7A]">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                className="w-full pb-2 text-sm bg-transparent outline-none border-b border-[#D4DDD4] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] placeholder:text-[#B4C4B4] dark:placeholder:text-[#4A5A4A]"
              />
            </div>

            {/* 에러 메시지 — 빨간 배경 배너 */}
            {error && (
              <div className="rounded-xl px-4 py-2.5 text-sm bg-[#FEE8EA] dark:bg-[#3D1519] text-[#F04452]">
                {error}
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
              style={{
                backgroundColor: "#05C072",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading && <LoadingSpinner size={16} />}
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 구분선 */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E8EEE8] dark:bg-[#2D3D30]" />
            <span className="text-xs text-[#9AA99A] dark:text-[#5A6A5A]">
              또는
            </span>
            <div className="flex-1 h-px bg-[#E8EEE8] dark:bg-[#2D3D30]" />
          </div>

          {/* 소셜 로그인 */}
          <div className="space-y-2.5">
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 transition-colors hover:bg-gray-50 dark:hover:bg-[#253028] border-[#E8EEE8] dark:border-[#2D3D30] text-[#1A221A] dark:text-[#E8EEE8] bg-white dark:bg-[#1D2720]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path
                  fill="#4285F4"
                  d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
                />
                <path
                  fill="#34A853"
                  d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.49-1.63.84-2.7.84-2.08 0-3.84-1.4-4.47-3.29H1.85v2.07A8 8 0 0 0 8.98 17z"
                />
                <path
                  fill="#FBBC05"
                  d="M4.51 10.6A4.8 4.8 0 0 1 4.26 9c0-.56.1-1.1.25-1.6V5.33H1.85A8 8 0 0 0 .98 9c0 1.29.31 2.51.87 3.67l2.66-2.07z"
                />
                <path
                  fill="#EA4335"
                  d="M8.98 4.11c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.13 4.33l2.66 2.07c.63-1.89 2.39-3.29 4.47-3.29z"
                />
              </svg>
              Google로 로그인
            </button>

            <button
              onClick={() => signIn("kakao", { callbackUrl: "/" })}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#FEE500", color: "#191919" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.08 1.3 3.91 3.27 4.97l-.83 3.09a.28.28 0 0 0 .42.31L7.9 13.7c.36.04.73.06 1.1.06 4.14 0 7.5-2.69 7.5-6s-3.36-6-7.5-6z"
                  fill="#1A1A1A"
                />
              </svg>
              카카오로 로그인
            </button>
          </div>
        </div>

        {/* 회원가입 링크 */}
        <p className="text-center text-sm mt-5 text-[#9AA99A] dark:text-[#5A6A5A]">
          아직 계정이 없으신가요?{" "}
          <Link
            href="/register"
            className="font-bold text-[#05C072] hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
