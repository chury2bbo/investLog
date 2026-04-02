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
