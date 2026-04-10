# 🚀 InvestLog — CLAUDE.md
> 이 파일은 Claude Code가 세션 시작 시 자동으로 읽습니다.
> 새로운 규칙/결정사항이 생기면 이 파일에 바로 추가해주세요.

---

## 📌 프로젝트 한 줄 정의

**가계부형 수기 투자 관리 웹 서비스**
국내·해외 주식 통합 포트폴리오 관리 + 매매 이유 태그·심리 상태 기록 + Claude AI 투자성향 분석

> 핵심 철학: "수기 입력의 마찰 자체가 제품 가치"
> 자동화보다 기록하는 행위 자체가 투자 반성의 계기가 됨 — 자동화 제안 지양

---

## 🛠 기술 스택 (버전 고정)

| 구분 | 기술 | 버전/비고 |
|------|------|-----------|
| 프레임워크 | Next.js App Router | 16 |
| 언어 | TypeScript | strict 모드 |
| 스타일 | Tailwind CSS | - |
| 차트 | Recharts | - |
| 인증 | NextAuth.js | **v5** (v4와 API 다름 — 주의) |
| 비밀번호 | bcrypt | saltRounds: 12 |
| ORM | Prisma | - |
| DB | PostgreSQL | Supabase 클라우드 무료 티어 |
| 국내 주가 | KIS Open API | 개발자 계정 1개, 사용자 한투 계좌 불필요 |
| 해외 주가 | yahoo-finance2 | API 키 불필요 |
| AI 분석 | Claude API | claude-sonnet-4 |
| 다크모드 | next-themes | - |

---

## 🚨 절대 규칙 (반드시 지킬 것)

### 보안
```typescript
// ✅ 모든 API Route에 반드시 포함 — userId 조건 누락 시 타인 데이터 노출
const session = await auth();
if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

where: { account: { userId: session.user.id } }  // ← 격리 핵심
```
- 평문 비밀번호 저장 금지 — bcrypt 해시 필수
- `.env.local` git 커밋 절대 금지
- JWT secret 최소 32바이트

### 컴포넌트
- Server Component 기본 — `"use client"`는 꼭 필요한 곳에만
- 모든 컴포넌트는 함수형
- async/await 사용, 에러 핸들링 필수
- path alias: `@/` 사용

### 데이터 소스 (절대 혼용 금지)
```
국내 종목 검색 → DB 자체 검색 (KRX 사전 저장) — API 호출 금지
해외 종목 검색 → yahoo-finance2 search() API
국내 현재가    → KIS Open API
해외 현재가    → yahoo-finance2 quote()
```

### Claude API 비용
- 기업 소개 요약: 티커당 영구 캐시 (`ticker_summary_cache`)
- 종목 분석: 당일 캐시 (`ticker_analysis_cache`), 사용자당 10회/일 제한
- 투자성향 진단: 캐시 없음 — 사용자당 1회/일 제한 (`api_usage_log`)
- AI 코칭 리포트: 캐시 없음 — 사용자당 3회/일 제한 (`api_usage_log`)
- 스크린샷 분석: 캐시 없음, 제한 없음

---

## 👥 팀 분업 구조

| 담당 | 팀원 A | 팀원 B |
|------|--------|--------|
| 영역 | 백엔드 / API Route | 프론트 / 페이지 컴포넌트 |
| 주요 파일 | `app/api/**` `lib/**` `prisma/**` `auth.ts` | `app/(dashboard)/**` `app/onboarding/**` `components/**` |
| 공유 파일 | `prisma/schema.prisma` `components/ui/**` `lib/**` | ← 수정 전 반드시 상대방 확인 |

> 💡 B가 API 미완성 상태에서 UI 먼저 작업할 때는 mock data 사용
> 완성되면 WORK_LOG.md에 "API 완성" 명시 후 실제 fetch로 교체

---

## 📁 핵심 폴더 구조

```
app/
  (auth)/login/          ← 로그인
  (auth)/register/       ← 회원가입
  onboarding/            ← 가입 직후 1회
  (dashboard)/           ← middleware 인증 보호
    page.tsx             ← 통합 대시보드
    accounts/[id]/       ← 계좌 상세
    trades/              ← 매매일지
    analysis/            ← 종목 분석
    analysis/personality/← 투자성향 분석
  api/
    auth/[...nextauth]/
    auth/register/
    accounts/
    holdings/
    trades/
    cash/
    market/quote/        ← KIS + yahoo 주가
    market/search/       ← 종목 검색 (DB + yahoo)
    analysis/summary/    ← 기업 소개 AI 요약 (영구 캐시)
    analysis/report/     ← AI 종목 분석 (당일 캐시)
    trades/analysis/ai-report/ ← AI 성향 리포트

components/ui/           ← 공통 컴포넌트 (A가 먼저 생성)
lib/                     ← KIS 래퍼, yahoo 래퍼, 유틸 함수
prisma/schema.prisma     ← DB 스키마
middleware.ts            ← dashboard 전체 인증 보호
```

---

## 🎨 디자인 토큰

```
Primary:    #05C072 (그린)
Negative:   #F04452 (레드)
Background: #F5F7F5
Surface:    #FFFFFF
Text:       #1A221A
Dark BG:    #0D1210
Dark Card:  #1D2720
```

- 카드: 16px 모서리, 패딩 20px
- 버튼: Primary(그린) / Secondary(회색) / Black
- 모달: 바텀시트 스타일 (하단에서 올라오는 방식)
- 입력: 언더라인 스타일 (하단 라인만)
- UI 레퍼런스: `ui-mockup.jsx` 참고

---

## ⚡ 자주 쓰는 명령어

```bash
npm run dev                              # 개발 서버 실행 (localhost:3000)
npx prisma migrate dev --name [name]     # DB 스키마 변경 적용
npx prisma studio                        # DB 데이터 브라우저 확인 (localhost:5555)
npx prisma generate                      # Prisma 클라이언트 재생성
npx prisma db pull                       # 현재 DB 스키마 동기화 확인
```

> ⚠️ Supabase 7일 비활성 자동 중지 주의
> 월요일 개발 시작 전 https://supabase.com/dashboard 에서 프로젝트 활성 상태 확인

---

## 📊 현재 진행 상태

```
[ ] 1주차 — 프로젝트 세팅 · Prisma · NextAuth · 공통 컴포넌트
[ ] 2주차 — KIS/yahoo 래퍼 · KRX DB · 온보딩 UI
[ ] 3주차 — 계좌·종목·예수금 API · 대시보드 · 계좌 상세
[ ] 4주차 — 매매일지 API · 매매일지 UI
[ ] 5주차 — Claude API 연동 · 종목 분석 화면 · MDD 차트
[ ] 6주차 — 성향 통계 API · 투자성향 분석 화면
[ ] 7주차 — 버그 수정 · 반응형 · UX 마무리
[ ] 8주차 — 최종 점검 · 발표 준비
```

**현재:** 개발 시작 전 세팅 단계
**다음 작업:** 팀원 A — 프로젝트 초기화 / 팀원 B — clone 대기

---

## 🔴 팀원 A 작업 시 (백엔드 / API)

### 담당 영역
- `app/api/**` 모든 API Route
- `prisma/schema.prisma`
- `lib/` KIS 래퍼, yahoo 래퍼, 유틸
- `auth.ts` NextAuth 설정
- `middleware.ts`

### API Route 기본 템플릿
```typescript
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await prisma.모델.findMany({
    where: { account: { userId: session.user.id } }, // ← 반드시 포함
  });

  return Response.json(data);
}
```

### 예수금 처리 규칙
```
매수 → 예수금 차감 (부족 시 차단 아님 — cashWarning: true 반환)
매도 → 예수금 자동 증가
온보딩 종목 등록 → 예수금 무시 (holdings만 생성)
```

### KIS 토큰 관리
- 액세스 토큰 만료 전까지 서버 메모리 캐시
- KIS 장애 시 yahoo-finance2 폴백 (005930.KS 형식)

---

## 🔵 팀원 B 작업 시 (프론트 / UI)

### 담당 영역
- `app/(dashboard)/**` 모든 페이지 컴포넌트
- `app/onboarding/page.tsx`
- `app/(auth)/**` 로그인·회원가입 UI
- `components/**`

### 공통 컴포넌트 import 패턴
```typescript
import { Button }       from "@/components/ui/Button";
import { Card }         from "@/components/ui/Card";
import { Tag, PnlTag }  from "@/components/ui/Tag";
import { Input }        from "@/components/ui/Input";
import { BottomSheet }  from "@/components/ui/BottomSheet";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState }   from "@/components/ui/EmptyState";
```

### API 미완성 시 mock 패턴
```typescript
// TODO: API 완성되면 실제 fetch로 교체 — WORK_LOG.md 확인
const holdings = [
  { ticker: "005930", name: "삼성전자", avgPrice: 72000, quantity: 50 },
];
```

### ui-mockup.jsx → 실제 페이지 변환 시
```
ui-mockup.jsx 해당 컴포넌트 코드 붙여넣기 후:
- 하드코딩 더미 데이터 → 실제 API fetch로 교체
- next-themes useTheme으로 다크모드 처리
- TypeScript 타입 정의 추가
- LoadingSpinner, EmptyState 처리 추가
```

### Progressive Disclosure 조건
```
매매 5건 이상  → 섹터 차트, MDD 차트 노출
매매 10건 이상 → AI 투자성향 분석 버튼 활성화
```
