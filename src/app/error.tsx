"use client";

import Image from "next/image";
import iconImg from "@/app/icon.png";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-(--color-bg)">
      <div className="w-full max-w-sm text-center">
        {/* 로고 */}
        <div className="mx-auto mb-6 flex justify-center">
          <Image
            src={iconImg}
            alt="버텨일지"
            width={56}
            height={56}
            className="rounded-xl opacity-60"
          />
        </div>

        {/* 에러 메시지 */}
        <p className="text-5xl font-extrabold text-(--color-negative) mb-2">
          오류
        </p>
        <h1 className="text-lg font-bold text-(--color-text) mb-2">
          문제가 발생했어요
        </h1>
        <p className="text-sm text-(--color-g500) mb-8">
          일시적인 오류가 발생했어요. 다시 시도해 주세요.
        </p>

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            다시 시도
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border transition-colors hover:bg-(--color-g100) dark:hover:bg-(--color-card) border-(--color-g200) dark:border-(--color-border) text-(--color-text)"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
