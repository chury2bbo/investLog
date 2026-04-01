"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } else {
      router.push("/");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#F5F7F5" }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl p-8"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        {/* 로고 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#1A221A" }}>
            InvestLog
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7B6B" }}>
            나만의 투자 기록장
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 이메일 */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#6B7B6B" }}
            >
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full pb-2 text-sm bg-transparent outline-none border-b"
              style={{
                borderColor: "#D4DDD4",
                color: "#1A221A",
              }}
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#6B7B6B" }}
            >
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              required
              className="w-full pb-2 text-sm bg-transparent outline-none border-b"
              style={{
                borderColor: "#D4DDD4",
                color: "#1A221A",
              }}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-xs" style={{ color: "#F04452" }}>
              {error}
            </p>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{ backgroundColor: "#05C072", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ backgroundColor: "#E8EEE8" }} />
          <span className="text-xs" style={{ color: "#9AA99A" }}>
            또는
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#E8EEE8" }} />
        </div>

        {/* 소셜 로그인 */}
        <div className="space-y-3">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full py-3 rounded-xl text-sm font-medium border flex items-center justify-center gap-2 transition-colors hover:bg-gray-50"
            style={{ borderColor: "#E8EEE8", color: "#1A221A" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.49-1.63.84-2.7.84-2.08 0-3.84-1.4-4.47-3.29H1.85v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.51 10.6A4.8 4.8 0 0 1 4.26 9c0-.56.1-1.1.25-1.6V5.33H1.85A8 8 0 0 0 .98 9c0 1.29.31 2.51.87 3.67l2.66-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.11c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.13 4.33l2.66 2.07c.63-1.89 2.39-3.29 4.47-3.29z"/>
            </svg>
            Google로 로그인
          </button>

          <button
            onClick={() => signIn("kakao", { callbackUrl: "/" })}
            className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#FEE500", color: "#1A221A" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M9 1.5C4.86 1.5 1.5 4.19 1.5 7.5c0 2.08 1.3 3.91 3.27 4.97l-.83 3.09a.28.28 0 0 0 .42.31L7.9 13.7c.36.04.73.06 1.1.06 4.14 0 7.5-2.69 7.5-6s-3.36-6-7.5-6z" fill="#1A1A1A"/>
            </svg>
            카카오로 로그인
          </button>
        </div>

        {/* 회원가입 링크 */}
        <p className="text-center text-xs mt-6" style={{ color: "#9AA99A" }}>
          아직 계정이 없으신가요?{" "}
          <Link
            href="/register"
            className="font-semibold"
            style={{ color: "#05C072" }}
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
