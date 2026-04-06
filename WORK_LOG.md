# 📋 InvestLog — 작업 로그

> 작업 끝날 때마다 날짜·담당자·내용 추가
> Claude Code에게 "오늘 작업 내용 WORK_LOG.md에 추가해줘" 라고 하면 자동 기록
> 오래된 항목은 WORK_LOG_archive.md로 이동

---

## 작성 규칙

```
## YYYY-MM-DD (팀원 A or B)

### ✅ 완료
- 구체적으로 무엇을 했는지

### 🔄 진행 중
- 아직 끝나지 않은 것

### ❌ 이슈 / 블로커
- 막힌 것, 해결이 필요한 것

### 📌 다음 작업
- 내일 이어서 할 것

### 🔗 API 완성 목록 (B에게 공유)
- POST /api/accounts — 완성, mock 제거해도 됨
```

---

## 2026-04-06 (팀원 B)

### ✅ 완료

**UI/UX 공통 컴포넌트 정리**
- BottomSheet 다크모드 수정 (하드코딩 → CSS 변수)
- Input 공통 컴포넌트 개선 (forwardRef, 다크모드, focus 하이라이트) + 전페이지 교체
- Select 공통 컴포넌트 생성 (open/close 자체 관리, hover 스타일)
- Toast 공통 컴포넌트 생성 (success/error variant)
- Logo 공통 컴포넌트 생성 (chart/ant variant)
- 유틸 함수 `lib/format.ts`로 통합 (formatKRW, fmtNum, stripNum 등 6개 페이지 중복 제거)
- 뒤로가기 `router.back()` 전페이지 통일
- formatKRW 콤마 포맷 적용 (1060.6만 → 1,060.6만)

**디자인 시스템 v1.0 적용**
- globals.css에 CSS 변수 30개+ 추가 (Brand/Semantic/Neutral)
- Pretendard 폰트 적용 (woff2 로컬)
- Primary 컬러 #05C072 → #2DB87A (웜그린), 수익 컬러 #05C072 독립
- 전체 페이지 하드코딩 컬러 → CSS 변수 전환 (30+ 파일)
- 공통 컴포넌트 디자인 스펙 업데이트 (Card 18px radius, Button shadow 등)
- 사이드바/네비 lucide 아이콘 통일, 이모지 전면 제거
- Button sm 사이즈 축소 + rounded-lg 통일
- 세그먼트 토글 PC/모바일/계좌상세 스타일 통일

**다크모드 개선**
- Tag/PnlTag/TypeBadge/MarketBadge/SummaryChips 다크모드 반투명 배경
- Button secondary/black 다크모드 Tailwind 클래스 전환
- 매매 등록 이유태그/심리상태 다크모드 텍스트 가독성 개선
- 사이드바/매매 등록 툴팁 다크모드 고정 다크 배경
- 총자산추이 차트 툴팁 다크모드 배경 수정
- 계좌 관리 삭제 버튼 다크모드 반투명
- 모바일 다크모드 토글 전페이지 추가 (대시보드/계좌/매매/분석/성향/프로필/계좌상세)
- 대시보드 PC 다크모드 토글 숨김 (사이드바 중복)

**대시보드 개선**
- 종목별 비중 도넛 차트 추가 (국내/해외 태그, 커스텀 툴팁)
- 총 자산 추이 라인 차트 추가 (월별 스냅샷, 더미/실데이터 분기)
- PC 2컬럼 레이아웃 적용
- 자산배분 바 세그먼트별 분리 + 디자인 시스템 컬러 통일
- 자산배분 타이틀 카드 밖으로 이동, 새로고침 버튼 제거 (히어로 중복)
- 요약 지표 모바일 폰트 반응형 + 자산배분 범례 2x2 그리드
- 계좌 0건 → "계좌 관리에서 추가하기" 버튼 + ?add=true 모달 연동
- 계좌 카드에 계좌명(memo) 표시
- 총자산추이 범례 원금 기준 점선 통일

**계좌 상세 개선**
- 수익률 뱃지 B안 적용 (흰색 불투명 배경 + 컬러 텍스트 + 방향 화살표)
- 외화/원화 토글 세그먼트 스타일 통일
- 마이너스 금액 부호 위치 수정 ($-175 → -$175)
- 캡처 불러오기 중복 버튼 제거 (종목 등록 바텀시트 안에 이미 있음)

**매매일지 개선**
- 매매 상세 바텀시트 추가 (클릭 → 태그/심리/메모 확인)
- 매매 상세에서 이유 태그/심리 상태/메모 수정 기능
- 매매 삭제 기능 (Holding 수량/평단가 역산 + 예수금 되돌리기 + CashLog 삭제)
- 수정/삭제 버튼 1행 배치
- 심리 상태 이모지 → SVG 아이콘 (확신/불안/FOMO/손절/기계적)
- 캘린더 토글 심플 아이콘, 캘린더 오늘 기본 선택
- 캘린더 리스트 클릭 → 매매 상세 연동
- 캘린더/필터 버튼 높이 통일
- PC/모바일 세그먼트 토글 스타일 통일

**기타**
- 프로그램명 InvestLog → 버텨일지 통일
- 개미 로고 아이콘 적용 (사이드바/로그인/회원가입)
- 회원가입 완료 이모지 → SVG 체크 아이콘
- 온보딩 캡처 불러오기 이모지 → SVG 아이콘
- 성향 페이지 잠금/AI리포트/개선권고/감정분석 이모지 → SVG 아이콘
- 프로필에 로그아웃 버튼 추가 (테두리 스타일)
- 계좌 관리 모바일 FAB 추가, 상단 버튼 PC만 표시
- 바텀 네비 터치 영역 44px 확대
- 사이드바 z-40 추가 (툴팁 카드 뒤로 가는 문제)
- cursor-pointer 전페이지 통일

**API/DB 추가**
- `MonthlyAssetSnapshot` 스키마 + DB 테이블 생성
- `POST /api/asset-snapshot` — 당월 스냅샷 upsert
- `GET /api/asset-snapshot` — 전체 스냅샷 조회
- `PATCH /api/trades/[id]` — 매매 태그/심리/메모 수정
- `DELETE /api/trades/[id]` — 매매 삭제 + Holding/예수금 되돌리기
- Prisma db push + generate (recentIssues 필드 동기화)

### ❌ 남은 이슈
- 로그인/회원가입 다크모드 토글 없음 (영향도 낮음 — 5분)
- 바텀시트 슬라이드업 애니메이션 없음 (체감 품질 — 30분)
- 하드코딩 컬러 잔존 약 61곳 (기능 문제 없음 — 1시간)
- 스켈레톤 로딩 미적용 (스피너 → 콘텐츠 전환 갑작스러움 — 2시간)

### 📌 다음 작업
- 남은 이슈 4건 처리
- 전체 페이지 최종 QA
- 발표 자료 정리

---

## 2026-04-02 (팀원 B)

### ✅ 완료
- 대시보드 UI 개선
  - 자산배분 해외주식 색상 계좌상세 태그 색상과 통일 (#34D399 → #4285F4)
  - 시세 조회 실패 시 평단가 폴백 수정 (외화 평가금 미표시 버그)
  - 총보유자산·수익금 원화 소수점 제거
- 계좌상세 페이지 개선
  - 종목 카드에 현재가 조회 + 평가금(수량×현재가) + 수익률 표시
  - 삭제 모달 버튼 크기 통일
  - quotes 중복 선언 제거
- 계좌관리 페이지 개선
  - 예수금 원화/외화 동일 스타일 표시
  - 계좌추가 증권사 선택 초기화 버그 수정
- 매매일지 페이지 개선
  - 매매등록 모달에 날짜 입력 추가 (기본 오늘, 변경 가능)
  - 매매등록/필터 드롭다운에 증권사+계좌명 표시
  - 매매 카드 컴팩트 레이아웃 (2줄 구성, 패딩·폰트 축소)
  - 카드에 매매일자·증권사명·계좌명 표시
- 종목 분석 페이지 (`/analysis`) — 신규 구현
  - 종목 검색 자동완성 (국내 DB + 해외 yahoo, 디바운스 300ms)
  - AI 기업 소개 카드 (종목명·거래소·섹터·산업·요약, 영구 캐시)
  - 기본 지표 (현재가·등락률·전일대비·기간 내 MDD)
  - MDD 차트 (Recharts LineChart + AreaChart 2단 구성, 날짜 직접 입력, 자연어 해석)
  - AI 종목 분석 리포트 (적정 매수·매도가 / SWOT / BUY·HOLD·SELL, 당일 캐시)
- 투자성향 분석 페이지 (`/analysis/personality`) — 신규 구현
  - 매매 10건 미만 잠금 화면 ("N건 더 필요해요")
  - 이유 태그 분포 바 차트
  - 이유별 평균 수익률 (Recharts 수평 BarChart)
  - 감정별 수익률 (이모지 + 수익률 리스트)
  - 보유 기간 패턴 (평균 보유일수 + 구간별 비율)
  - AI 투자 성향 리포트 (투자자 유형·잘하는 패턴·반복 실수·개선 권고, 3회/일 제한)
- 다크모드 지원 추가
  - next-themes 설치 및 ThemeProvider 적용 (class 기반)
  - globals.css Tailwind v4 `@custom-variant dark` 설정
  - ThemeToggle 컴포넌트 생성 (대시보드 헤더 환율 리프레시 옆 배치)
  - Card 컴포넌트 다크모드 배경 적용

### API 작업
- `GET /api/market/history` — MDD 차트용 히스토리컬 주가 (yahoo-finance2 chart)
- `GET /api/analysis/summary` — AI 기업 소개 요약 (Claude API, 영구 캐시)
- `GET /api/analysis/report` — AI 종목 분석 리포트 (Claude API, 당일 캐시)
- `GET /api/trades/analysis` — 매매 통계 (태그분포·이유별/감정별 수익률·보유기간)
- `GET /api/trades/analysis/ai-report` — AI 투자성향 리포트 (Claude API, 3회/일 제한)
- `POST /api/trades` — date 파라미터 지원 추가
- `GET /api/trades` — account.memo 포함하도록 수정

### 패키지 추가
- recharts (차트 라이브러리)
- @anthropic-ai/sdk (Claude API)
- next-themes (다크모드)

### 📌 다음 작업
- 반응형 마무리 및 UX 개선
- 버그 수정 및 테스트

---

## 2026-04-01 (팀원 B)

### ✅ 완료
- 로그인 페이지 (`app/(auth)/login/page.tsx`) — 설계안 기준 전면 재작업
  - 로고 아이콘 56px 그린 + 서비스명 (카드 바깥 상단 배치)
  - 에러 메시지 빨간 배경 배너 스타일
  - onboardingDone 체크 → /onboarding 또는 / 분기 리다이렉트
  - 이미 로그인 시 자동 리다이렉트
  - LoadingSpinner 적용
  - 다크모드 전체 지원
- 회원가입 페이지 (`app/(auth)/register/page.tsx`) — 설계안 기준 전면 재작업
  - 2단계 스텝 구조: Step 1 (입력) → Step 2 (🎉 완료)
  - 비밀번호 확인 필드 추가 + 유효성 검사 (8자 미만 / 불일치 / 이메일 중복 409)
  - 시작하기 버튼 → 자동 로그인 후 /onboarding 이동
  - 다크모드 / LoadingSpinner / 에러 배너 적용
- 온보딩 페이지 (`app/onboarding/page.tsx`) — 신규 작성
  - Step 1: 계좌 & 종목 등록 (계좌 복수 추가, 증권사 선택, 예수금 KRW/USD, 종목 검색 자동완성, 평단가/수량/섹터/태그)
  - Step 2: 첫 매매 기록 (매수/매도 토글, 이유 태그 다중 선택)
  - 반응형: max-w-2xl 중앙 정렬
  - 완료 시 POST /api/onboarding/bulk 호출
- 대시보드 페이지 (`app/(dashboard)/page.tsx`) — 신규 작성
  - 섹션 1: 인사말 + 그린 그라디언트 히어로 카드 (총 자산, 전일 대비 배지, 미니 카드 3개)
  - 섹션 2: 2x2 요약 지표 + 자산 배분 바 차트 + 새로고침 버튼
  - 섹션 3: 계좌 현황 카드 목록 (PnlTag, EmptyState)
  - API 미완성 대응: 배열 폴백 처리
  - 다크모드 / 반응형 / LoadingSpinner / 지연 시세 안내
- 대시보드 레이아웃 (`app/(dashboard)/layout.tsx`) — 신규 작성
  - PC: 아이콘 사이드바 (64px, sticky, 호버 툴팁, 활성 인디케이터)
  - 모바일: 바텀 네비 5탭 (홈/계좌/매매/분석/성향)
  - 프로필 아이콘 (클릭 시 로그아웃)
- 계좌 목록 페이지 (`app/(dashboard)/accounts/page.tsx`) — 신규 작성
  - 계좌 카드: 증권사명 / 종목 수 / 예수금 / 국내·해외 Tag
  - [+ 계좌 추가] → BottomSheet 모달 (PC 중앙, 모바일 바텀)
  - 카드 클릭 → /accounts/[id] 이동
- 계좌 상세 페이지 (`app/(dashboard)/accounts/[id]/page.tsx`) — 신규 작성
  - 예수금 관리: 그린 그라디언트 카드 + [입금] [출금] 바텀시트
  - 보유 종목 리스트: 종목명·평단가·수량·평가금액·섹터·태그
  - 최근 매매 5건 + [전체 매매일지 보기 →] 링크
  - 섹터 분포 차트: [기본 섹터] / [내 섹터] 탭 전환
- BottomSheet 컴포넌트 수정 — PC 중앙 모달 / 모바일 바텀시트 반응형
- 나머지 페이지 플레이스홀더 추가 (trades, analysis, analysis/personality)

### API 작업 (팀원 A 영역이나 화면 테스트를 위해 최소 구현)
- `POST /api/onboarding/bulk` — onboardingDone 플래그 업데이트 (건너뛰기 대응)
- `GET/POST /api/accounts` — 계좌 목록 조회 / 계좌 추가
- `GET/POST /api/trades` — 매매 목록 (필터) / 매매 등록 (BUY: 평단가 재계산 + 예수금 차감, SELL: 수량 차감 + 예수금 증가, cashWarning)
- `GET/POST /api/cash` — 입출금 이력 / 입출금 처리

### 환경 세팅
- Prisma 클라이언트 생성 (`npx prisma generate`)
- prisma/schema.prisma에서 Prisma 7 비호환 url/directUrl 제거
- env 파일 정리: `.env.local` + `.env` 유지, `env` 삭제

### ❌ 이슈 / 블로커
- /api/market/search 미완성 → 종목 검색 자동완성은 API 완성 후 동작
- /api/market/quote 미완성 → 대시보드 현재가·환율 조회 불가 (평단가로 폴백)

### 📌 다음 작업
- 매매일지 페이지 (`/trades`) 본격 작업
- 종목 분석 페이지 (`/analysis`)
- 투자성향 분석 페이지 (`/analysis/personality`)

### 🔗 팀원 A에게 요청
- `GET /api/market/search` 종목 검색 API 완성 요청 (온보딩·매매 등록에서 사용)
- `GET /api/market/quote` 현재가 조회 API 완성 요청 (대시보드·계좌 상세에서 사용)
- `POST /api/onboarding/bulk` 트랜잭션 본구현 필요 (현재 onboardingDone만 업데이트)
