# 🚀 AI 투자 관리 프로그램 — 설계 문서
> 최종 업데이트: 2026-04-20 | 멀티유저 소규모 (~50명) · 2인 팀 · Claude Code 개발

---

## 7. 국내 주식 데이터 전략

### 7-1. 데이터 소스 분리

```
종목 검색 (자동완성)
  국내 → DB 자체 검색 (KRX 목록 사전 저장 — API 호출 최소화)
  해외 → yahoo-finance2 search() API

현재가·차트 조회
  국내 → 한국투자증권 Open API (KIS)
  해외 → yahoo-finance2 quote() / chart()

섹터 자동 조회
  국내 → KIS Open API (bstp_kor_isnm 업종명)
  해외 → yahoo-finance2 quoteSummary() assetProfile.sector
```

**종목 검색 DB 저장 이유**: 검색은 타이핑할 때마다 호출되는 고빈도 요청. 매번 API 호출 시 느리고 호출 횟수 제한 위험. KRX 목록은 신규 상장·폐지 외엔 변하지 않아 DB 저장이 효율적.

### 7-2. KIS API 운영 구조

개발자(서비스 운영자) 한투 계좌 1개로 API 키 발급. **사용자는 한투 계좌 불필요**.

```
사용자 → Next.js API Route → KIS API (개발자 키) → 현재가 반환
```

- 사용량 제한: 초당 20건, 일 10만건 (소규모 서비스 충분)
- 액세스 토큰: 만료 전까지 서버 메모리 캐시 (재발급 방지)
- KIS 장애 시 폴백: yahoo-finance2 (005930.KS 형식) → 마지막 정상값 + "지연된 시세" 안내

### 7-3. 데이터 소스 최종 정리

| 기능 | 국내 (KR) | 해외 (US) |
|------|-----------|-----------|
| 종목 검색 | DB 자체 검색 (KRX) | yahoo-finance2 search() |
| 현재가·등락률 | KIS Open API | yahoo-finance2 quote() |
| 52주 최고·최저 | KIS Open API | yahoo-finance2 quote() |
| Forward PER·PBR | KIS Open API | yahoo-finance2 quoteSummary() |
| 차트 (MDD용) | KIS Open API 일봉 | yahoo-finance2 chart() |
| 섹터 정보 | KIS Open API (`bstp_kor_isnm`) | yahoo-finance2 `quoteSummary(assetProfile)` |
| 기업 소개 | KIS → Claude API 한국어 요약 | yahoo-finance2 → Claude API 요약 |

> 섹터 자동 조회: 종목 등록(POST /api/holdings), 매매 등록(POST /api/trades) 시 신규 종목이면 자동 조회하여 `sectorAuto`에 저장. 수동 새로고침은 POST /api/holdings/[id]/sector/refresh.

---

## 8. Claude API 호출 전략

### 8-1. 호출 포인트 전체

| # | 기능 | 트리거 | 캐시 | 일일 제한 | max_tokens |
|---|------|--------|------|-----------|-----------|
| ① | 기업 소개 한국어 요약 | 티커 최초 조회 | ✅ 영구 (`ticker_summary_cache`) | 없음 | 512 |
| ② | AI 종목 분석 리포트 | [분석 생성] 클릭 | ✅ 당일 (`ticker_analysis_cache`) | 10회/일 | 2048 |
| ③-A | **투자성향 진단 — Level 1** (보유 종목 기반 간이) | [AI 진단] 클릭 (매매 5건 미만 + 보유 종목 1개+) | ❌ (마지막 결과만 `personality_result`) | 1회/일 (Level 2와 통합) | **384** |
| ③-B | **투자성향 진단 — Level 2** (매매 패턴 기반 정밀) | [AI 진단] 클릭 (최근 6개월 매매 5건+) | ❌ (마지막 결과만 `personality_result`) | 1회/일 | 1024 |
| ④ | AI 코칭 리포트 | [코칭 생성] 클릭 (최근 6개월 매매 10건+) | ❌ 매번 새로 생성, 히스토리 누적 (`coaching_history`) | 3회/일 | 2048 |
| ⑤ | 스크린샷 종목 추출 | 이미지 업로드 | ❌ | 없음 | 2048 |

### 8-2. 투자성향 진단 레벨 시스템

성향 진단은 사용자 데이터 양에 따라 자동으로 레벨이 결정됩니다.

| 레벨 | 활성 조건 | 데이터 기간 | 분석 데이터 | 결과 정보 | max_tokens |
|------|-----------|------------|-------------|-----------|-----------|
| **Level 1** | 보유 종목 1개+ (매매 무관) | 현재 보유 상태만 | 총 종목 수 · 국내/해외 개수 · 예수금 비중 · 상위 3개 섹터 · 보유 종목 리스트(최대 15개) | 유형명 + 1문장 요약 (통계 3칸 없음) | **384** |
| **Level 2** | 매매 5건+ (최근 6개월 기준) | **최근 6개월 매매** + 현재 보유 | 매매 통계(승률·평균보유·손절비율) · 태그 분포(top 5) · 감정 분포 · 섹터 집중도 · 보유기간 분포 · 보유 종목 리스트 | 유형명 + 강점/약점 2문장 + 통계 3칸 | 1024 |

- 두 레벨은 같은 `personality_summary` 카운터를 공유 → **하루 1회만 호출 가능** (Level 1 본 다음 매매 추가하면 다음날 Level 2)
- Level 1 결과는 `personality_result`에 저장되며 `winRate`/`avgHoldingDays`/`lossRatio` = `null`
- 프론트엔드는 `winRate == null` 여부로 Level 1/2 구분하여 UI 표시 (Level 1엔 "보유 종목 기반" 라벨 + 안내 메시지)

### 8-3. AI 코칭 분석 데이터

AI 코칭 리포트는 **Level 2와 동일한 데이터 블록**을 사용합니다 (system prompt만 다름 — 코칭은 잘하는 점 / 반복 실수 / 개선 목표 도출에 집중).

- 데이터 기간: **최근 6개월 매매**
- 매매 건수 조건: 최근 6개월 **10건 이상**
- 결과 형식: `{ strengths[], mistakes[], goals[] }` 각 배열로 코칭 카드에 표시
- `coaching_history`에 누적 저장 (페이지 진입 시 최근 5개 노출 + 전체 히스토리 모달)

### 8-4. 캐시 전략

**① 기업 소개 — 영구 캐시**: 같은 티커는 평생 1회만 호출
**② 종목 분석 — 당일 캐시**: 같은 날 동일 티커 10명이 요청해도 1회만 호출, 다음날 갱신
**③ 투자성향 진단 — 캐시 없음**: 매번 최신 데이터로 재분석, 1회/일 제한으로 비용 통제. 단, 마지막 결과는 `personality_result`에 저장해 페이지 진입 시 즉시 표시 (`?last=true`)
**④ AI 코칭 — 캐시 없음**: 개인화·시계열 데이터라 캐시 불가. 결과는 `coaching_history`에 누적 저장
**⑤ 스크린샷 분석 — 캐시 없음**: 이미지 OCR 일회성 작업

### 8-5. 사용자별 일일 제한

```typescript
const DAILY_LIMITS = {
  analysis:             10,  // 종목 분석 (캐시 미스 시에만 차감)
  personality_summary:   1,  // 투자성향 진단 — Level 1·2 통합 카운터
  coaching:              3,  // AI 코칭 리포트
};
// DB의 api_usage_log 테이블로 관리 (Redis 없이)
// 날짜 키는 KST 기준 YYYY-MM-DD
// 모든 호출은 input/output 토큰 수까지 누적 저장 → 관리자 비용 모니터링
// 성향/코칭 데이터 조회는 모두 최근 6개월 매매로 제한 → 토큰 비용 통제 + 현재 성향에 가중치
```

### 8-6. 비용 추정 (claude-sonnet-4-6 기준)

| 시나리오 | 일 비용 | 월 비용 |
|----------|---------|---------|
| 사용자 10명 적극 사용 | ~$0.8 (~1,100원) | ~$24 (~33,000원) |
| 사용자 50명 적극 사용 | ~$3.5 (~4,800원) | ~$105 (~145,000원) |
| 실제 예상 (일부만 사용) | ~$0.3 (~410원) | ~$9 (~12,000원) |

> Level 1 진단은 max_tokens 384로 매우 가벼워 신규 사용자가 가입 직후 종목만 등록하고 진단해도 비용 부담이 거의 없음.

캐시 효과로 실제 비용은 추정의 30~50% 수준.

---

## 9. 데이터베이스 설계

> 📄 **DB 스키마 전체 내용은 별도 파일로 분리되었습니다.**
> → **[04-1_db_schema.md](04-1_db_schema.md)** 참고 (ERD · Prisma 스키마 전체 · 변경 이력)

### 9-1. ERD 요약

```
users
  └── accounts [InvestAccount] (1:N)
        ├── holdings (1:N)
        ├── trade_log (1:N) ←── cash_log (1:1, tradeLogId FK CASCADE)
        ├── cash_balance (1:N)
        └── cash_log (1:N, tradeLogId=null이면 순수 입출금)

brokerage_company / stock_master / ticker_*_cache /
api_usage_log / personality_result / coaching_history
```

### 9-2. Prisma 스키마

> 전체 스키마는 **[04-1_db_schema.md](04-1_db_schema.md)** 를 참고하세요.
> 실제 파일: `prisma/schema.prisma`

---

*문서 버전: v3.7 | 2026-04-17 | DB 스키마 → 04-1_db_schema.md 분리, CashLog·TradeLog 1:1 FK 반영*