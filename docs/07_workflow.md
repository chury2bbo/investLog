# 🚀 AI 투자 관리 프로그램 — 업무 흐름 정리 v1.2
> 최종 업데이트: 2026-04-10 | 2인 팀 · Claude Code 활용 개발

---

## 1. 팀 분업 & 협업 패턴

### 역할 분담

```
┌─────────────────────────────────────────────────────────┐
│  팀원 A (백엔드)              팀원 B (프론트엔드)          │
│  ─────────────────            ─────────────────────       │
│  app/api/**                   app/(dashboard)/**          │
│  prisma/schema.prisma         app/(auth)/**               │
│  lib/ (KIS·yahoo 래퍼)        app/onboarding/**           │
│  auth.ts · middleware.ts      components/**                │
│                                                           │
│  ── 공유 파일 (수정 전 상호 확인) ──                       │
│  prisma/schema.prisma · components/ui/** · lib/**          │
└─────────────────────────────────────────────────────────┘
```

### 실제 협업 흐름

```
① A가 API 선행 구현 → B가 UI에서 fetch 연동
   예: A가 /api/market/quote 완성 → B가 대시보드 현재가 조회 연동

② B가 UI 먼저 작업 (API 미완성 시 mock 또는 최소 구현)
   예: B가 매매일지 UI 작업 시 trades API 직접 최소 구현 → A가 나중에 보강

③ 동시 작업 시 영역 분리
   예: A가 API Route 수정 + B가 페이지 컴포넌트 수정 → 각자 push 후 pull
```

---

## 2. 개발 도구 & 프로세스

### Claude Code 활용 방식

```
세션 시작
  └ CLAUDE.md 자동 로드 (프로젝트 규칙·기술 스택·절대 규칙)
  └ 기능별 프롬프트 붙여넣기 (06_devguide.md §15-3 템플릿)
  └ 한 번에 1개 기능씩 완성 → 다음 진행

작업 중
  └ 코드 생성 → 확인 → 수정 요청 반복
  └ 오류 발생 시 에러 메시지 + 관련 파일 함께 전달
  └ "왜 이렇게 했어?" 질문으로 코드 이해 유지

작업 종료
  └ "오늘 작업 내용 WORK_LOG.md에 추가해줘" → 자동 기록
  └ git commit + push
```

### 브랜치 전략 (실제 운영)

```
master ─────────────────────────────────────────────→
  │                                                  
  ├── 팀원 A: 직접 push (API 작업)                    
  ├── 팀원 B: 직접 push (UI 작업)                     
  └── 충돌 시: git merge + 수동 해결 후 push           
                                                      
※ 설계 시 feature 브랜치 계획이 있었으나,
   2인 소규모 팀 + 빠른 반복 특성상 master 직접 운영으로 전환
```

### 작업 로그 관리

```
WORK_LOG.md
  └ 날짜·담당자별 작업 내용 기록
  └ ✅ 완료 / 🔄 진행 중 / ❌ 이슈 / 📌 다음 작업 / 🔗 API 완성 목록
  └ Claude Code에게 "WORK_LOG에 추가해줘" 명령으로 자동화
  └ 팀원 간 진행 상황 공유 (B가 A의 API 완성 여부 확인)
```

---

## 3. 일일 작업 흐름

### 개발 시작

```
1. Supabase 대시보드 접속 → 프로젝트 활성 상태 확인 (7일 비활성 중지 방지)
2. git pull → 상대방 작업 반영
3. npm run dev → localhost:3000 확인
4. WORK_LOG.md 확인 → 상대방 작업 내용·API 완성 목록 파악
5. Claude Code 세션 시작 → 기능별 프롬프트로 작업 진행
```

### 개발 중

```
기능 구현 → 로컬 테스트 → 버그 수정 → commit
  └ commit 메시지: 한글, 구체적 변경 내용 기술
  └ 예: "매매 상세 바텀시트 + 수정 기능, 버튼 통일, FAB 추가"

상대방 push 감지 시:
  └ git pull → 충돌 확인 → 머지 → 계속 작업
```

### 개발 종료

```
1. 최종 테스트 (라이트/다크모드, PC/모바일 반응형)
2. git add → commit → push
3. WORK_LOG.md 업데이트
4. 상대방에게 변경 사항 공유 (특히 공유 파일 수정 시)
```

---

## 4. 주차별 작업 구분

| 주차 | 팀원 A (백엔드) | 팀원 B (프론트엔드) | 산출물 |
|------|----------------|-------------------|--------|
| **1주 (04-01~02)** | 초기 세팅 + Prisma + NextAuth + 핵심 API 12개 | 인증 UI + 온보딩 + 대시보드 + 계좌 + 매매일지 + 분석 2종 | 전체 페이지 1차 구현 |
| **2주 전반 (04-03)** | 섹터 자동조회 + 예수금 로직 개선 | UI 개선 + 캘린더 + 차트 + 레이아웃 전환 | 기능 안정화 |
| **2주 후반 (04-06~07)** | 매매 수정·삭제 API + 자산 스냅샷 | 디자인 시스템 v1.0 + Skeleton + 팝업 통일 + 전면 리팩토링 | 디자인 완성 |
| **3주 전반 (04-08~09)** | AI 프롬프트 통합 + 성향 분석 강화 + 관리자 페이지 | 성향 독립 페이지 + 대시보드 위젯 + 매매 필터 강화 | 성향/관리자 완성 |
| **3주 후반 (04-10)** | 투자성향 Level 시스템 + TradeLog↔CashLog 외래 키 + 6개월 데이터 제한 + JSON 파싱 헬퍼 + 관리자/안정화 | 모바일 UI 통일 + 토글/스켈레톤 통일 + 잠금 카드 CTA + 다크모드 사이드바 정리 | 발표 준비 단계 |

---

## 5. 구현 완료 현황 (2026-04-10 기준)

### 페이지 (11개 — 전체 구현 완료)

| 페이지 | 경로 | 상태 |
|--------|------|------|
| 로그인 | `/login` | ✅ 완료 |
| 회원가입 | `/register` | ✅ 완료 |
| 온보딩 | `/onboarding` | ✅ 완료 |
| 통합 대시보드 | `/` | ✅ 완료 |
| 계좌 관리 | `/accounts` | ✅ 완료 |
| 계좌 상세 | `/accounts/[id]` | ✅ 완료 |
| 매매일지 | `/trades` | ✅ 완료 |
| 종목 분석 | `/analysis` | ✅ 완료 |
| 투자 성향 | `/personality` | ✅ 완료 (이전: `/analysis/personality`) |
| 회원정보 | `/profile` | ✅ 완료 |
| 관리자 | `/admin` | ✅ 완료 (이메일 화이트리스트) |

### API Route (30+ — 전체 구현 완료)

| 카테고리 | Route | 메서드 |
|----------|-------|--------|
| 인증 | `/api/auth/[...nextauth]` | GET/POST |
| | `/api/auth/register` | POST |
| 사용자 | `/api/user/me` | GET/PATCH/DELETE (회원탈퇴 시 personality_result/coaching_history/api_usage_log 정리) |
| 온보딩 | `/api/onboarding/bulk` | POST |
| 계좌 | `/api/accounts` | GET/POST |
| | `/api/accounts/[id]` | GET/PUT/DELETE |
| | `/api/brokerages` | GET |
| 보유종목 | `/api/holdings` | GET/POST |
| | `/api/holdings/[id]` | PUT/DELETE |
| | `/api/holdings/[id]/sector` | PUT |
| | `/api/holdings/[id]/sector/refresh` | POST |
| 매매 | `/api/trades` | GET/POST (cashLog 1:1 외래 키 동시 INSERT) |
| | `/api/trades/[id]` | PATCH/DELETE (cashLog cascade 자동 삭제) |
| | `/api/trades/analysis` | GET (최근 6개월) |
| 예수금 | `/api/cash` | GET/POST |
| 시세 | `/api/market/quote` | GET |
| | `/api/market/search` | GET |
| | `/api/market/history` | GET |
| 분석 | `/api/analysis/quote` | GET |
| | `/api/analysis/summary` | GET (영구 캐시) |
| | `/api/analysis/report` | GET (당일 캐시, 10회/일) |
| | `/api/analysis/history` | GET/POST |
| 성향/코칭 | `/api/personality/summary` | GET (Level 1·2 자동 분기, 1회/일 통합, `?last=true` 조회) |
| | `/api/personality/history` | GET/POST (AI 코칭, 3회/일) |
| AI 분석 | `/api/import/analyze` | POST (스크린샷 → 종목 추출, max_tokens 2048) |
| 기타 | `/api/asset-snapshot` | GET/POST (월별 스냅샷 자동) |
| 관리자 | `/api/admin` | GET (토큰/사용량/API 상태) |

### 공통 컴포넌트 (16종)

```
Button · Card · Tag · PnlTag · Input · Select · Divider
BottomSheet · Toast · ConfirmDialog
LoadingSpinner · Skeleton · EmptyState · SectionTitle · ThemeToggle
index.ts (Barrel Export)
```

### 외부 연동

| 연동 대상 | 용도 | 상태 |
|-----------|------|------|
| Supabase PostgreSQL | DB (클라우드 무료 티어, pooler+direct 분리) | ✅ 운영 중 |
| KIS Open API | 국내 현재가 + 섹터 조회 | ✅ 운영 중 |
| yahoo-finance2 | 해외 검색 + 주가 + 섹터 + USDKRW 환율 | ✅ 운영 중 |
| Claude API (claude-sonnet-4-6) | 기업 소개 / 종목 분석 / 성향 진단 Level 1·2 / AI 코칭 / 스크린샷 종목 추출 | ✅ 운영 중 |
| Google OAuth | 소셜 로그인 | ✅ 운영 중 |
| Kakao OAuth | 소셜 로그인 | ✅ 운영 중 |

---

## 6. 남은 작업 & 향후 계획

### 즉시 처리 필요 (발표 전)

```
⬜ 관리자 이메일 .env 이동 (현재 src에 하드코딩)
⬜ 빌드 검증 (npm run build) — 배포 전 필수
⬜ Vercel 배포 시 함수 maxDuration = 60 설정 (Claude 응답 timeout 대비)
⬜ KIS API IP 화이트리스트 정책 확인 (Vercel IP 동적)
⬜ 최종 QA (라이트/다크, PC/모바일, 모든 잠금 카드 / Level 1·2 분기)
```

### 발표 준비

```
⬜ 발표 자료 제작 (01~08 md 파일 참고)
⬜ 데모 시나리오 작성 (대시보드 → 매매 등록 → 종목 분석 → 성향 진단 → 코칭)
⬜ 테스트 계정 + 샘플 데이터 준비
⬜ 스크린샷 종목 등록 데모용 잔고 캡처 준비
```

---
