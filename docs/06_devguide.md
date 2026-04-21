# 🚀 AI 투자 관리 프로그램 — 설계 문서
> 최종 업데이트: 2026-04-21 | 멀티유저 소규모 (~50명) · 2인 팀 · Claude Code 개발

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
[x] 수익률 비교 기능 — 총 수익률 카드 클릭 → BenchmarkSheet BottomSheet (KOSPI/S&P500/NASDAQ/BTC/금/달러/서울아파트 YTD)
[x] 한국부동산원 R-ONE API 연동 (서울아파트 주간 매매가격지수, REB_API_KEY .env.local)
[x] 모바일 필터 바 아이콘화 — "전체" → 2×2 그리드 SVG, "필터" 텍스트 → funnel SVG
[x] 필터 열림/닫힘 상태 시각 표시 (funnel 버튼 active 시 그린 배경)
[x] 매매일지 이유 태그 툴팁 다크모드 bg 색상 수정 (#1D2720)
[x] 매매 심리상태 — 등록 폼 6종 타일과 상세 뷰 동일 UI로 통일
[x] 투자성향 페이지 좌상단 뒤로가기 [<] 버튼 추가
[x] 다크모드 아이콘/뒤로가기 버튼 bg 제거 (전체 화면 — 대시보드·계좌·분석·성향 등)
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

### 15-3. 공통 컴포넌트 (팀원 A 먼저 생성 후 공유)

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

### 15-4. 협업 규칙

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
