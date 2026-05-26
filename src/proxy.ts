import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 기존 경로를 신규 경로로 리다이렉트
  if (req.nextUrl.pathname === "/analysis/personality") {
    return NextResponse.redirect(new URL("/personality", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|login|register|onboarding|preview|slides|_next|favicon.ico).*)"],
};
