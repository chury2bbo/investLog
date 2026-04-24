# 🚀 배포 구조 · 운영 체크리스트
> 최종 업데이트: 2026-04-24 | 로컬 실행 기반 · DB만 Supabase 클라우드

---

## 1. 전체 실행 구조

```
[로컬 PC] npm run dev
       │  Next.js App Router (localhost:3000)
       │  ├── 프론트엔드 (React 컴포넌트)
       │  └── 백엔드 API Routes (app/api/**)
       │
       ├─── Prisma ORM ──────────────▶ [Supabase PostgreSQL — 클라우드]
       │                                 ├── pooler (트랜잭션 모드, 일반 쿼리)
       │                                 └── direct (마이그레이션 전용)
       │
       ├─── KIS Open API ────────────▶ 국내 현재가 · 섹터 조회
       ├─── yahoo-finance2 ──────────▶ 해외 검색 · 주가 · 섹터 · USDKRW
       ├─── Claude API ──────────────▶ 기업 요약 · 종목 분석 · 성향 진단 · 코칭 · OCR
       ├─── 한국부동산원 R-ONE API ───▶ 서울 아파트 주간 지수 (벤치마크용)
       └─── Google / Kakao OAuth ────▶ 소셜 로그인
```

---

## 2. 기술 스택 분류

### 오픈소스 / 외부 솔루션

| 항목 | 솔루션 | 용도 |
|------|--------|------|
| 프레임워크 | Next.js 16 (App Router) | 프론트+백엔드 통합 |
| 인증 | NextAuth.js v5 | JWT · Google · Kakao |
| ORM | Prisma v7 | DB 접근 · 마이그레이션 |
| DB (클라우드) | Supabase PostgreSQL (무료 티어) | 데이터 저장 |
| 차트 | Recharts 3 | 자산 추이 · 섹터 · MDD 시각화 |
| 테마 | next-themes | 다크/라이트 모드 토글 |
| 해외 데이터 | yahoo-finance2 | API 키 불필요 |

### 외부 API (키 필요)

| API | 용도 | 제한 |
|-----|------|------|
| KIS Open API | 국내 주가 · 섹터 | 개발자 계정 1개, IP 화이트리스트 필요 |
| Claude API (`claude-sonnet-4-6`) | AI 분석 전체 | 유료, 사용량 제한 설정 |
| 한국부동산원 R-ONE | 서울 아파트 주간 지수 | 무료 공공 API |
| Google OAuth | 소셜 로그인 | Google Cloud Console 등록 |
| Kakao OAuth | 소셜 로그인 | Kakao Developers 등록 |

### 자체 개발 코드

| 파일/경로 | 내용 |
|-----------|------|
| `app/api/**` (30+ Route) | 전체 백엔드 API (계좌·종목·매매·예수금·AI·벤치마크 등) |
| `lib/kis.ts` | KIS API 래퍼 · 토큰 캐시 |
| `lib/yahoo.ts` | yahoo-finance2 래퍼 |
| `lib/prompts.ts` | Claude API 프롬프트 5종 |
| `lib/parseAiJson.ts` | AI 응답 JSON 파싱 헬퍼 |
| `lib/format.ts` | 숫자·날짜 포맷 유틸 |
| `components/ui/**` (17종) | 공통 UI 컴포넌트 |
| `prisma/schema.prisma` | DB 스키마 전체 |
| `middleware.ts` | 인증 보호 · 리다이렉트 |
| `auth.ts` | NextAuth 설정 |

---

## 3. 로컬 실행 방법

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 파일 생성 (.env.local)
# 아래 §4 환경변수 목록 참고

# 3. Prisma 클라이언트 생성
npx prisma generate

# 4. DB 마이그레이션 (최초 1회 또는 스키마 변경 시)
npx prisma migrate deploy

# 5. 개발 서버 실행
npm run dev
# → localhost:3000 접속
```

---

## 4. 환경변수 목록 (`.env.local`)

```env
# DB (Supabase)
DATABASE_URL=           # pooler 연결 문자열 (트랜잭션 모드)
DIRECT_URL=             # direct 연결 문자열 (마이그레이션용)

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=        # openssl rand -base64 32 로 생성 (32바이트 이상)

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Kakao OAuth
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

---

## 5. 운영 체크리스트

### 매일 시작 전

- [ ] [Supabase 대시보드](https://supabase.com/dashboard) 접속 — 프로젝트 활성 상태 확인
  > ⚠️ 7일 이상 비활성 시 자동 일시 중지됨
- [ ] `git pull` — 팀원 작업 반영
- [ ] `npm run dev` — 서버 정상 기동 확인 (localhost:3000)

### 개발 중

- [ ] KIS API 오류 발생 시 → 토큰 만료 여부 확인 (서버 재시작으로 자동 재발급)
- [ ] Claude API 사용량 한도 확인
  - 종목 분석: 사용자당 10회/일
  - AI 코칭: 사용자당 3회/일
  - 투자성향 진단: 사용자당 1회/일
- [ ] DB 스키마 변경 시 → `npx prisma migrate dev --name 변경내용` 실행 후 팀원에게 공유

### 발표 전 최종 점검

- [ ] `npm run build` — 빌드 오류 없는지 확인
- [ ] KIS API IP 화이트리스트에 발표 장소 IP 등록 여부 확인
- [ ] 테스트 계정 + 샘플 데이터 준비 (6개월 매매 데이터)
- [ ] 라이트/다크모드 전환 동작 확인
- [ ] PC · 모바일 반응형 레이아웃 확인
- [ ] 모든 외부 API 정상 응답 확인 (KIS · Claude · R-ONE)
- [ ] `/slides` 발표 슬라이드 PDF 출력 확인

### 주기적 관리

- [ ] 주 1회: Supabase 비활성 방지 접속
- [ ] KIS API 개발 계정 토큰 만료일 확인 (3개월 주기 갱신)
- [ ] Claude API 비용 모니터링 (Anthropic Console)
