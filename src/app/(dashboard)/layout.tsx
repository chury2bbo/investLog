"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

// ─── 네비 항목 ───────────────────────────────────────────

const NAV_ITEMS = [
  { id: "/", icon: "📊", label: "대시보드", mobileLabel: "홈" },
  { id: "/accounts", icon: "💳", label: "계좌 관리", mobileLabel: "계좌" },
  { id: "/trades", icon: "📝", label: "매매일지", mobileLabel: "매매" },
  { id: "/analysis", icon: "🔍", label: "종목 분석", mobileLabel: "분석" },
  { id: "/analysis/personality", icon: "🧠", label: "투자 성향", mobileLabel: "성향" },
  { id: "/profile", icon: "⚙️", label: "회원정보", mobileLabel: "설정" },
];

function isActive(pathname: string, navId: string) {
  if (navId === "/") return pathname === "/";
  if (!pathname.startsWith(navId)) return false;
  // 더 구체적인 nav item이 매칭되면 상위 경로는 active 제외
  return !NAV_ITEMS.some(
    (item) => item.id !== navId && item.id.startsWith(navId) && pathname.startsWith(item.id)
  );
}

// ─── PC 아이콘 사이드바 ──────────────────────────────────

function IconSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [hovered, setHovered] = useState<string | null>(null);

  const userName = session?.user?.name ?? "U";
  const initial = userName.charAt(0);

  return (
    <div
      className="hidden md:flex w-16 shrink-0 flex-col items-center py-5 sticky top-0 h-screen border-r bg-white dark:bg-[#1A2320] border-[#F0F4F0] dark:border-[#2D3D30]"
    >
      {/* 로고 */}
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg mb-7 shrink-0"
        style={{
          backgroundColor: "#05C072",
          boxShadow: "0 4px 12px rgba(5,192,114,0.25)",
        }}
      >
        <svg
          width="18"
          height="18"
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

      {/* 네비 아이템 */}
      <div className="flex-1 flex flex-col gap-1 w-full">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.id);
          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                onClick={() => router.push(item.id)}
                className="w-full flex items-center justify-center py-2.5 relative"
                style={{
                  background: active
                    ? "rgba(5,192,114,0.1)"
                    : "transparent",
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r"
                    style={{ backgroundColor: "#05C072" }}
                  />
                )}
                <span
                  className="text-xl"
                  style={{ opacity: active ? 1 : 0.45 }}
                >
                  {item.icon}
                </span>
              </button>

              {/* 툴팁 */}
              {hovered === item.id && (
                <div
                  className="absolute left-[70px] top-1/2 -translate-y-1/2 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg whitespace-nowrap z-[300] bg-[#1A221A] dark:bg-[#1D2720]"
                  style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
                >
                  {item.label}
                  <div
                    className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0"
                    style={{
                      borderTop: "5px solid transparent",
                      borderBottom: "5px solid transparent",
                      borderRight: "5px solid #1A221A",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단: 프로필 */}
      <div className="flex flex-col gap-1 items-center">
        <div
          className="relative"
          onMouseEnter={() => setHovered("logout")}
          onMouseLeave={() => setHovered(null)}
        >
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white cursor-pointer"
            style={{
              backgroundColor: "#05C072",
              boxShadow: "0 2px 8px rgba(5,192,114,0.25)",
            }}
          >
            {initial}
          </button>
          {hovered === "logout" && (
            <div
              className="absolute left-[46px] top-1/2 -translate-y-1/2 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg whitespace-nowrap z-[300] bg-[#1A221A] dark:bg-[#1D2720]"
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
            >
              로그아웃
              <div
                className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderRight: "5px solid #1A221A",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 모바일 바텀 네비 ────────────────────────────────────

function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around pt-2 pb-5 z-50 border-t bg-white dark:bg-[#1A2320] border-[#F0F4F0] dark:border-[#2D3D30]"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.id);
        return (
          <button
            key={item.id}
            onClick={() => router.push(item.id)}
            className="flex flex-col items-center gap-0.5 bg-transparent border-none px-3 py-1"
            style={{ opacity: active ? 1 : 0.35 }}
          >
            <span className="text-[22px]">{item.icon}</span>
            <span
              className="text-[10px]"
              style={{
                fontWeight: active ? 700 : 400,
                color: active ? "#05C072" : undefined,
              }}
            >
              {item.mobileLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── 레이아웃 ────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [checked, setChecked] = useState(false);

  // 온보딩 미완료 시 온보딩으로 리다이렉트
  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/user/me")
      .then((res) => res.ok ? res.json() : { onboardingDone: true })
      .then((data) => {
        if (!data.onboardingDone) {
          router.replace("/onboarding");
        } else {
          setChecked(true);
        }
      })
      .catch(() => setChecked(true));
  }, [status, router]);

  // 체크 완료 전에는 빈 화면 (깜빡임 방지)
  if (status === "loading" || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F7F5] dark:bg-[#0D1210]">
        <div className="w-8 h-8 border-3 border-[#05C072] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F7F5] dark:bg-[#0D1210]">
      <IconSidebar />
      <main className="flex-1 min-w-0">{children}</main>
      <BottomNav />
    </div>
  );
}
