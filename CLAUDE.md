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
| AI 분석 | Claude API | `claude-sonnet-4-6` (단일 모델 — `lib/prompts.ts` `CLAUDE_MODEL` 상수) |
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

### Claude API 호출 (총 5종)
- 기업 소개 요약: 티커당 영구 캐시 (`ticker_summary_cache`), 제한 없음, max_tokens 512
- 종목 분석: 당일 캐시 (`ticker_analysis_cache`), 사용자당 10회/일, max_tokens 2048
- 투자성향 진단: 캐시 없음, 1회/일 통합 카운터, 마지막 결과는 `personality_result`에 저장
  - **Level 1** (보유 종목 1개+, 매매 5건 미만) — max_tokens 384, 보유 구성만 분석
  - **Level 2** (최근 6개월 매매 5건+) — max_tokens 1024, 매매 통계 + 보유 구성
- AI 코칭 리포트: 캐시 없음, 사용자당 3회/일, max_tokens 2048, 최근 6개월 매매 10건+
  - 결과는 `coaching_history`에 누적, 페이지에는 최근 5개 + 전체 보기 모달
- 스크린샷 분석: 캐시 없음, 제한 없음, max_tokens 2048
- **공통 규칙**:
  - 모든 응답 JSON 파싱은 `lib/parseAiJson.ts` 헬퍼 사용 (코드블록 + greedy 추출 + try/catch)
  - 사용량은 `api_usage_log`에 type별 누적 (count/inputTokens/outputTokens)
  - 날짜 키는 KST 기준 YYYY-MM-DD
  - 성향 진단·코칭·통계는 모두 **최근 6개월 매매**만 집계

### TradeLog ↔ CashLog 1:1 외래 키
- `cashLog.tradeLogId` (UNIQUE, FK CASCADE) — 매매 등록 시 같이 저장
- 매매 삭제 시 `tradeLog.delete`만 호출하면 cashLog 자동 cascade
- 매매와 무관한 입출금(`type: IN/OUT`)은 `tradeLogId = NULL`로 단독 존재

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
    accounts/            ← 계좌 관리
    accounts/[id]/       ← 계좌 상세
    trades/              ← 매매일지
    analysis/            ← 종목 분석
    personality/         ← 투자 성향 (진단 + 통계 + 코칭, 단일 페이지)
    profile/             ← 회원정보
    admin/               ← 관리자 (이메일 화이트리스트)
  api/
    auth/[...nextauth]/
    auth/register/
    accounts/            ← 계좌 CRUD
    holdings/            ← 종목 CRUD + 섹터 수동·자동
    trades/              ← 매매 CRUD (cashLog 1:1 외래 키)
    trades/[id]/         ← 매매 수정·삭제 (cashLog cascade)
    trades/analysis/     ← 통계 (최근 6개월)
    cash/                ← 예수금 입출금
    market/quote/        ← KIS + yahoo 주가 + USDKRW
    market/search/       ← 종목 검색 (DB + yahoo)
    market/history/      ← 시세 히스토리 (MDD)
    analysis/summary/    ← 기업 소개 (영구 캐시)
    analysis/report/     ← AI 종목 분석 (당일 캐시, 10회/일)
    analysis/history/    ← 분석 본 종목 이력
    analysis/quote/      ← 지표 + 차트 데이터
    personality/summary/ ← 투자성향 진단 Level 1·2 (1회/일 통합)
    personality/history/ ← AI 코칭 (3회/일)
    import/analyze/      ← 스크린샷 종목 추출 (Claude Vision)
    asset-snapshot/      ← 월별 자산 스냅샷
    user/me/             ← 사용자 정보 + 회원탈퇴
    admin/               ← 관리자 통계

components/ui/           ← 공통 컴포넌트 (Button, Card, BottomSheet, Skeleton 등 16종)
lib/                     ← KIS/yahoo 래퍼, prompts, parseAiJson, prisma, format 등
prisma/schema.prisma     ← DB 스키마
middleware.ts            ← dashboard 전체 인증 보호 + /analysis/personality → /personality 리다이렉트
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

## 📊 현재 진행 상태 (2026-04-10)

```
[x] 1주차 — 프로젝트 세팅 · Prisma · NextAuth · 공통 컴포넌트
[x] 2주차 — KIS/yahoo 래퍼 · KRX DB · 온보딩 UI
[x] 3주차 — 계좌·종목·예수금 API · 대시보드 · 계좌 상세
[x] 4주차 — 매매일지 API · 매매일지 UI
[x] 5주차 — Claude API 연동 · 종목 분석 화면 · MDD 차트
[x] 6주차 — 성향 통계 API · 투자 성향 페이지 (Level 1·2 + AI 코칭)
[x] 추가 — 관리자 페이지 · 스크린샷 종목 등록 · TradeLog↔CashLog 외래 키
[ ] 7주차 — 최종 QA · 반응형 마무리 · 발표 준비
[ ] 8주차 — 발표
```

**현재:** 발표 직전 단계 (코드 안정화 + 문서 정리)
**남은 작업:** 관리자 이메일 .env 이동, 빌드 검증, KIS API IP 확인, 최종 QA

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
보유 종목 1개 이상 → Level 1 투자성향 진단 (보유 구성 기반)
최근 6개월 매매 3건 이상  → 데이터로 보는 내 패턴 (이유/감정/섹터/보유기간 차트)
최근 6개월 매매 5건 이상  → Level 2 투자성향 진단 (매매 통계 + 통계 3칸)
최근 6개월 매매 10건 이상 → AI 코칭 리포트 생성 가능 (3회/일)
```

### 성향 페이지 구조 (단일 페이지)
- 히어로 카드: Level 1·2 자동 분기 (`personality.winRate == null` 여부로 판별)
- 데이터 패턴: 4개 탭 (매매 이유 / 감정 / 섹터 / 보유기간)
- AI 코칭: `coaching_history` 누적, 메인에 최근 5개 + 전체 보기 BottomSheet
- 페이지 진입 시 마지막 진단/코칭 1개 자동 펼침
