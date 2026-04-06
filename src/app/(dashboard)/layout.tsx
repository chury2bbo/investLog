"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle, Logo } from "@/components/ui";

// ─── 네비 아이콘 (lucide 스타일) ────────────────────────────

function NavIcon({ name, size = 19, active = false }: { name: string; size?: number; active?: boolean }) {
  const sw = active ? 2 : 1.75;
  const color = active ? "var(--color-primary)" : "var(--color-g400)";
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home":
      return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>;
    case "wallet":
      return <svg {...props}><path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" /><path d="M2 10h20" /></svg>;
    case "notebook":
      return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
    case "chart":
      return <svg {...props}><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>;
    case "brain":
      return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>;
    case "settings":
      return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
    default:
      return null;
  }
}

const NAV_ITEMS = [
  { id: "/", icon: "home", label: "대시보드", mobileLabel: "홈" },
  { id: "/accounts", icon: "wallet", label: "계좌 관리", mobileLabel: "계좌" },
  { id: "/trades", icon: "notebook", label: "매매일지", mobileLabel: "매매" },
  { id: "/analysis", icon: "chart", label: "종목 분석", mobileLabel: "분석" },
  { id: "/analysis/personality", icon: "brain", label: "투자 성향", mobileLabel: "성향" },
  { id: "/profile", icon: "settings", label: "회원정보", mobileLabel: "설정" },
];

function isActive(pathname: string, navId: string) {
  if (navId === "/") return pathname === "/";
  if (!pathname.startsWith(navId)) return false;
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
    <div className="hidden md:flex w-16 shrink-0 flex-col items-center py-[18px] sticky top-0 h-screen border-r bg-[var(--color-surface)] dark:bg-[var(--color-surface)] border-[var(--color-g200)] dark:border-[var(--color-border)]">
      {/* 로고 */}
      <div className="mb-7"><Logo size={36} /></div>

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
                className="w-full flex items-center justify-center py-3 relative cursor-pointer"
                style={{
                  background: active
                    ? "var(--color-primary-soft)"
                    : "transparent",
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-[20%] bottom-[20%] w-[3px]"
                    style={{ backgroundColor: "var(--color-primary)", borderRadius: "0 3px 3px 0" }}
                  />
                )}
                <NavIcon name={item.icon} size={19} active={active} />
              </button>

              {/* 툴팁 */}
              {hovered === item.id && (
                <div
                  className="absolute left-[70px] top-1/2 -translate-y-1/2 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg whitespace-nowrap z-[300] bg-[var(--color-text)]"
                  style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
                >
                  {item.label}
                  <div
                    className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0"
                    style={{
                      borderTop: "5px solid transparent",
                      borderBottom: "5px solid transparent",
                      borderRight: "5px solid var(--color-text)",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단: 다크모드 + 프로필 */}
      <div className="flex flex-col gap-2 items-center">
        <ThemeToggle />
        <div
          className="relative"
          onMouseEnter={() => setHovered("logout")}
          onMouseLeave={() => setHovered(null)}
        >
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-extrabold text-white cursor-pointer"
            style={{
              background: "linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))",
            }}
          >
            {initial}
          </button>
          {hovered === "logout" && (
            <div
              className="absolute left-[46px] top-1/2 -translate-y-1/2 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg whitespace-nowrap z-[300] bg-[var(--color-text)]"
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
            >
              로그아웃
              <div
                className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0"
                style={{
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderRight: "5px solid var(--color-text)",
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around pt-2 pb-5 z-50 border-t bg-[var(--color-surface)] dark:bg-[var(--color-surface)] border-[var(--color-g200)] dark:border-[var(--color-border)]">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.id);
        return (
          <button
            key={item.id}
            onClick={() => router.push(item.id)}
            className="flex flex-col items-center gap-0.5 bg-transparent border-none px-3 py-1 cursor-pointer"
            style={{ opacity: active ? 1 : 0.4 }}
          >
            <NavIcon name={item.icon} size={22} active={active} />
            <span
              className="text-[10px]"
              style={{
                fontWeight: active ? 700 : 400,
                color: active ? "var(--color-primary)" : "var(--color-g500)",
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
  const pathname = usePathname();
  const { status } = useSession();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    if (pathname === "/import") {
      setChecked(true);
      return;
    }

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
  }, [status, router, pathname]);

  if (status === "loading" || !checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <IconSidebar />
      <main className="flex-1 min-w-0">{children}</main>
      <BottomNav />
    </div>
  );
}
