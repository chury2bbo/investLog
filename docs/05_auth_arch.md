# 🚀 AI 투자 관리 프로그램 — 설계 문서
> 최종 업데이트: 2026-04-20 | 멀티유저 소규모 (~50명) · 2인 팀 · Claude Code 개발

---

## 10. 인증 설계 (NextAuth.js v5)

### 10-1. 지원 방식

| 방식 | Provider | 비고 |
|------|----------|------|
| 이메일 + 비밀번호 | `CredentialsProvider` | bcrypt 해시 검증 |
| 구글 소셜 | `GoogleProvider` | OAuth 2.0 |
| 카카오 소셜 | `KakaoProvider` | OAuth 2.0 |

### 10-2. NextAuth 설정 요약

```typescript
// auth.ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user?.password) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        return valid ? user : null;
      },
    }),
    Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
    Kakao({ clientId: process.env.KAKAO_CLIENT_ID!, clientSecret: process.env.KAKAO_CLIENT_SECRET! }),
  ],
  callbacks: {
    jwt({ token, user }) { if (user) token.userId = user.id; return token; },
    session({ session, token }) { session.user.id = token.userId as string; return session; },
  },
});
```

### 10-3. 회원가입 API

```typescript
// POST /api/auth/register
export async function POST(req: Request) {
  const { email, password, name } = await req.json();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return Response.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name, provider: "credentials" },
  });
  return Response.json({ id: user.id, email: user.email });
}
```

---

## 11. API 보안 패턴 (필수)

**모든 API Route에 반드시 적용. `userId` 조건 누락 시 타인 데이터 노출.**

```typescript
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const data = await prisma.holding.findMany({
    where: { account: { userId: session.user.id } }, // ← 격리 핵심
  });
  return Response.json(data);
}
```

---

## 12. 전체 아키텍처

```
[브라우저 localhost:3000]
    ↓ HTTP
[Next.js 16 — 로컬 실행]
    │
    ├── /app/(auth)/
    │     ├── login/page.tsx
    │     └── register/page.tsx
    │
    ├── /app/onboarding/page.tsx        ← 가입 직후 1회
    │
    ├── /app/(dashboard)/               ← middleware 인증 보호
    │     ├── page.tsx                  ← 통합 대시보드
    │     ├── accounts/
    │     │     ├── page.tsx            ← 계좌 목록
    │     │     └── [id]/page.tsx       ← 계좌 상세
    │     ├── trades/page.tsx           ← 매매일지
    │     ├── analysis/page.tsx         ← 종목 분석
    │     ├── personality/page.tsx      ← 투자 성향 (진단 + 통계 + 코칭, 단일 페이지)
    │     ├── profile/page.tsx          ← 회원정보
    │     └── admin/page.tsx            ← 관리자 페이지 (이메일 화이트리스트)
    │
    └── /app/api/                       ← 전체 30+ API Route 구현 완료
          ├── auth/[...nextauth]/
          ├── auth/register/
          ├── onboarding/bulk/           ← 복수 계좌·종목 일괄 등록 + 섹터 자동조회
          ├── accounts/                  ← 계좌 CRUD
          ├── accounts/[id]/             ← 계좌 상세 수정·삭제
          ├── brokerages/                ← 증권사 목록 조회
          ├── holdings/                  ← 종목 등록 (sectorAuto 자동 조회)
          ├── holdings/[id]/             ← 보유종목 수정·삭제
          ├── holdings/[id]/sector/      ← 내 섹터(sectorManual) 수정
          ├── holdings/[id]/sector/refresh/ ← sectorAuto 새로고침
          ├── trades/                    ← 매매 CRUD + cashLog 1:1 외래 키
          ├── trades/[id]/               ← 매매 상세 수정·삭제 (cashLog cascade)
          ├── trades/analysis/           ← 성향 통계 집계 (최근 6개월)
          ├── cash/                      ← 예수금 입출금
          ├── market/quote/              ← KIS + yahoo 주가 + 환율
          ├── market/search/             ← 종목명 검색 (DB + yahoo)
          ├── market/history/            ← 시세 히스토리
          ├── user/me/                   ← 사용자 정보 조회·수정·탈퇴
          ├── asset-snapshot/            ← 월별 자산 스냅샷
          ├── import/analyze/            ← 스크린샷 종목 추출 (Claude Vision)
          ├── analysis/quote/            ← 지표 + 차트 데이터
          ├── analysis/summary/          ← 기업 소개 요약 (영구 캐시)
          ├── analysis/history/          ← 분석 히스토리
          ├── analysis/report/           ← AI 종목 분석 (당일 캐시, 10회/일)
          ├── personality/summary/       ← 투자성향 진단 Level 1·2 (1회/일 통합)
          ├── personality/history/       ← AI 코칭 리포트 누적 + 조회 (3회/일)
          └── admin/                     ← 관리자: 토큰/사용량/API 상태

    ↓ Prisma ORM
[PostgreSQL — Supabase 클라우드 무료 티어]
```

### middleware.ts

```typescript
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.url));

  // 기존 경로 → 신규 경로 리다이렉트
  if (req.nextUrl.pathname === "/analysis/personality") {
    return NextResponse.redirect(new URL("/personality", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|login|register|onboarding|preview|_next|favicon.ico).*)"],
};
```

---

## 13. 환경변수

```bash
# ── 데이터베이스 (Supabase 클라우드) ─────────────────────────
# Supabase 프로젝트 → Settings → Database → Connection String 에서 복사
DATABASE_URL="postgresql://postgres.<프로젝트>:[비밀번호]@aws-...-pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<프로젝트>:[비밀번호]@aws-...-pooler.supabase.com:5432/postgres"

# ── NextAuth v5 ─────────────────────────────────────────────
AUTH_URL="http://localhost:3000"
AUTH_SECRET="..."               # openssl rand -base64 32 로 생성

# ── 소셜 로그인 ────────────────────────────────────────────
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
KAKAO_CLIENT_ID="..."
KAKAO_CLIENT_SECRET="..."

# ── Claude API ─────────────────────────────────────────────
ANTHROPIC_API_KEY="sk-ant-..."

# ── 한국투자증권 Open API ───────────────────────────────────
# 개발자 계정 1개로 운영 · 사용자 한투 계좌 불필요
KIS_APP_KEY="..."
KIS_APP_SECRET="..."
KIS_ACCOUNT_NO="..."            # 계좌번호 앞 8자리
KIS_MOCK_APP_KEY="..."          # 모의투자 키 (개발·테스트 전용)
KIS_MOCK_APP_SECRET="..."
```

> 로컬 실행 시 `.env.local` 파일에 저장. git에 절대 올리지 않도록 `.gitignore`에 포함 확인.
> 팀원 B는 팀원 A에게 `.env.local` 파일을 카카오톡·슬랙 등으로 직접 전달받을 것.

---

## 13-1. Supabase DB 설정 가이드

### 세팅 방법 (5분)

```
1. https://supabase.com 접속 → 회원가입
2. New Project 생성
   - 리전: Northeast Asia (도쿄) 선택 — 가장 빠름
   - DB 비밀번호 설정 후 생성 (분실 금지)
3. Settings → Database → Connection String (URI) 복사
4. .env.local의 DATABASE_URL에 붙여넣기
5. npx prisma migrate dev --name init 실행
   → Supabase DB에 테이블 자동 생성
6. 팀원 B에게 .env.local 전달 → 동일 DB 접속
```

### 무료 플랜 스펙 및 InvestLog 예상 사용량

| 항목 | 무료 제한 | InvestLog 예상 사용량 | 여유 |
|------|-----------|----------------------|------|
| DB 용량 | 500MB | ~15MB (사용자 50명 기준) | ✅ 충분 |
| 월간 활성 사용자 | 50,000명 | ~50명 | ✅ 충분 |
| DB 트래픽 | 5GB/월 | ~0.1GB | ✅ 충분 |
| 활성 프로젝트 수 | 2개 | 1개 | ✅ 충분 |
| 비용 | 무료 | $0 | ✅ |

### ⚠️ 무료 플랜 주의사항

**1. 7일 비활성 시 자동 중지**
```
개발 중 주말에 쉬다가 월요일에 앱이 안 되는 경우 발생 가능.
해결: https://supabase.com/dashboard 접속 → 프로젝트 Resume 클릭
```

**2. 자동 백업 없음**
```
무료 플랜은 DB 자동 백업 기능 미제공.
중요한 테스트 데이터는 주기적으로 수동 백업 권장:
  npx prisma db pull           → 스키마 확인
  Supabase 대시보드 → Table Editor → CSV Export
```

**3. 500MB 초과 시 읽기 전용 전환**
```
InvestLog 예상 사용량은 15MB 수준이라 실질적 위험 없음.
단, stock_master(KRX 종목 3,000개) 초기 적재 후 용량 확인 권장.
```

**4. 공유 컴퓨팅 (성능 제한)**
```
무료 플랜은 공유 서버에서 실행되어 응답이 가끔 느릴 수 있음.
개발 환경에서는 큰 문제 없음.
```

### 개발 팁

```bash
# 프로젝트 중지 방지 — 매주 월요일 Supabase 대시보드 접속 습관
# 또는 개발 시작 전 대시보드에서 활성 상태 확인

# DB 연결 확인 명령어
npx prisma db pull   # 현재 DB 스키마 동기화 확인
npx prisma studio    # 브라우저에서 DB 데이터 확인 (localhost:5555)
```

---

