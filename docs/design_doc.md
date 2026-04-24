# 버텨일지 — 설계 문서
> 팀명: 김수현 · 최우철 | 프로젝트명: 버텨일지 | 작성일: 2026-04-24

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

---

## 2. 전체 아키텍처

```
[사용자 브라우저]
       │  localhost:3000 (또는 배포 URL)
       ▼
[Next.js 16 — App Router]
  ├── 프론트엔드 (React 컴포넌트 · Tailwind CSS · Recharts)
  └── 백엔드 API Routes (app/api/**)
       │
       ├─── Prisma ORM ──────────────▶ [Supabase PostgreSQL — 클라우드]
       │                                 ├── pooler (일반 쿼리)
       │                                 └── direct (마이그레이션 전용)
       │
       ├─── KIS Open API ────────────▶ 국내 현재가 · 섹터 조회
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
| 프레임워크 | Next.js (App Router) | 16.2 |
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
| `app/api/**` (30+ Route) | 계좌·종목·매매·예수금·AI·벤치마크 등 전체 백엔드 API |
| `src/lib/kis.ts` | KIS API 래퍼 · 액세스 토큰 메모리 캐시 |
| `src/lib/yahoo.ts` | yahoo-finance2 래퍼 |
| `src/lib/prompts.ts` | Claude API 프롬프트 5종 (기업 요약 · 종목 분석 · 성향 진단 Level 1·2 · 코칭 · OCR) |
| `src/lib/parseAiJson.ts` | AI 응답 JSON 파싱 헬퍼 (코드블록 + greedy 추출) |
| `src/lib/format.ts` | 숫자 · 날짜 포맷 유틸 |
| `components/ui/**` (17종) | Button · Card · BottomSheet · Skeleton 등 공통 UI 컴포넌트 |
| `prisma/schema.prisma` | DB 스키마 전체 (14개 모델) |
| `middleware.ts` | 인증 보호 라우트 · 리다이렉트 처리 |
| `auth.ts` | NextAuth 설정 (JWT · Credentials · Google · Kakao) |

---

## 4. 배포 구조 및 실행 방법

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

## 5. 운영 체크리스트

### 매일 시작 전

- [ ] [Supabase 대시보드](https://supabase.com/dashboard) 접속 — 프로젝트 활성 상태 확인
  > ⚠️ 7일 이상 비활성 시 자동 일시 중지
- [ ] `git pull` — 팀원 작업 반영
- [ ] `npm run dev` — 서버 정상 기동 확인

### 개발 중

- [ ] KIS API 오류 시 → 서버 재시작 (토큰 자동 재발급)
- [ ] Claude API 사용량 한도 확인
  - 종목 분석: 사용자당 10회/일
  - AI 코칭: 사용자당 3회/일
  - 투자성향 진단: 사용자당 1회/일
- [ ] DB 스키마 변경 시 → `npx prisma migrate dev --name 변경내용` 실행 후 팀원 공유

### 발표 전 최종 점검

- [ ] `npm run build` — 빌드 오류 없는지 확인
- [ ] 테스트 계정 + 샘플 데이터 준비
- [ ] 라이트/다크모드 전환 확인
- [ ] PC · 모바일 반응형 레이아웃 확인
- [ ] 외부 API 정상 응답 확인 (KIS · Claude · R-ONE)
- [ ] `/slides` 발표 슬라이드 PDF 출력 확인
