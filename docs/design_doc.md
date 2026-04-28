# 버텨일지 — 설계 문서
> 팀명: 김수현 · 최우철 | 프로젝트명: 버텨일지 | 최종 수정: 2026-04-28

---

## 1. 프로젝트 개요

개인의 국내/해외 주식 포트폴리오와 예수금을 통합 관리하고, Claude API를 통해 종목 분석 인사이트 및 투자성향 진단·코칭 리포트를 제공하는 **가계부형 수기 투자 관리 웹 서비스**.

> **"수기 입력의 마찰 자체가 제품 가치"** — 자동화보다 기록하는 행위 자체가 투자 반성의 계기가 됨

| 항목 | 내용 |
|------|------|
| 서비스 규모 | 소규모 (지인/팀 내부용, ~50명) |
| 인증 방식 | 이메일+비밀번호 + 소셜 로그인 (Google / Kakao) |
| 데이터 격리 | 단일 DB, `userId` 컬럼 행 단위 격리 |
| 반응형 지원 | 모바일 + 데스크톱 · 다크모드 토글 |
| 개발 방식 | 2인 팀 · Claude Code 활용 |

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 통합 포트폴리오 | 국내·해외 종목 구분 없이 계좌별 보유 종목 · 수익률 통합 관리 |
| 매매일지 | 매매 이유 태그 + 심리 상태 + 자유 메모 — 가계부 방식 기록 |
| 캘린더 다이어리 | 날짜별 투자 메모 입력 (DailyMemo) — 캘린더 뷰에서 일별 기록 |
| 스크린샷 종목 등록 | 증권사 앱 캡처 이미지로 보유 종목 일괄 등록 (Claude Vision) |
| AI 투자성향 진단 | 매매 패턴 기반 투자자 유형 분류 (Level 1·2 자동 분기) |
| AI 코칭 리포트 | 잘하는 점 / 반복 실수 / 개선 목표 제시 · 히스토리 누적 |
| AI 종목 분석 | SWOT · 적정가 · 최근 호재/악재 요약 |
| 벤치마크 비교 | KOSPI · S&P500 · NASDAQ · BTC · 금 · 달러 · 서울아파트 YTD 비교 |

---

## 2. 전체 아키텍처

```
[사용자 브라우저]
       │  localhost:3000 (또는 배포 URL)
       ▼
[Next.js 16 — App Router]
  ├── 프론트엔드 (React 컴포넌트 · Tailwind CSS v4 · Recharts)
  └── 백엔드 API Routes (app/api/**)
       │
       ├─── Prisma ORM ──────────────▶ [Supabase PostgreSQL — 클라우드]
       │                                 ├── pooler (일반 쿼리)
       │                                 └── direct (마이그레이션 전용)
       │
       ├─── KIS Open API ────────────▶ 국내 현재가 · 섹터 조회 (재시도 3회 자가 치유)
       ├─── yahoo-finance2 ──────────▶ 해외 검색 · 주가 · 섹터 · 환율
       ├─── Claude API ──────────────▶ 기업 요약 · 종목 분석 · 성향 진단 · 코칭 · OCR
       ├─── 한국부동산원 R-ONE API ───▶ 서울 아파트 주간 지수 (벤치마크용)
       └─── Google / Kakao OAuth ────▶ 소셜 로그인
```

---

## 3. 기술 스택

### 오픈소스 / 프레임워크

| 항목 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16 |
| 언어 | TypeScript | strict 모드 |
| 스타일 | Tailwind CSS | v4 |
| 인증 | NextAuth.js | v5 |
| ORM | Prisma | v7 |
| 차트 | Recharts | 3 |
| 다크모드 | next-themes | - |
| 비밀번호 | bcrypt | saltRounds: 12 |

### 외부 API (솔루션)

| API | 용도 | 비용 |
|-----|------|------|
| Supabase PostgreSQL | 클라우드 DB | 무료 티어 |
| KIS Open API | 국내 현재가 · 섹터 | 무료 (개발자 계정) |
| yahoo-finance2 | 해외 주가 · 검색 · 환율 | 무료 |
| Claude API (`claude-sonnet-4-6`) | AI 분석 전체 | 유료 |
| 한국부동산원 R-ONE | 서울 아파트 주간 지수 | 무료 공공 API |
| Google OAuth | 소셜 로그인 | 무료 |
| Kakao OAuth | 소셜 로그인 | 무료 |

### 자체 개발 코드

| 경로 | 내용 |
|------|------|
| `app/api/**` (32+ Route) | 계좌·종목·매매·예수금·AI·벤치마크 등 전체 백엔드 API |
| `src/lib/kis.ts` | KIS API 래퍼 · 액세스 토큰 메모리 캐시 · 섹터 조회 재시도 |
| `src/lib/yahoo.ts` | yahoo-finance2 래퍼 |
| `src/lib/prompts.ts` | Claude API 프롬프트 5종 (기업 요약 · 종목 분석 · 성향 진단 Level 1·2 · 코칭 · OCR) |
| `src/lib/parseAiJson.ts` | AI 응답 JSON 파싱 헬퍼 (코드블록 제거 + greedy 추출) |
| `src/lib/format.ts` | 숫자 · 날짜 포맷 유틸 |
| `src/lib/constants.ts` | 매매 이유 태그 · 감정 상태 상수 |
| `components/ui/**` (19종) | Button · Card · BottomSheet · Skeleton · Tooltip 등 공통 UI 컴포넌트 |
| `prisma/schema.prisma` | DB 스키마 전체 (18개 모델) |
| `middleware.ts` | 인증 보호 라우트 · 리다이렉트 처리 |
| `auth.ts` | NextAuth 설정 (JWT · Credentials · Google · Kakao) |

---

## 4. DB 스키마 (18개 모델)

| 모델 | 용도 | 주요 필드 |
|------|------|-----------|
| `User` | 사용자 계정 | id · email · password · provider · onboardingDone · assetGoal |
| `Account` | NextAuth OAuth 계정 | userId · provider · providerAccountId |
| `Session` | 세션 관리 | sessionToken · userId · expires |
| `BrokerageCompany` | 증권사 목록 | code · name · financialCode |
| `InvestAccount` | 투자 계좌 | userId · accountCode · accountNumber · memo |
| `Holding` | 보유 종목 | accountId · ticker · name · country · avgPrice · quantity · sectorAuto · sectorManual |
| `TradeLog` | 매매 거래 내역 | date · accountId · ticker · type · price · quantity · reasonTags · emotion · reasonMemo · currency |
| `CashBalance` | 계좌별 예수금 | accountId · currency · amount |
| `CashLog` | 입출금 내역 | date · accountId · type · currency · amount · tradeLogId |
| `DailyMemo` | 캘린더 일별 메모 | userId · date · content |
| `StockMaster` | 종목 마스터 | ticker · name · market · country · assetType |
| `TickerSummaryCache` | 기업 요약 영구 캐시 | ticker · summaryKo |
| `TickerAnalysisCache` | AI 종목 분석 당일 캐시 | ticker · recommendation · targetBuy · targetSell · swot · recentIssues |
| `UserAnalysisLog` | 종목 분석 조회 이력 | userId · ticker · name · country · createdAt |
| `MonthlyAssetSnapshot` | 월별 자산 스냅샷 | userId · date · cashTotal · investedAmount · evaluatedAmount · usdRate |
| `PersonalityResult` | 투자 성향 진단 결과 | userId · dateKey · type · summary · winRate · avgHoldingDays · lossRatio |
| `CoachingHistory` | AI 코칭 누적 이력 | userId · strengths · mistakes · goals |
| `ApiUsageLog` | Claude API 사용량 | userId · type · date · count · inputTokens · outputTokens |

### TradeLog ↔ CashLog 1:1 외래 키
- `cashLog.tradeLogId` (UNIQUE, FK CASCADE) — 매매 등록 시 같이 저장
- 매매 삭제 시 `tradeLog.delete`만 호출하면 cashLog 자동 cascade
- 매매와 무관한 입출금(`type: IN/OUT`)은 `tradeLogId = NULL`로 단독 존재

---

## 5. API Route 목록

| 카테고리 | 경로 | 메서드 |
|---------|------|--------|
| **인증** | `/api/auth/[...nextauth]` | NextAuth 핸들러 |
| | `/api/auth/register` | POST (회원가입) |
| **계좌** | `/api/accounts` | GET · POST |
| | `/api/accounts/[id]` | GET · PATCH · DELETE |
| **보유 종목** | `/api/holdings` | GET · POST |
| | `/api/holdings/[id]` | PATCH · DELETE |
| | `/api/holdings/[id]/sector` | PATCH (수동 섹터) |
| | `/api/holdings/[id]/sector/refresh` | POST (섹터 자동 조회) |
| **매매** | `/api/trades` | GET · POST |
| | `/api/trades/[id]` | PATCH · DELETE |
| | `/api/trades/analysis` | GET (매매 통계) |
| | `/api/trades/memo` | GET · POST · PATCH (DailyMemo) |
| **예수금** | `/api/cash` | GET · POST |
| | `/api/cash/[id]` | DELETE |
| **시세** | `/api/market/quote` | GET (현재가 · 환율) |
| | `/api/market/search` | GET (종목 검색) |
| | `/api/market/history` | GET (시세 히스토리 · MDD) |
| **AI 분석** | `/api/analysis/summary` | GET (기업 요약 · 영구 캐시) |
| | `/api/analysis/report` | GET (종목 분석 · 당일 캐시) |
| | `/api/analysis/history` | GET (분석 조회 이력) |
| | `/api/analysis/quote` | GET (지표 + 차트 데이터) |
| **성향 · 코칭** | `/api/personality/summary` | GET · POST (진단 Level 1·2) |
| | `/api/personality/history` | GET · POST (코칭 리포트) |
| **자산** | `/api/asset-snapshot` | GET · POST |
| **가져오기** | `/api/import/analyze` | POST (스크린샷 OCR) |
| | `/api/onboarding/bulk` | POST (온보딩 종목 일괄 등록) |
| **기타** | `/api/benchmark` | GET (벤치마크 비교) |
| | `/api/brokerages` | GET (증권사 목록) |
| | `/api/user/me` | GET · DELETE |
| | `/api/admin` | GET (관리자 통계) |

---

## 6. 배포 구조 및 실행 방법

> **로컬 실행 기반** — Next.js 앱은 로컬 PC에서 `npm run dev`로 구동하며, DB만 Supabase 클라우드를 사용합니다.

### 환경변수 목록 (`.env.local`)

```env
# DB (Supabase)
DATABASE_URL=        # pooler 연결 문자열
DIRECT_URL=          # direct 연결 문자열 (마이그레이션용)

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=     # 32바이트 이상 랜덤 문자열

# Google / Kakao OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# KIS Open API
KIS_APP_KEY=
KIS_APP_SECRET=

# Claude API
ANTHROPIC_API_KEY=

# 한국부동산원 R-ONE
REB_API_KEY=
```

### 실행 방법

```bash
npm install                        # 패키지 설치
# .env.local 파일 생성 후 환경변수 입력
npx prisma generate                # Prisma 클라이언트 생성
npx prisma migrate deploy          # DB 마이그레이션 적용
npm run dev                        # 개발 서버 실행 → localhost:3000
```

---

## 7. Claude API 활용 상세

총 6가지 용도로 Claude API(`claude-sonnet-4-6`)를 호출하며, 용도별로 캐시 전략·사용 제한·토큰 수를 독립적으로 설계했습니다.

| # | 기능 | 호출 시점 | 캐시 전략 | 사용 제한 | max_tokens |
|---|------|-----------|-----------|-----------|------------|
| 1 | 기업 소개 요약 | 종목 분석 첫 조회 | 영구 캐시 (`ticker_summary_cache`) | 제한 없음 | 512 |
| 2 | AI 종목 분석 | 종목 분석 새로고침 | 당일 캐시 (`ticker_analysis_cache`) | 10회/일 (사용자당) | 2048 |
| 3 | 투자성향 진단 Level 1 | 보유 종목 1개+ | 캐시 없음 · 마지막 결과 저장 | 1회/일 통합 카운터 | 384 |
| 4 | 투자성향 진단 Level 2 | 최근 6개월 매매 5건+ | 캐시 없음 · 마지막 결과 저장 | 1회/일 통합 카운터 | 1024 |
| 5 | AI 코칭 리포트 | 최근 6개월 매매 10건+ | 캐시 없음 · 이력 누적 | 3회/일 (사용자당) | 2048 |
| 6 | 스크린샷 종목 추출 | 이미지 업로드 시 | 캐시 없음 | 제한 없음 | 2048 |

**공통 설계 원칙**
- 모든 AI 응답은 `lib/parseAiJson.ts` 헬퍼로 파싱 (코드블록 제거 + greedy JSON 추출 + try/catch)
- 사용량은 `api_usage_log` 테이블에 type별 누적 (count · inputTokens · outputTokens)
- 날짜 기준은 KST (한국 표준시) `YYYY-MM-DD`
- 성향 진단·코칭·통계 집계는 모두 **최근 6개월 매매 데이터**만 사용

---

## 8. 보안 설계

| 항목 | 설계 내용 |
|------|-----------|
| 인증 | NextAuth.js v5 JWT — 서버가 세션을 DB에 저장하지 않는 Stateless 구조 |
| 비밀번호 | bcrypt (saltRounds: 12) 해시 저장 — 평문 저장 절대 금지 |
| 데이터 격리 | 모든 API Route에서 `userId` 조건 필수 포함 — 타 사용자 데이터 접근 원천 차단 |
| 환경변수 | API 키 전체 `.env.local` 관리 — git 커밋 금지 (`.gitignore` 등록) |
| 인증 보호 | `middleware.ts`에서 `/dashboard/**` 전체 경로 인증 검사 |

---

## 9. 운영 체크리스트

### 외부 서비스 상태 확인

- [ ] **Supabase** — 대시보드에서 프로젝트 활성 상태 확인
  > ⚠️ 7일 이상 비활성 시 자동 일시 중지 — 주 1회 이상 접속 권장
- [ ] **KIS Open API** — 현재가 조회 정상 응답 확인 · 장애 시 yahoo-finance2 폴백 자동 적용 (최대 3회 재시도)
- [ ] **Claude API** — 종목 분석 · 성향 진단 · 코칭 정상 응답 확인

### API 사용량 모니터링

- [ ] `/admin` 관리자 페이지에서 사용자별 Claude API 호출 횟수 · 토큰 사용량 확인
  - 종목 분석: 사용자당 10회/일
  - AI 코칭: 사용자당 3회/일
  - 투자성향 진단: 사용자당 1회/일
- [ ] Anthropic Console에서 전체 비용 모니터링

### DB 관리

- [ ] 스키마 변경 시 → `npx prisma migrate dev --name 변경내용` 실행
- [ ] `npx prisma studio` — 데이터 브라우저로 DB 상태 확인 (localhost:5555)

### 보안 점검

- [ ] `.env.local` git 커밋 여부 확인 (`.gitignore` 등록 필수)
- [ ] KIS · Claude · OAuth API 키 만료 여부 주기적 확인
- [ ] NextAuth Secret 32바이트 이상 유지 확인

