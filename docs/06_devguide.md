# 🚀 AI 투자 관리 프로그램 — 설계 문서
> 최종 업데이트: 2026-04-20 | 멀티유저 소규모 (~50명) · 2인 팀 · Claude Code 개발

---

## 14. 단계별 실행 로드맵 (8주)

| 주차 | 팀원 A | 팀원 B | 상태 |
|------|--------|--------|------|
| **1주** | 프로젝트 세팅·Prisma 스키마·NextAuth | 공통 컴포넌트·디자인 시스템 | ✅ 완료 |
| **2주** | KIS API·yahoo-finance2 래퍼·KRX DB | 온보딩 UI·종목 검색 자동완성 | ✅ 완료 |
| **3주** | 계좌·종목·예수금 API | 대시보드·계좌 상세 화면 | ✅ 완료 |
| **4주** | 매매일지 API·트랜잭션·예수금 로직 | 매매일지 입력 폼 UI | ✅ 완료 |
| **5주** | Claude API 연동·캐시 구현 | 종목 분석 화면·MDD 차트 | ✅ 완료 |
| **6주** | 성향 통계 집계 API·ApiUsageLog | 투자성향 분석 화면 (Level 1·2 + AI 코칭) | ✅ 완료 |
| **추가** | TradeLog↔CashLog 외래 키·6개월 집계·parseAiJson 헬퍼·관리자 API | 관리자 UI·스크린샷 종목 등록·음성인식·Select/Skeleton/Toast/ConfirmDialog 컴포넌트 | ✅ 완료 |
| **7주** | 빌드 검증·보안 점검·KIS IP 확인 | 반응형 마무리·최종 QA·툴팁·UX 보완 | 🔄 진행 중 |
| **8주** | 환경변수 정리(.env 이동)·마무리 | 로컬 환경 최종 점검·발표 자료·데모 시나리오 | ⬜ 예정 |

### 7주차 남은 작업 체크리스트

```
[ ] 관리자 이메일 화이트리스트 .env.local 이동 (코드 하드코딩 제거)
[ ] npm run build — 빌드 오류 없는지 최종 확인
[ ] KIS Open API 등록 IP 확인 (배포 환경 IP 변경 여부)
[ ] 전체 기능 최종 QA (대시보드→계좌→매매→분석→성향 골든 패스)
[ ] Supabase 대시보드 활성 상태 확인

[x] Node.js v24 → v22 LTS 다운그레이드 (Turbopack 프로세스 증식 버그 해결)
[x] 모바일 탭 스타일 통일 (Tabs 공통 컴포넌트 적용 — 계좌 상세 / 성향 페이지)
[x] 매매일지 모바일 무한 스크롤 (페이지네이션 → scroll 기반 자동 로딩)
[x] 종목 분석 AI 리포트 분석일 표시 (Claude AI · YYYY-MM-DD)
[x] 입출금 이력 정렬 개선 (date + createdAt 이중 정렬)
```

---

## 15. Claude Code 활용 가이드

### 15-1. 기본 원칙

- 기능 하나씩 완성 후 다음 진행 (한 번에 많이 시키면 오류 복잡)
- 이 문서의 해당 섹션을 프롬프트에 그대로 붙여넣기
- 오류 발생 시 오류 메시지 + 관련 파일 코드 함께 전달
- 코드 이해 습관 유지 — 왜 이렇게 동작하는지 질문하면서 진행

### 15-2. 초기 세팅 흐름 (A → B 순서)

초기 세팅 프롬프트는 **A와 B가 다릅니다.**
A가 먼저 프로젝트를 생성하고 공통 컴포넌트까지 완성한 뒤, B는 clone해서 시작합니다.

**전체 순서**

```
━━━ 팀원 A — 1단계: 프로젝트 초기 세팅 ━━━━━━━━━━━━━━━━
  1. GitHub 레포 생성
  2. Supabase 프로젝트 생성 → DATABASE_URL 발급
  3. Claude Code로 Next.js 프로젝트 초기화 (아래 프롬프트)
     → 폴더 구조 전체 생성
  4. Prisma 스키마 작성 + npx prisma migrate dev 실행
     → Supabase DB에 테이블 자동 생성
  5. NextAuth 설정 + middleware.ts 작성
  6. .env.local 세팅 (DATABASE_URL = Supabase 연결 문자열)
  7. develop 브랜치에 push
        ↓
━━━ 팀원 A — 2단계: 공통 컴포넌트 생성 (선행 필수) ━━━━━━
  8. components/ui/ 공통 컴포넌트 전체 완성
     (Button, Card, Tag, PnlTag, Input, Divider,
      BottomSheet, LoadingSpinner, EmptyState, SectionTitle, ThemeToggle)
     → ui-mockup.jsx 디자인 토큰 기준으로 작성
  9. develop 브랜치에 push
 10. 팀원 B에게 .env.local 전달 + "공통 컴포넌트 완성, 시작해도 돼" 공유
        ↓
━━━ 팀원 B — clone 후 작업 시작 ━━━━━━━━━━━━━━━━━━━━━
  1. GitHub에서 clone
  2. npm install
  3. .env.local 파일 A에게 직접 전달받아 복사 (git에 올리면 안 됨)
     → Supabase DATABASE_URL 포함 — 동일 클라우드 DB 접속
  4. npx prisma generate
  5. components/ui/ 공통 컴포넌트 확인
  6. npm run dev → 페이지 컴포넌트 작업 시작
        ↓
━━━ A·B 병렬 작업 시작 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  팀원 A: API Route 개발
  팀원 B: 페이지 컴포넌트 개발 (공통 컴포넌트 import해서 사용)
```

> 💡 **공통 컴포넌트를 먼저 만들어야 하는 이유**
> B가 페이지를 만들 때 `import { Card } from "@/components/ui/Card"` 형태로 사용합니다.
> 공통 컴포넌트가 없으면 import 오류가 나거나 B가 직접 스타일을 만들어야 해서
> 디자인이 제각각이 됩니다.

**1주차 권장 타임라인**

```
월~수 (팀원 A)
  Next.js 세팅 + Prisma 스키마 + NextAuth + middleware
  → develop push

수~금 (팀원 A)
  components/ui/ 공통 컴포넌트 완성
  → develop push + B에게 .env.local 전달

목~금 (팀원 B)
  clone + npm install + 환경 확인
  공통 컴포넌트 확인 후 온보딩 UI 작업 시작
```

**⚠️ .env.local은 절대 git에 올리지 않습니다.**
`.gitignore`에 이미 포함돼 있지만, A가 B에게 카카오톡·슬랙 등으로 직접 전달해야 합니다.

**⚠️ Supabase 7일 비활성 자동 중지 주의**
주말 이후 월요일 개발 시작 전 https://supabase.com/dashboard 에서 프로젝트 활성 상태 확인.

---

**팀원 A — 프로젝트 최초 생성 프롬프트** (새 폴더에서 실행)

```
Next.js 16 App Router + TypeScript + Tailwind CSS v4 + Prisma 7 + PostgreSQL(Supabase)
조합으로 투자 관리 웹 서비스 프로젝트를 새로 세팅해줘.

── 폴더 구조 ──────────────────────────────────────────
app/
  (auth)/
    login/page.tsx          ← 로그인
    register/page.tsx       ← 회원가입
  (dashboard)/              ← middleware 인증 보호
    page.tsx                ← 통합 대시보드
    accounts/
      page.tsx              ← 계좌 목록
      [id]/page.tsx         ← 계좌 상세
    trades/page.tsx         ← 매매일지
    analysis/
      page.tsx              ← 종목 분석
      personality/page.tsx  ← 투자성향 분석
  onboarding/page.tsx       ← 가입 직후 1회
  api/
    auth/[...nextauth]/     ← NextAuth v5 핸들러
    auth/register/          ← 회원가입 API
    onboarding/bulk/        ← 복수 계좌·종목 일괄 등록
    accounts/               ← 계좌 CRUD
    holdings/               ← 보유 종목 CRUD
    holdings/[id]/sector/   ← 커스텀 섹터·태그 수정
    holdings/[id]/sector/refresh/
    trades/                 ← 매매일지 CRUD (cashLog 1:1 외래 키 cascade)
    trades/[id]/            ← 매매 수정·삭제
    trades/analysis/        ← 성향 통계 집계 (최근 6개월)
    cash/                   ← 예수금 입출금
    market/quote/           ← KIS + yahoo 주가 조회 + 환율
    market/search/          ← 종목명 검색 (DB + yahoo)
    market/history/         ← 시세 히스토리 (MDD 차트)
    analysis/quote/         ← 지표 + 차트 데이터
    analysis/summary/       ← 기업 소개 AI 요약 (영구 캐시)
    analysis/history/       ← 분석 본 종목 이력
    analysis/report/        ← AI 종목 분석 (당일 캐시, 10회/일)
    personality/summary/    ← 투자성향 진단 Level 1·2 (1회/일 통합)
    personality/history/    ← AI 코칭 (3회/일)
    import/analyze/         ← 스크린샷 종목 추출 (Claude Vision)
    asset-snapshot/         ← 월별 자산 스냅샷
    user/me/                ← 사용자 정보 조회·수정·탈퇴
    admin/                  ← 관리자 (토큰/사용량/API 상태)

components/
  ui/                       ← 공통 컴포넌트 (Button, Card, Tag 등)

lib/                        ← 유틸 함수 (KIS API 래퍼, yahoo 래퍼, normalize 등)
prisma/
  schema.prisma             ← DB 스키마
middleware.ts               ← 인증 미들웨어 (dashboard 전체 보호)

── 코딩 규칙 ──────────────────────────────────────────
- 모든 컴포넌트는 함수형
- async/await 사용, 에러 핸들링 필수
- "use client"는 꼭 필요한 곳에만 (기본은 Server Component)
- path alias: @/ → src/ 또는 루트 기준으로 설정
- 다크모드: next-themes 사용
- 모든 API Route에 userId 조건 필수 (데이터 격리)
  예: where: { account: { userId: session.user.id } }

── DB 설정 ─────────────────────────────────────────────
- PostgreSQL은 Supabase 클라우드 사용 (로컬 설치 불필요)
- DATABASE_URL은 .env.local에서 관리
- Prisma ORM으로 타입 안전 쿼리

── middleware.ts 내용 ──────────────────────────────────
export { auth as middleware } from "@/auth";
export const config = {
  matcher: ["/((?!api/auth|login|register|onboarding|_next|favicon.ico).*)"],
};
```

**팀원 B — 기존 프로젝트 파악 프롬프트** (clone 후 최초 1회만 실행)

> ⚠️ **이 프롬프트는 프로젝트를 처음 파악할 때 단 1회만 사용합니다.**
> Claude Code는 세션이 끊기면 이전 대화를 기억하지 못합니다.
> 기능 개발은 반드시 아래 **15-3의 기능별 프롬프트**를 새 세션에서 각각 사용하세요.
> 공통 전제(컴포넌트 경로, API 규칙 등)는 15-3 상단의 **[B 공통 전제 — 매 세션 상단에 붙여넣기]** 블록에 포함되어 있습니다.

```
이미 세팅된 Next.js 14 App Router 프로젝트야.
현재 폴더 구조와 주요 파일을 파악해줘.

내가 담당할 기능 목록:
- 로그인 UI (app/(auth)/login/page.tsx)
- 회원가입 UI (app/(auth)/register/page.tsx)
- 온보딩 UI (app/onboarding/page.tsx)
- 대시보드 화면 (app/(dashboard)/page.tsx)
- 계좌 목록 화면 (app/(dashboard)/accounts/page.tsx)
- 계좌 상세 화면 (app/(dashboard)/accounts/[id]/page.tsx)
- 매매일지 화면 (app/(dashboard)/trades/page.tsx)
- 종목 분석 화면 (app/(dashboard)/analysis/page.tsx)
- 투자성향 화면 (app/(dashboard)/personality/page.tsx)
- 회원정보 화면 (app/(dashboard)/profile/page.tsx)
- 스크린샷 종목 등록 (app/(dashboard)/import/page.tsx)

파악 후 아래 내용을 확인하고 요약해줘:
1. components/ui/ 에 있는 공통 컴포넌트 목록
2. app/api/ 에 팀원 A가 만들어 둔 Route 목록
3. prisma/schema.prisma 의 주요 모델 목록
4. .env.local 에 필요한 환경변수 중 현재 세팅된 것
```

### 15-3. 기능별 프롬프트 템플릿

> **팀원 B 사용 방법**
> Claude Code는 세션이 끊기면 이전 대화를 기억하지 못합니다.
> 기능 개발을 시작할 때마다 새 세션에서 아래 순서로 붙여넣으세요.
>
> ```
> 1단계: [B 공통 전제] 블록 붙여넣기        ← 매 세션 항상 먼저
> 2단계: 해당 기능의 [기능명 — B] 블록 붙여넣기
> ```

---

**[B 공통 전제 — 매 세션 상단에 붙여넣기]**
```
# 프로젝트 공통 전제 (InvestLog — 팀원 B)

## 기술 스택
- Next.js 16 App Router + TypeScript + Tailwind CSS v4 + React 19
- 인증: NextAuth.js v5 (JWT, session.user.id 로 userId 접근)
- 다크모드: next-themes (useTheme 훅)

## 공통 컴포넌트 위치: components/ui/
- Button        — variant: primary(#05C072) / secondary / black
- Card          — 16px 모서리, 라이트/다크 모드 대응, onClick prop 지원
- Tag           — 배경색+텍스트색 props
- PnlTag        — 수익(그린)/손실(레드) 자동 색상
- Input         — 언더라인 스타일, label 포함
- Divider       — 1px 구분선
- Tabs          — 탭 전환 (variant: segment / chip, 제네릭 키 타입)
- BottomSheet   — 하단에서 올라오는 모달 (핸들 바 포함, titleRight prop 지원)
- LoadingSpinner — API 호출 중 표시
- EmptyState    — 데이터 없을 때 안내 문구+아이콘
- SectionTitle  — 섹션 제목 (15px bold)
- Select        — 증권사 드롭다운, 키보드 탐색(↑↓ Enter Esc) 지원
- Skeleton      — 로딩 Placeholder (카드·텍스트 라인)
- Toast         — 하단 알림 토스트
- ConfirmDialog — 삭제·위험 동작 확인 모달
- ThemeToggle   — 다크/라이트 토글 버튼

## API Route (팀원 A 담당, 이미 구현됨)
모든 Route는 session.user.id 기준으로 데이터가 격리되어 있음.
- GET/POST        /api/accounts
- GET/PUT/DELETE  /api/accounts/[id]
- GET/POST        /api/holdings
- PUT             /api/holdings/[id]/sector
- POST            /api/holdings/[id]/sector/refresh
- GET/POST        /api/trades
- PATCH/DELETE    /api/trades/[id]
- GET             /api/trades/analysis?min=N (최근 6개월 매매 통계)
- GET/POST        /api/cash
- GET             /api/market/quote?ticker=&country=
- GET             /api/market/search?q=&country=
- GET             /api/market/history?ticker=&country=
- GET             /api/analysis/quote?ticker=&country=
- GET             /api/analysis/summary?ticker=
- GET             /api/analysis/report?ticker=&name=&country= (10회/일)
- GET             /api/personality/summary?last=true 또는 신규 진단 (Level 1·2 1회/일 통합)
- GET/POST        /api/personality/history (AI 코칭, 3회/일)
- POST            /api/import/analyze (스크린샷 종목 추출)
- GET/POST        /api/asset-snapshot
- GET             /api/brokerages (증권사 목록)
- GET/PATCH/DELETE /api/user/me (사용자 정보·회원탈퇴)
- GET             /api/admin/stats (관리자 전용)

## 디자인 토큰
Primary: #05C072 / Positive: #05C072 / Negative: #F04452
Background: #F5F7F5 / Surface: #FFFFFF / Text: #1A221A
Dark BG: #0D1210 / Dark Surface: #151C14 / Dark Card: #1D2720

## 코딩 규칙
- 모든 컴포넌트 함수형, "use client"는 꼭 필요한 곳에만
- 공통 컴포넌트는 반드시 @/components/ui/ 에서 import해서 사용
- API fetch는 팀원 A가 만든 위 Route만 사용 (직접 Prisma 쿼리 금지)
- 로딩 상태는 LoadingSpinner, 빈 데이터는 EmptyState 컴포넌트 사용
- async/await + try/catch 에러 핸들링 필수
```

---

**[인증 — A]**
```
아래 설계를 기반으로 NextAuth.js v5 auth.ts 파일을 만들어줘.
Provider: Credentials + Google + Kakao
세션: JWT, token.userId = user.id 저장
[설계 문서 섹션 10-2 붙여넣기]
```

**[DB 스키마 — A]**
```
아래 Prisma 스키마를 prisma/schema.prisma에 작성해줘.
[설계 문서 섹션 9-2 전체 붙여넣기]
작성 후 npx prisma migrate dev --name init 명령어도 알려줘.
```

**[로그인 UI — B]**
```
ui-mockup.jsx의 Login 컴포넌트를 참고해서 app/(auth)/login/page.tsx를 만들어줘.

레이아웃:
- 전체 화면 중앙 정렬 (배경색 #F5F7F5 / 다크모드 #0D1210)
- 상단: InvestLog 로고 아이콘(#05C072 그린 56px) + 서비스명 + 한줄 설명
- 카드(흰색, 16px 모서리) 안에 로그인 폼 배치

폼 구성:
- 이메일 입력 (언더라인 스타일)
- 비밀번호 입력 (언더라인 스타일)
- 로그인 오류 시 에러 메시지 표시 (빨간 배경 배너: "이메일 또는 비밀번호가 틀렸어요.")
- [로그인] 버튼 (Primary 그린, 전체 너비)
- "또는" 구분선
- [Google로 로그인] 버튼 (흰색 테두리)
- [카카오로 로그인] 버튼 (#FEE500 배경)
- 하단: "아직 계정이 없으신가요?" + 회원가입 링크 → /register 이동

동작:
- 로그인 버튼 클릭 시 NextAuth signIn("credentials") 호출
- Google 버튼 클릭 시 signIn("google") 호출
- 카카오 버튼 클릭 시 signIn("kakao") 호출
- 로그인 성공 시 user.onboardingDone 체크:
  - false → /onboarding 리다이렉트
  - true  → / (대시보드) 리다이렉트
- 이미 로그인된 사용자가 접근 시 / 로 리다이렉트
- 로딩 중 버튼 비활성화 + LoadingSpinner 표시
- 다크모드 지원 (next-themes)
```

**[회원가입 UI — B]**
```
ui-mockup.jsx의 Register 컴포넌트를 참고해서 app/(auth)/register/page.tsx를 만들어줘.

레이아웃:
- 전체 화면 중앙 정렬, 로그인 화면과 동일한 배경
- 상단: InvestLog 로고 아이콘(48px) + 서비스명
- 2단계 스텝 구조: Step 1 (입력) → Step 2 (완료)

Step 1 — 입력 카드:
- 제목 "회원가입" + 부제 "투자 기록을 시작해보세요"
- 이름 입력 (언더라인 스타일)
- 이메일 입력
- 비밀번호 입력 (8자 이상)
- 비밀번호 확인 입력
- 유효성 검사 오류 표시:
  - 비밀번호 8자 미만: "비밀번호는 8자 이상이어야 해요."
  - 비밀번호 불일치: "비밀번호가 일치하지 않아요."
  - 이메일 중복: "이미 사용 중인 이메일이에요." (API 응답 409)
- [가입하기] 버튼 (Primary 그린, 전체 너비)
- 하단: "이미 계정이 있으신가요?" + 로그인 링크 → /login 이동

Step 2 — 완료 카드:
- 🎉 이모지 + "가입 완료!" 제목
- 환영 문구 (InvestLog에 오신 걸 환영해요. 나만의 투자 기록을 시작해볼까요?)
- [시작하기 →] 버튼 → /onboarding 으로 이동

동작:
- [가입하기] 클릭 시 POST /api/auth/register 호출
- 성공 시 Step 2 완료 화면으로 전환 (페이지 이동 아님)
- [시작하기] 클릭 시 NextAuth signIn("credentials") 자동 로그인 후 /onboarding 이동
- 로딩 중 버튼 비활성화
- 다크모드 지원 (next-themes)
```

**[온보딩 UI — B]**
```
아래 설계를 기반으로 app/onboarding/page.tsx를 만들어줘.
[설계 문서 섹션 3-2 붙여넣기]
- 계좌 여러 개 추가 가능
- 예수금 선택 입력 (빈칸이면 0 저장)
- 종목 검색 자동완성 컴포넌트 포함
- 완료 시 POST /api/onboarding/bulk 호출
```

**[대시보드 UI — B]**
```
ui-mockup.jsx의 Dashboard 컴포넌트를 참고해서 app/(dashboard)/page.tsx를 만들어줘.

레이아웃 (3개 섹션 순서):
1. 인사말 + 히어로 카드
2. 요약 지표 그리드 + 자산 배분 카드
3. 계좌 현황 목록

── 섹션 1: 히어로 카드 ──────────────────────────────
- 상단 인사말: "안녕하세요, {user.name}님 👋" + "내 투자 현황" 타이틀
- 그린 그라디언트 카드 (#027A47 → #05C072, 135deg)
  - "총 보유 자산" 라벨 + KRW 환산 총액 (대형 폰트)
  - 전일 대비 손익금액·수익률 배지 (흰색 반투명 배경)
  - 하단 3칸 미니 카드: 국내주식(₩) / 해외주식($) / 예수금(₩)
    → GET /api/accounts 로 계좌 목록 + 보유 종목 합산
    → GET /api/market/quote 로 현재가 조회 후 KRW 환산
    → 환율: GET /api/market/quote?ticker=USDKRW 또는 별도 환율 API

── 섹션 2: 요약 지표 + 자산 배분 ───────────────────
- 2열 그리드 요약 카드 4종:
  총 수익률(%) / 총 수익금(₩) / 보유 종목 수 / 총 계좌 수
  → 수익·양수는 #05C072, 손실·음수는 #F04452 적용
- 자산 배분 카드:
  - 가로 바 차트 (국내주식 / 해외주식 / 원화예수금 / 달러예수금 비율)
  - 각 항목 색상 범례 + 비율(%) 표기
  - [새로고침] 버튼 → 현재가 재조회 후 비율 재계산

── 섹션 3: 계좌 현황 ────────────────────────────────
- SectionTitle "계좌 현황"
- 계좌별 카드 나열:
  💳 아이콘 + 계좌명 / 국내·해외 구분 Tag / 종목 수 / 예수금
  오른쪽: PnlTag (계좌 전체 수익률) + › 화살표
  카드 클릭 시 /accounts/[id] 이동 (Next.js router.push)
- 계좌가 없을 때: EmptyState ("아직 등록된 계좌가 없어요. 온보딩에서 추가해보세요.")

동작:
- 페이지 진입 시 데이터 로딩 중 LoadingSpinner 표시
- 현재가 조회 실패 시 마지막 저장값으로 폴백, "지연된 시세" 안내 문구 표시
- 다크모드 지원 (next-themes)
- 모바일(768px 미만): 히어로 카드 폰트 축소 (32px), 하단 여백 100px (바텀 네비 높이)
```

**[매매일지 API — A]**
```
POST /api/trades Route를 만들어줘.
[설계 문서 섹션 5 매매일지 예수금 처리 로직 붙여넣기]
- BUY: holdings upsert (평단가 재계산) + sectorAuto 저장 + 예수금 차감
- SELL: holdings 수량 차감 + 예수금 증가
- 예수금 부족 시 차단 말고 cashWarning: true 반환
- reasonTags / emotion / reasonMemo 포함
```

**[매매일지 UI — B]**
```
app/(dashboard)/trades/page.tsx를 만들어줘.
[설계 문서 섹션 5 매매일지 화면 요구사항 붙여넣기]
- 필수/선택 입력 시각적으로 구분
- 이유 태그 한 줄 설명 병기
- [이전 거래 불러오기] 버튼
- 예수금 부족 경고 모달
```

**[계좌 목록 — B]**
```
app/(dashboard)/accounts/page.tsx를 만들어줘.
[설계 문서 섹션 5 계좌 목록 화면 요구사항 붙여넣기]
- GET /api/accounts 호출하여 등록된 계좌 목록서 표시
- 계좌 카드: 계좌명 / 종목 수 / 예수금 잔고 (KRW·USD 구분) / 수익률 요약
- 카드 클릭 시 /accounts/[id] 상세 페이지로 이동
- [+ 계좌 추가] 버튼 → 계좌 추가 바텀시트 모달
  - 모달 입력: 계좌명 (필수) / 예수금 (선택)
  - 저장 시 POST /api/accounts 호출 후 목록 갱신
- 계좌가 없을 때 EmptyState 컴포넌트로 안내 문구 표시
```

**[계좌 상세 — B]**
```
app/(dashboard)/accounts/[id]/page.tsx를 만들어줘.
4개 섹션: 보유종목+섹터편집 / 예수금관리 / 매매이력(최근5건) / 섹터탭차트
[설계 문서 섹션 5 계좌 상세 UI 붙여넣기]
```

**[종목 분석 — B]**
```
app/(dashboard)/analysis/page.tsx를 만들어줘.
[설계 문서 섹션 5 종목 분석 화면 붙여넣기]
- MDD 차트: Recharts AreaChart + LineChart 2단 구성
- 날짜 직접 입력으로 기간 필터
- 자연어 해석 문구 표시
```

**[Claude API — A]**
```
아래 3개 API Route를 만들어줘.
1. POST /api/analysis/summary  — 기업 소개 한국어 요약 (영구 캐시)
2. POST /api/analysis/report   — AI 종목 분석 (당일 캐시)
3. POST /api/trades/analysis/ai-report — 투자성향 리포트 (횟수 제한)
[설계 문서 섹션 8 캐시 전략 코드 붙여넣기]
```

**[로컬 실행 세팅 — A]**
```
이 Next.js 프로젝트를 로컬에서 실행할 수 있도록 세팅해줘.

DB는 로컬 PostgreSQL이 아닌 Supabase 클라우드를 사용해.
1. Supabase 프로젝트 생성 → DATABASE_URL 발급
2. .env.local 파일 구성 (아래 환경변수 목록 참고)
3. npx prisma migrate dev --name init 실행
   → Supabase DB에 테이블 자동 생성
4. npm run dev 로 실행 확인
[설계 문서 섹션 13 환경변수 목록 붙여넣기]
```

### 15-4. 공통 컴포넌트 (팀원 A 먼저 생성 후 공유)

#### ui-mockup.jsx와 실제 개발의 관계

`ui-mockup.jsx`는 **실제 동작하는 설계 참고용 시안**이고, `components/ui/`는 **재사용 가능한 부품 창고**입니다. 공통 컴포넌트를 만들었다고 UI가 자동으로 나오는 게 아니라, 각 페이지를 개발할 때 ui-mockup.jsx를 보면서 따라 만드는 방식입니다.

```
ui-mockup.jsx (시안)         실제 개발 파일
────────────────────         ─────────────────────────────────
Login 컴포넌트         →     app/(auth)/login/page.tsx
Register 컴포넌트      →     app/(auth)/register/page.tsx
Onboarding 컴포넌트    →     app/onboarding/page.tsx
Dashboard 컴포넌트     →     app/(dashboard)/page.tsx
Accounts 컴포넌트      →     app/(dashboard)/accounts/[id]/page.tsx
Trades 컴포넌트        →     app/(dashboard)/trades/page.tsx
Analysis 컴포넌트      →     app/(dashboard)/analysis/page.tsx
Personality 컴포넌트   →     app/(dashboard)/personality/page.tsx  ← /analysis/personality 아님
Profile 컴포넌트       →     app/(dashboard)/profile/page.tsx
Import 컴포넌트        →     app/(dashboard)/import/page.tsx
```

#### ui-mockup.jsx → 실제 페이지 변환 프롬프트

각 페이지 개발 시 아래 방식으로 Claude Code에게 지시하세요.

```
ui-mockup.jsx의 아래 컴포넌트를 실제 Next.js 페이지로 변환해줘.

[ui-mockup.jsx에서 해당 컴포넌트 코드 붙여넣기]

변환 조건:
- 파일 위치: app/(dashboard)/page.tsx  ← 각 페이지에 맞게 변경
- 공통 컴포넌트는 @/components/ui/ 에서 import해서 사용
- 하드코딩된 더미 데이터 → 실제 API fetch로 교체
  예: GET /api/holdings, GET /api/cash
- 다크모드는 next-themes 사용
- TypeScript 타입 정의 포함
- 로딩 상태 (LoadingSpinner) 처리 포함
```

#### 공통 컴포넌트 생성 프롬프트

```
components/ui/ 폴더에 아래 컴포넌트를 만들어줘.
ui-mockup.jsx의 디자인 토큰을 기준으로 만들어.

디자인 토큰:
  Primary:    #05C072 (그린)
  Positive:   #05C072 (수익)
  Negative:   #F04452 (손실)
  Background: #F5F7F5
  Surface:    #FFFFFF
  Black:      #1A221A
  Dark BG:    #0D1210
  Dark Card:  #1D2720

컴포넌트 목록:
1. Button    — variant: primary(그린) / secondary(회색) / black
2. Card      — 16px 모서리, 그림자, 다크모드 지원
3. Tag       — 배경색+텍스트색 props, 6px 모서리
4. PnlTag    — 수익(그린)/손실(레드) 자동 색상
5. Input     — 언더라인 스타일, 라벨 포함
6. Divider   — 1px 구분선
7. BottomSheet — 하단에서 올라오는 모달, 핸들 바 포함
8. LoadingSpinner — API 호출 중 표시
9. EmptyState    — 데이터 없을 때 안내 문구+아이콘
10. SectionTitle — 섹션 제목 (15px bold)

모두 TypeScript로 작성, props 타입 정의 포함.
라이트/다크 모드 지원 (next-themes의 useTheme 사용).
```

### 15-5. 협업 규칙

**브랜치 전략**
```
main       → 배포용 (직접 push 금지)
develop    → 통합 (매일 저녁 push)
feature/auth          → A
feature/dashboard     → B
feature/trades        → A
feature/analysis      → B
feature/onboarding    → B
feature/claude-api    → A
```

**충돌 방지**
```
공유 파일 수정 전 반드시 상대방 확인:
  prisma/schema.prisma / auth.ts / lib/ / components/ui/

API Route     → 팀원 A 담당
Page 컴포넌트 → 팀원 B 담당
```

**주간 싱크**
```
월요일 30분 — 이번 주 목표
금요일 30분 — 완료 체크, 다음 주 조율
```

---

## 16. 운영 고려사항

**API 비용 관리**
- Claude API: 종목 분석 10회/일, 성향 리포트 3회/일 사용자별 제한
- 기업 소개: 티커당 영구 캐시 (`ticker_summary_cache`)
- 종목 분석: 당일 캐시 (`ticker_analysis_cache`)
- KIS 액세스 토큰: 서버 메모리 캐시 (재발급 방지)
- KRX 목록: 매일 새벽 갱신 배치

**보안 체크리스트**
- bcrypt saltRounds 12 이상
- JWT secret 최소 32바이트
- 모든 API Route에 `userId` 조건 필수
- `.env.local` git 커밋 금지 (`.gitignore` 확인)

**모니터링**
- Supabase 대시보드 — DB 용량·연결 수 확인
- Next.js 콘솔 로그로 오류 확인
- **매주 월요일 Supabase 대시보드 접속 확인** (7일 비활성 자동 중지 방지)

**대회 발표 전략**
```
① 공감 (30초)
   "저는 3년째 투자 매매일지를 노트에 수기로 써왔습니다."

② 문제 정의 (1분)
   기존 앱 한계 — 국내외 따로, 매매 이유 기록 없음, 성향 분석 없음

③ 데모 (3분)
   대시보드 → 매매일지 등록 → AI 성향 분석 리포트

④ 차별점 (30초)
   경쟁 서비스 비교표

⑤ 운영 계획 (30초)
   비용 추정 + 향후 기능
```

---

*프로젝트명: InvestLog | 개발팀: 2인 | 개발 도구: Claude Code | 실행: 로컬 (npm run dev) | DB: Supabase 클라우드*
