// ─── 매매 이유 태그 ──────────────────────────────────────

export const BUY_REASON_TAGS = [
  { label: "실적호조", desc: "실적 개선 기대" },
  { label: "기술적분석", desc: "차트·지표 기반" },
  { label: "저평가", desc: "내재가치 대비 할인" },
  { label: "테마·트렌드", desc: "산업 트렌드 수혜" },
  { label: "분할매수", desc: "나눠서 매수" },
  { label: "신규진입", desc: "처음 매수" },
  { label: "추가매수", desc: "보유 중 추가 매수" },
  { label: "배당목적", desc: "배당 수익 목적" },
  { label: "성장주", desc: "장기 성장 기대" },
  { label: "포트리밸런싱", desc: "비중 조절" },
  { label: "지인추천", desc: "추천 받아 매수" },
  { label: "뉴스·공시", desc: "뉴스/공시 반응" },
] as const;

export const SELL_REASON_TAGS = [
  { label: "목표가달성", desc: "목표 수익 도달" },
  { label: "손절", desc: "추가 손실 방지" },
  { label: "고평가판단", desc: "과대 평가 판단" },
  { label: "실적악화", desc: "실적 부진" },
  { label: "리스크헤지", desc: "리스크 축소" },
  { label: "포트리밸런싱", desc: "비중 조절" },
  { label: "현금필요", desc: "현금 확보" },
  { label: "테마종료", desc: "테마 소멸" },
  { label: "추세이탈", desc: "기술적 이탈" },
  { label: "장기미보유", desc: "장기 보유 불필요" },
] as const;

// ─── 심리 상태 ──────────────────────────────────────────

export const EMOTIONS = [
  { label: "확신" },
  { label: "불안" },
  { label: "FOMO" },
  { label: "손절" },
  { label: "기계적" },
] as const;
