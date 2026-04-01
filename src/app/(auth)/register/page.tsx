"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validatePassword(pw: string): string | null {
    if (pw.length < 8 || pw.length > 15) return "비밀번호는 8자 이상 15자 이하로 입력해주세요.";
    if (!/[a-zA-Z]/.test(pw)) return "영문을 포함해주세요.";
    if (!/[0-9]/.test(pw)) return "숫자를 포함해주세요.";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) return "특수문자를 포함해주세요.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "회원가입에 실패했습니다.");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/onboarding");
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
            투자 기록을 시작해보세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 이름 */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#6B7B6B" }}
            >
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
              className="w-full pb-2 text-sm bg-transparent outline-none border-b"
              style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
            />
          </div>

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
              style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
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
              placeholder="영문,숫자,특수문자 포함 8~15자"
              required
              minLength={8}
              maxLength={15}
              className="w-full pb-2 text-sm bg-transparent outline-none border-b"
              style={{ borderColor: "#D4DDD4", color: "#1A221A" }}
            />
            <p className="text-xs mt-1" style={{ color: "#9AA99A" }}>
              영문, 숫자, 특수문자 포함 8~15자
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-xs" style={{ color: "#F04452" }}>
              {error}
            </p>
          )}

          {/* 회원가입 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{ backgroundColor: "#05C072", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        {/* 로그인 링크 */}
        <p className="text-center text-xs mt-6" style={{ color: "#9AA99A" }}>
          이미 계정이 있으신가요?{" "}
          <Link
            href="/login"
            className="font-semibold"
            style={{ color: "#05C072" }}
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
