# 🚀 AI 투자 관리 프로그램 — DB 스키마 v3.7
> 최종 업데이트: 2026-04-17 | 실제 `prisma/schema.prisma` 기준

---

## 9. 데이터베이스 설계

### 9-1. ERD 관계

```
users (onboardingDone)
  ├── nextauth_accounts (1:N)       ← OAuth 소셜 로그인 전용
  ├── sessions (1:N)
  ├── user_analysis_logs (1:N)      ← 사용자가 분석 본 종목 이력
  ├── monthly_asset_snapshots (1:N) ← 월별 자산 스냅샷 (자산 추이 차트)
  └── accounts [InvestAccount] (1:N)
        ├── holdings (1:N)          ← sectorAuto / sectorManual / tags
        ├── trade_log (1:N)         ← reasonTags / emotion / reasonMemo
        │     └── cash_log (1:1)   ← tradeLogId UNIQUE FK CASCADE (매매 시 자동 생성)
        ├── cash_balance (1:N)
        └── cash_log (1:N)          ← tradeLogId=NULL이면 순수 입출금

brokerage_company              ← 증권사 마스터 (InvestAccount.accountCode FK)
stock_master                   ← KRX 전체 종목 목록 (검색용, assetType 포함)
ticker_summary_cache           ← 기업 소개 AI 요약 영구 캐시
ticker_analysis_cache          ← AI 종목 분석 당일 캐시 (recentIssues 포함)
api_usage_log                  ← 사용자별 일일 Claude API 호출 횟수 + 토큰 사용량
personality_result             ← 투자성향 진단 마지막 결과 (재방문 시 즉시 표시)
coaching_history               ← AI 코칭 리포트 누적 이력
```

> **TradeLog ↔ CashLog 1:1 규칙**
> - 매매 등록 시 `CashLog`를 함께 생성하고 `cashLog.tradeLogId`로 연결
> - `TradeLog` 삭제 시 연결된 `CashLog` 자동 cascade 삭제
> - 순수 입출금(`type: IN/OUT`)은 `tradeLogId = null`로 단독 존재

---

### 9-2. Prisma 스키마 (전체)

```prisma
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
}

// ─── 금융기관 마스터 ──────────────────────────────────────────

// 증권사 목록 (InvestAccount.accountCode FK 대상)
// DB 테이블명: "BrokerageCompany"
model BrokerageCompany {
  code          String   @id                    // 증권사 코드 (PK) 예: "KI", "MI", "SA"
  name          String                          // 증권사명 예: "키움증권", "미래에셋증권"
  financialCode String                          // 금융기관 코드
  createdAt     DateTime @default(now())        // 등록 일시

  investAccounts InvestAccount[]                // 이 증권사에 등록된 계좌 목록
}

// ─── 인증 ────────────────────────────────────────────────────

// 서비스 사용자 계정
// DB 테이블명: "User"
model User {
  id             String    @id @default(cuid())  // 사용자 고유 ID (cuid 자동 생성)
  email          String    @unique               // 로그인용 이메일 (중복 불가)
  name           String?                         // 표시 이름 (선택)
  image          String?                         // 프로필 이미지 URL (소셜 로그인 시 자동 설정)
  emailVerified  DateTime?                       // 이메일 인증 일시 (소셜 로그인 시 자동 설정)
  password       String?                         // bcrypt 해시 비밀번호. 소셜 로그인이면 null
  provider       String?                         // 가입 방식: "credentials" | "google" | "kakao"
  onboardingDone Boolean   @default(false)       // 온보딩 완료 여부. false면 로그인 후 온보딩 화면 표시
  createdAt      DateTime  @default(now())       // 가입 일시
  updatedAt      DateTime  @updatedAt            // 마지막 수정 일시

  investAccounts InvestAccount[]        // 이 사용자가 등록한 투자 계좌 목록
  sessions       Session[]              // NextAuth 세션 목록
  oauthAccounts  Account[]              // 소셜 로그인 연결 정보 목록 (NextAuth 전용)
  analysisLogs   UserAnalysisLog[]      // 종목 분석 화면에서 본 종목 이력
  assetSnapshots MonthlyAssetSnapshot[] // 월별 자산 스냅샷
}

// NextAuth 소셜 로그인 연결 정보 (Google, Kakao 등) — 투자 계좌와 별개
// DB 테이블명: "nextauth_accounts"
model Account {
  id                String  @id @default(cuid()) // 소셜 계정 연결 고유 ID
  userId            String                       // 연결된 서비스 사용자 ID (User.id)
  type              String                       // 계정 유형: "oauth" | "oidc" 등
  provider          String                       // 소셜 제공자: "google" | "kakao"
  providerAccountId String                       // 소셜 제공자 측 계정 ID
  refresh_token     String?                      // OAuth 리프레시 토큰
  access_token      String?                      // OAuth 액세스 토큰
  expires_at        Int?                         // 액세스 토큰 만료 시각 (Unix timestamp)
  token_type        String?                      // 토큰 타입: "Bearer" 등
  scope             String?                      // 허용된 OAuth 스코프
  id_token          String?                      // OIDC ID 토큰
  session_state     String?                      // 세션 상태값

  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId]) // 동일 소셜 계정 중복 연결 방지
  @@map("nextauth_accounts")
}

// NextAuth JWT 세션 정보
// DB 테이블명: "Session"
model Session {
  id           String   @id @default(cuid()) // 세션 고유 ID
  sessionToken String   @unique              // 세션 토큰 (쿠키에 저장되는 값)
  userId       String                        // 세션 소유자 사용자 ID (User.id)
  expires      DateTime                      // 세션 만료 일시

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─── 서비스 도메인 ───────────────────────────────────────────

// 투자 계좌 (사용자당 여러 계좌 등록 가능) — Account(OAuth)와 분리
// DB 테이블명: "accounts"
model InvestAccount {
  id           Int      @id @default(autoincrement()) // 계좌 고유 ID
  userId       String                                 // ★ 데이터 격리 핵심 — 반드시 조회 조건에 포함
  accountCode  String                                 // 증권사 코드 (BrokerageCompany.code FK)
  memo         String?                                // 계좌명/메모 예: "연금저축", "미국주식용" (선택)
  createdAt    DateTime @default(now())               // 계좌 등록 일시

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  brokerageCompany BrokerageCompany  @relation(fields: [accountCode], references: [code])
  holdings         Holding[]         // 이 계좌의 보유 종목 목록
  tradeLogs        TradeLog[]        // 이 계좌의 매매 이력 목록
  cashBalances     CashBalance[]     // 이 계좌의 통화별 예수금 잔고
  cashLogs         CashLog[]         // 이 계좌의 입출금 이력 목록

  @@index([userId]) // userId 기준 빠른 조회를 위한 인덱스
  @@map("accounts")
}

// 보유 종목 현황 (계좌별 실시간 잔고)
// DB 테이블명: "Holding"
model Holding {
  id           Int      @id @default(autoincrement()) // 보유 종목 고유 ID
  accountId    Int                                    // 소속 계좌 ID (InvestAccount.id)
  ticker       String                                 // 종목 코드 예: "005930", "NVDA"
  name         String                                 // 종목명 예: "삼성전자", "NVIDIA Corp"
  country      String                                 // 상장 국가: "KR" (국내) | "US" (해외)
  avgPrice     Float                                  // 평균 매수 단가 (매수/추가매수 시 자동 재계산)
  quantity     Int                                    // 현재 보유 수량 (매수 시 증가, 매도 시 감소)

  // ── 섹터 & 태그 ─────────────────────────────────────────────
  sectorAuto   String?  // KIS/yahoo 자동 조회 섹터 (매수 등록 시 1회 저장, 수동 새로고침 가능)
  sectorManual String?  // 사용자가 직접 지정한 커스텀 섹터 (null이면 sectorAuto로 폴백)
  tags         String[] // 사용자 정의 분류 태그 배열 예: ["AI", "배당주", "성장주"]
  // ────────────────────────────────────────────────────────────

  updatedAt    DateTime @updatedAt // 마지막 수정 일시 (매수/매도 시 자동 갱신)

  account      InvestAccount  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([accountId, ticker]) // 동일 계좌 내 같은 종목 중복 등록 방지
  @@index([accountId])          // 계좌별 종목 조회 인덱스
}

// 매매 이력 (매수/매도 기록 — 핵심 테이블)
// DB 테이블명: "TradeLog"
model TradeLog {
  id          Int      @id @default(autoincrement()) // 매매 기록 고유 ID
  date        DateTime                               // 매매 실행 날짜
  accountId   Int                                    // 매매가 이루어진 계좌 ID (InvestAccount.id)
  ticker      String                                 // 매매 종목 코드 예: "005930", "NVDA"
  name        String                                 // 매매 종목명 예: "삼성전자"
  type        String                                 // 매매 유형: "BUY" (매수) | "SELL" (매도)
  price       Float                                  // 1주당 체결 단가
  quantity    Int                                    // 체결 수량

  // ── 매매 이유 & 심리 상태 ────────────────────────────────────
  // BUY 태그:  실적호조 | 기술적분석 | 저평가 | 테마/트렌드 | 분할매수 |
  //            신규진입 | 추가매수 | 배당목적 | 포트리밸런싱 | 지인추천 | 뉴스/공시
  // SELL 태그: 목표가달성 | 손절 | 고평가판단 | 실적악화 | 리스크헤지 |
  //            포트리밸런싱 | 현금필요 | 테마종료 | 추세이탈 | 장기미보유
  reasonTags  String[] // 매매 이유 태그 배열 (복수 선택 가능, 선택 안 해도 저장 가능)

  // 매매 당시 심리 상태: "확신" | "불안" | "FOMO" | "손절(감정적)" | "기계적"
  emotion     String?  // 심리 상태 (선택 입력 — 투자성향 분석의 핵심 데이터)

  reasonMemo  String?  // 매매 이유 자유 텍스트 메모 (선택 입력)
  memo        String?  // 일반 메모 (선택 입력)
  // ────────────────────────────────────────────────────────────

  createdAt   DateTime @default(now()) // 기록 생성 일시

  account     InvestAccount  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  cashLog     CashLog?       // 1:1 역방향 — 이 매매에 연결된 CashLog (cascade 삭제됨)

  @@index([accountId]) // 계좌별 매매 이력 조회 인덱스
  @@index([date])      // 날짜 기준 필터링 인덱스
}

// 예수금 현재 잔고 (계좌별·통화별 현금 잔고)
// DB 테이블명: "CashBalance"
model CashBalance {
  id        Int     @id @default(autoincrement()) // 예수금 잔고 고유 ID
  accountId Int                                   // 소속 계좌 ID (InvestAccount.id)
  currency  String                                // 통화: "KRW" (원화) | "USD" (달러)
  amount    Float                                 // 현재 잔고 금액 (매수 시 차감, 매도/입금 시 증가)

  account   InvestAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([accountId, currency]) // 계좌당 통화별 잔고는 1행만 유지
}

// 예수금 입출금 이력 (입출금 기록 — 가계부 역할)
// DB 테이블명: "CashLog"
model CashLog {
  id         Int      @id @default(autoincrement()) // 입출금 이력 고유 ID
  date       DateTime                               // 입출금 날짜
  accountId  Int                                    // 소속 계좌 ID (InvestAccount.id)
  type       String                                 // 구분: "IN" | "OUT" | "TRADE_BUY" | "TRADE_SELL"
  currency   String                                 // 통화: "KRW" (원화) | "USD" (달러)
  amount     Float                                  // 입출금 금액
  memo       String?                                // 메모 예: "3월 급여", "삼성전자 매수 50주" (선택)
  ticker     String?                                // 매매 연관 종목 코드 (TRADE_BUY/SELL 시 채움, 순수 입출금은 null)
  tradeLogId Int?     @unique                       // ★ TradeLog 1:1 FK — 매매 삭제 시 cascade 자동 삭제
  createdAt  DateTime @default(now())               // 기록 생성 일시

  account    InvestAccount  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  tradeLog   TradeLog?      @relation(fields: [tradeLogId], references: [id], onDelete: Cascade)

  @@index([accountId])   // 계좌별 입출금 이력 조회 인덱스
  @@index([tradeLogId])  // TradeLog 연결 조회 인덱스
}

// ─── 종목 검색 마스터 ────────────────────────────────────────

// KRX 전체 상장 종목 목록 (자동완성 검색용 — API 호출 없이 DB에서 빠르게 검색)
// DB 테이블명: "stock_master"
model StockMaster {
  ticker    String   @id      // 종목 코드 (PK) 예: "005930", "NVDA"
  name      String            // 종목명 예: "삼성전자", "NVIDIA Corp"
  market    String            // 상장 시장: "KOSPI" | "KOSDAQ" | "NASDAQ" | "NYSE" 등
  country   String            // 상장 국가: "KR" | "US"
  assetType String   @default("STOCK") // 자산 유형: "STOCK" | "ETF" 등
  updatedAt DateTime @updatedAt // 마지막 갱신 일시 (매일 새벽 배치로 갱신)

  @@index([name])  // 종목명 검색 성능 향상을 위한 인덱스
  @@map("stock_master")
}

// ─── 캐시 ────────────────────────────────────────────────────

// 기업 소개 한국어 요약 캐시 (Claude API — 티커당 평생 1회만 호출)
// DB 테이블명: "ticker_summary_cache"
model TickerSummaryCache {
  ticker    String   @id      // 티커 코드 (PK) 예: "NVDA", "005930"
  summaryKo String            // Claude API가 생성한 한국어 요약 (2~3줄)
  updatedAt DateTime @updatedAt // 마지막 갱신 일시

  @@map("ticker_summary_cache")
}

// AI 종목 분석 리포트 캐시 (Claude API — 당일 기준, 다음날 자동 갱신)
// DB 테이블명: "ticker_analysis_cache"
model TickerAnalysisCache {
  ticker          String   @id  // 티커 코드 (PK)
  recommendation  String        // AI 투자 의견: "BUY" | "HOLD" | "SELL"
  targetBuy       String        // AI 권장 매수가 범위 예: "$800~$850"
  targetSell      String        // AI 목표 매도가 범위 예: "$1,000~$1,100"
  swotStrength    String        // SWOT — 강점 (Strength)
  swotWeakness    String        // SWOT — 약점 (Weakness)
  swotOpportunity String        // SWOT — 기회 (Opportunity)
  swotThreat      String        // SWOT — 위협 (Threat)
  reasoning       String        // 투자 의견 근거 요약 (한국어 2~3문장)
  recentIssues    String   @default("") // 최근 호재·악재 요약 (호재:/악재: 2줄 형식)
  cachedDate      String        // 캐시 생성 날짜 "YYYY-MM-DD" — 오늘 날짜와 다르면 재호출
  updatedAt       DateTime @updatedAt // 마지막 갱신 일시

  @@map("ticker_analysis_cache")
}

// 사용자가 종목 분석 화면에서 본 종목 이력 (최근 본 종목 표시용)
// DB 테이블명: "user_analysis_logs"
model UserAnalysisLog {
  id        Int      @id @default(autoincrement()) // 로그 고유 ID
  userId    String                                 // 사용자 ID (User.id)
  ticker    String                                 // 본 종목 코드
  name      String                                 // 종목명
  country   String   @default("KR")                // 상장 국가
  createdAt DateTime @default(now())               // 조회 일시

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("user_analysis_logs")
}

// 월별 자산 스냅샷 (자산 추이 차트용 — 매월 1회 자동 적재)
// DB 테이블명: "monthly_asset_snapshots"
model MonthlyAssetSnapshot {
  id              Int      @id @default(autoincrement()) // 스냅샷 고유 ID
  userId          String                                 // 사용자 ID (User.id)
  date            DateTime @db.Date                      // 스냅샷 기준일 (월 1일)
  cashTotal       Float                                  // 총 예수금 (KRW 환산)
  investedAmount  Float                                  // 총 매수 원금
  evaluatedAmount Float                                  // 평가 금액
  usdRate         Float                                  // 스냅샷 시점 환율

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@map("monthly_asset_snapshots")
}

// Claude API 일일 호출 횟수 + 토큰 사용량 (사용자별 제한 관리 — Redis 없이 DB로 구현)
// DB 테이블명: "api_usage_log"
model ApiUsageLog {
  id           Int    @id @default(autoincrement()) // 로그 고유 ID
  userId       String                                // 호출한 사용자 ID (User.id)
  type         String                                // API 종류: "analysis" | "personality_summary" | "coaching" | "summary" | "import_analyze"
  date         String                                // KST 기준 날짜 "YYYY-MM-DD" (일별 카운트 리셋)
  count        Int    @default(0)                    // 해당 날짜 호출 횟수
  inputTokens  Int    @default(0)                    // 입력 토큰 누적 (관리자 비용 모니터링용)
  outputTokens Int    @default(0)                    // 출력 토큰 누적

  @@unique([userId, type, date]) // 사용자+API종류+날짜 조합으로 중복 방지
  @@map("api_usage_log")
}

// 투자성향 진단 마지막 결과 (재방문 시 즉시 표시 — Claude API 절약)
// DB 테이블명: "personality_result"
model PersonalityResult {
  id             Int      @id @default(autoincrement()) // 결과 고유 ID
  userId         String                                 // 사용자 ID
  dateKey        String                                 // 진단 날짜 KST "YYYY-MM-DD"
  type           String                                 // 투자자 유형명 예: "신중한 테마투자자"
  summary        String                                 // 유형 설명 (2~3문장)
  winRate        Float?                                 // 진단 시점 승률 (%) — null이면 Level 1
  avgHoldingDays Int?                                   // 평균 보유 기간 (일) — null이면 Level 1
  lossRatio      Float?                                 // 손절 비율 (%) — null이면 Level 1
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([userId, dateKey]) // 같은 날 재진단 시 덮어쓰기
  @@map("personality_result")
}

// AI 코칭 리포트 누적 이력 (사용자가 요청할 때마다 새 row 적재)
// DB 테이블명: "coaching_history"
model CoachingHistory {
  id        Int      @id @default(autoincrement()) // 이력 고유 ID
  userId    String                                 // 사용자 ID
  strengths String                                 // 잘하고 있는 점 (JSON 문자열 배열)
  mistakes  String                                 // 반복되는 실수 (JSON 문자열 배열)
  goals     String                                 // 이번 달 개선 목표 (JSON 문자열 배열)
  createdAt DateTime @default(now())               // 생성 일시

  @@index([userId])
  @@map("coaching_history")
}
```

---

### 9-3. 스키마 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-04-17 | `CashLog.ticker` 필드 추가 (매매 연관 종목 코드) |
| 2026-04-17 | `CashLog.tradeLogId` UNIQUE FK 추가 — TradeLog ↔ CashLog 1:1 cascade 구현 |
| 2026-04-17 | `TradeLog.cashLog` 역방향 relation 추가 |
| 2026-04-17 | `generator.previewFeatures = ["driverAdapters"]` 추가 |

---

*파일: `prisma/schema.prisma` | 적용 명령: `npx prisma migrate dev --name [name]`*
