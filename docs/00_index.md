# 🚀 AI 투자 관리 프로그램 — 설계 문서 인덱스 v3.7

> 최종 업데이트: 2026-04-17 | 멀티유저 소규모 (~50명) · 2인 팀 · Claude Code 개발

---

## 모듈 구성

| 파일 | 포함 섹션 | 주요 내용 |
|------|-----------|-----------|
| `01_project.md` | §1 프로젝트 개요, §2 기술 스택 | 서비스 개요, 차별점, 기술 스택 |
| `02_ux_ui.md` | §3 UX 설계 원칙, §4 UI 가이드라인 | 수기 입력 철학, 온보딩, 컬러·레이아웃·컴포넌트 |
| `03_screens.md` | §5 핵심 화면 요구사항, §6 섹터 기능 설계 | 대시보드·계좌·매매일지·분석 화면, 섹터 설계 |
| `04_data_api.md` | §7 국내 주식 데이터 전략, §8 Claude API 호출 전략, §9 DB 설계 요약 | KRX/KIS/yahoo, Claude 캐시·비용·제한, ERD 요약 |
| `04-1_db_schema.md` | §9 DB 스키마 전체 | ERD 전체·Prisma 스키마(주석 포함)·변경 이력 |
| `05_auth_arch.md` | §10 인증 설계, §11 API 보안 패턴, §12 전체 아키텍처, §13 환경변수, §13-1 Supabase 설정 | NextAuth, 보안, 폴더 구조, 환경변수, Supabase 가이드 |
| `06_devguide.md` | §14 로드맵, §15 Claude Code 활용 가이드, §16 운영 고려사항 | 8주 로드맵(진행 상태 포함), 프롬프트 템플릿, 협업 규칙, 운영 |
| `07_workflow.md` | 업무 흐름 정리 | 개발 타임라인, 팀 분업, 일일 작업 흐름, 구현 현황 |
| `08_screen_flow.md` | 화면 업무 흐름 | 로그인→온보딩→대시보드→각 기능 화면별 사용자 흐름 |

---

## 작업 시 파일 선택 가이드

| 작업 내용 | 첨부할 파일 |
|-----------|-------------|
| 기술 스택 변경, 개요 수정 | `01_project.md` |
| UX 흐름, 온보딩, 화면 레이아웃, 컬러 수정 | `02_ux_ui.md` |
| 화면별 요구사항, 섹터 기능 수정 | `03_screens.md` |
| 데이터 소스, Claude API 전략·비용 수정 | `04_data_api.md` |
| DB 스키마, Prisma 모델 수정 | `04-1_db_schema.md` |
| 인증, 보안, 환경변수, Supabase 수정 | `05_auth_arch.md` |
| 로드맵, 프롬프트 템플릿, 협업 규칙 수정 | `06_devguide.md` |
| 업무 흐름, 개발 타임라인, 구현 현황 확인 | `07_workflow.md` |
| 화면 흐름, 사용자 시나리오, 데모 준비 | `08_screen_flow.md` |
| 전체 맥락 파악 (첫 대화 시작 시) | `00_index.md` + 해당 파일 |

---

## v3.7 변경 이력 (2026-04-17)

| 파일 | 주요 변경 |
|------|-----------|
| `04_data_api.md` | §9 DB 스키마를 `04-1_db_schema.md`로 분리, ERD 요약만 유지 |
| `04-1_db_schema.md` | **신규** — Prisma 스키마 전체 분리 독립. `CashLog.ticker` + `CashLog.tradeLogId` UNIQUE FK(CASCADE) + `TradeLog.cashLog` 역방향 relation + `generator.previewFeatures` 반영, 변경 이력 테이블 추가 |
| `06_devguide.md` | 로드맵 표에 완료/진행 상태 컬럼 추가, 추가 완료 항목(TradeLog↔CashLog·관리자·음성인식·신규 컴포넌트) 명시, 7주차 체크리스트 추가, B 공통 전제 컴포넌트·API 목록 현행화, 성향·프로필·임포트 페이지 경로 업데이트 |

## v3.6 변경 이력 (2026-04-10)

| 파일 | 주요 변경 |
|------|-----------|
| `01_project.md` | 핵심 차별점 6가지로 확장 (성향 진단/AI 코칭/SWOT/스크린샷), Claude 모델 `claude-sonnet-4-6` 명시 |
| `02_ux_ui.md` | Progressive Disclosure 단계 재정의 (Level 1·2 + AI 코칭), 모바일 2x2 그리드, 다크모드 사이드바 통일, 스크린샷 종목 등록 |
| `03_screens.md` | `/personality` 단일 페이지 (Level 1·2 히어로 + 데이터 패턴 + 코칭 히스토리), 종목 분석 호재/악재 라벨 분리, 관리자 페이지 추가 |
| `04_data_api.md` | Claude API 5종 분리, 6개월 데이터 제한, DB 모델 personality_result/coaching_history/user_analysis_logs/monthly_asset_snapshots 추가, TradeLog↔CashLog 1:1 외래 키 |
| `05_auth_arch.md` | NextAuth v5 (AUTH_URL/AUTH_SECRET) 환경변수, 미들웨어 코드 갱신, API Route 30+개 반영 |
| `06_devguide.md` | Next.js 16 / React 19 / Tailwind v4 명시, B 공통 전제 API 목록 갱신 |
| `07_workflow.md` | 3주차 작업 추가, 페이지 11개 / API 30+개 / 외부 연동 갱신, 발표 전 체크리스트 |
| `08_screen_flow.md` | 투자 성향 페이지 3단계 분기, 스크린샷 종목 등록 흐름, 관리자 페이지 흐름 추가 |

