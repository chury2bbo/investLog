import Link from "next/link";
import Image from "next/image";
import iconImg from "@/app/icon.png";

export default function NotFound() {
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

        {/* 404 */}
        <p className="text-6xl font-extrabold text-(--color-primary) mb-2">
          404
        </p>
        <h1 className="text-lg font-bold text-(--color-text) mb-2">
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-sm text-(--color-g500) mb-8">
          요청하신 페이지가 존재하지 않거나 이동되었어요.
        </p>

        {/* 홈으로 */}
        <Link
          href="/"
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
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
