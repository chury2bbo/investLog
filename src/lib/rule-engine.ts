// 규칙 기반 종목 분석 엔진
// AI 분석 실패 시 폴백으로 사용되는 정량 지표 기반 분석 모듈

/** 규칙 엔진 입력 데이터 */
export interface QuoteMetrics {
  ticker: string;
  price: number;
  per: number | null;
  pbr: number | null;
  roe: number | null; // % 단위 (예: 18.2)
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  currency: string; // "원" | "USD"
}

/** 규칙 엔진 출력 (TickerAnalysisCache 스키마와 동일) */
export interface RuleEngineResult {
  recommendation: "BUY" | "HOLD" | "SELL";
  targetBuy: string;
  targetSell: string;
  swotStrength: string;
  swotWeakness: string;
  swotOpportunity: string;
  swotThreat: string;
  reasoning: string;
  recentIssues: string;
}

// ─── SWOT 생성 ───────────────────────────────────────────

interface SwotItems {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

function generateSwot(m: QuoteMetrics): SwotItems {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  // PER 기반
  if (m.per !== null) {
    if (m.per <= 10) {
      strengths.push(`PER ${m.per.toFixed(1)}배로 매우 저평가 구간 (시장 평균 대비 크게 낮음)`);
    } else if (m.per <= 15) {
      strengths.push(`PER ${m.per.toFixed(1)}배로 저평가 구간`);
    } else if (m.per >= 50) {
      weaknesses.push(`PER ${m.per.toFixed(1)}배로 과도한 고평가 부담 (실적 대비 주가 과열)`);
    } else if (m.per >= 30) {
      weaknesses.push(`PER ${m.per.toFixed(1)}배로 고평가 부담`);
    } else if (m.per >= 20) {
      // 중간 구간 — 약한 위험 신호
      threats.push(`PER ${m.per.toFixed(1)}배로 업종 평균 대비 다소 높은 수준`);
    }
  }

  // PBR 기반
  if (m.pbr !== null) {
    if (m.pbr < 0.5) {
      strengths.push(`PBR ${m.pbr.toFixed(2)}배로 자산가치 대비 크게 저평가 (청산가치 이하)`);
    } else if (m.pbr < 1) {
      strengths.push(`PBR ${m.pbr.toFixed(2)}배로 자산가치 대비 저평가`);
    } else if (m.pbr >= 5) {
      weaknesses.push(`PBR ${m.pbr.toFixed(2)}배로 자산가치 대비 과도한 프리미엄`);
    } else if (m.pbr >= 3) {
      weaknesses.push(`PBR ${m.pbr.toFixed(2)}배로 자산가치 대비 높은 프리미엄`);
    }
  }

  // ROE 기반
  if (m.roe !== null) {
    if (m.roe >= 20) {
      strengths.push(`ROE ${m.roe.toFixed(1)}%로 매우 높은 수익성 (우수한 자본 효율)`);
    } else if (m.roe >= 15) {
      strengths.push(`ROE ${m.roe.toFixed(1)}%로 높은 수익성`);
    } else if (m.roe >= 10) {
      strengths.push(`ROE ${m.roe.toFixed(1)}%로 양호한 수익성`);
    } else if (m.roe < 0) {
      weaknesses.push(`ROE ${m.roe.toFixed(1)}%로 적자 상태 (자본 잠식 우려)`);
    } else if (m.roe < 5) {
      weaknesses.push(`ROE ${m.roe.toFixed(1)}%로 낮은 수익성`);
    }
  }

  // 52주 고저 기반 — 기회
  if (m.fiftyTwoWeekLow !== null && m.price > 0) {
    const ratioFromLow = m.price / m.fiftyTwoWeekLow;
    if (ratioFromLow <= 1.1) {
      opportunities.push(
        `현재가가 52주 최저가(${formatNum(m.fiftyTwoWeekLow, m.currency)}) 대비 ${((ratioFromLow - 1) * 100).toFixed(0)}% 위로 바닥권 매수 기회`
      );
    } else if (ratioFromLow <= 1.2) {
      opportunities.push(
        `현재가가 52주 최저가(${formatNum(m.fiftyTwoWeekLow, m.currency)}) 대비 ${((ratioFromLow - 1) * 100).toFixed(0)}% 위로 저점 매수 기회`
      );
    }
  }

  // 52주 고저 기반 — 위협
  if (m.fiftyTwoWeekHigh !== null && m.price > 0) {
    const ratioFromHigh = m.price / m.fiftyTwoWeekHigh;
    if (ratioFromHigh >= 0.98) {
      threats.push(
        `현재가가 52주 최고가(${formatNum(m.fiftyTwoWeekHigh, m.currency)}) 대비 ${(ratioFromHigh * 100).toFixed(0)}% 수준으로 신고가 부근 과열 주의`
      );
    } else if (ratioFromHigh >= 0.9) {
      threats.push(
        `현재가가 52주 최고가(${formatNum(m.fiftyTwoWeekHigh, m.currency)}) 대비 ${(ratioFromHigh * 100).toFixed(0)}% 수준으로 고점 부담`
      );
    }
  }

  // 52주 범위 내 위치 기반 — 추가 기회/위협
  if (m.fiftyTwoWeekHigh !== null && m.fiftyTwoWeekLow !== null && m.price > 0) {
    const range = m.fiftyTwoWeekHigh - m.fiftyTwoWeekLow;
    if (range > 0) {
      const position = (m.price - m.fiftyTwoWeekLow) / range; // 0~1
      if (position <= 0.3) {
        opportunities.push(`52주 가격 범위 하위 ${(position * 100).toFixed(0)}% 구간에 위치 (반등 가능성)`);
      } else if (position >= 0.8) {
        threats.push(`52주 가격 범위 상위 ${(position * 100).toFixed(0)}% 구간에 위치 (조정 가능성)`);
      }
    }
  }

  // PER + ROE 조합 분석
  if (m.per !== null && m.roe !== null) {
    if (m.per <= 15 && m.roe >= 15) {
      opportunities.push(`저PER(${m.per.toFixed(1)}배) + 고ROE(${m.roe.toFixed(1)}%) 조합으로 가치투자 매력`);
    }
    if (m.per >= 30 && m.roe < 10) {
      threats.push(`고PER(${m.per.toFixed(1)}배) + 저ROE(${m.roe.toFixed(1)}%) 조합으로 실적 대비 과열`);
    }
  }

  return { strengths, weaknesses, opportunities, threats };
}

// ─── 추천 산출 ───────────────────────────────────────────

function calculateRecommendation(m: QuoteMetrics): "BUY" | "HOLD" | "SELL" {
  // 모든 지표 null → HOLD
  if (m.per === null && m.pbr === null && m.roe === null) {
    return "HOLD";
  }

  // BUY 조건: PER ≤ 15 AND PBR ≤ 1.5 AND ROE ≥ 10%
  const buyCondition =
    m.per !== null && m.per <= 15 &&
    m.pbr !== null && m.pbr <= 1.5 &&
    m.roe !== null && m.roe >= 10;

  if (buyCondition) return "BUY";

  // SELL 조건: PER ≥ 30 AND 현재가 ≥ 52주 최고가 × 0.95
  const sellCondition =
    m.per !== null && m.per >= 30 &&
    m.fiftyTwoWeekHigh !== null && m.price >= m.fiftyTwoWeekHigh * 0.95;

  if (sellCondition) return "SELL";

  return "HOLD";
}

// ─── 적정가 산출 ─────────────────────────────────────────

function calculateTargetPrices(m: QuoteMetrics): { targetBuy: string; targetSell: string } {
  let targetBuy: number;
  let targetSell: number;

  if (m.fiftyTwoWeekLow !== null) {
    targetBuy = Math.round(m.fiftyTwoWeekLow * 0.4 + m.price * 0.6);
  } else {
    targetBuy = Math.round(m.price * 0.9);
  }

  if (m.fiftyTwoWeekHigh !== null) {
    targetSell = Math.round(m.price * 0.4 + m.fiftyTwoWeekHigh * 0.6);
  } else {
    targetSell = Math.round(m.price * 1.15);
  }

  return {
    targetBuy: String(targetBuy),
    targetSell: String(targetSell),
  };
}

// ─── 근거 문구 생성 ─────────────────────────────────────

function buildReasoning(
  m: QuoteMetrics,
  recommendation: "BUY" | "HOLD" | "SELL",
  swot: SwotItems
): string {
  const lines: string[] = [];

  // 지표 수치 명시
  lines.push("【분석 지표】");
  if (m.per !== null) {
    lines.push(`• PER: ${m.per.toFixed(1)}배`);
  } else {
    lines.push("• PER: 조회 불가");
  }
  if (m.pbr !== null) {
    lines.push(`• PBR: ${m.pbr.toFixed(2)}배`);
  } else {
    lines.push("• PBR: 조회 불가");
  }
  if (m.roe !== null) {
    lines.push(`• ROE: ${m.roe.toFixed(1)}%`);
  } else {
    lines.push("• ROE: 조회 불가");
  }
  if (m.fiftyTwoWeekHigh !== null) {
    lines.push(`• 52주 최고: ${formatNum(m.fiftyTwoWeekHigh, m.currency)}`);
  } else {
    lines.push("• 52주 최고: 조회 불가");
  }
  if (m.fiftyTwoWeekLow !== null) {
    lines.push(`• 52주 최저: ${formatNum(m.fiftyTwoWeekLow, m.currency)}`);
  } else {
    lines.push("• 52주 최저: 조회 불가");
  }
  lines.push(`• 현재가: ${formatNum(m.price, m.currency)}`);

  // 추천 근거
  lines.push("");
  lines.push("【판단 근거】");

  if (m.per === null && m.pbr === null && m.roe === null) {
    lines.push("지표 데이터 부족으로 중립 의견");
  } else {
    const recLabel = recommendation === "BUY" ? "매수" : recommendation === "SELL" ? "매도" : "보유";
    lines.push(`종합 의견: ${recLabel} (${recommendation})`);

    if (swot.strengths.length > 0) {
      lines.push(`강점: ${swot.strengths.join(", ")}`);
    }
    if (swot.weaknesses.length > 0) {
      lines.push(`약점: ${swot.weaknesses.join(", ")}`);
    }
  }

  return lines.join("\n");
}

// ─── 유틸 ────────────────────────────────────────────────

function formatNum(value: number, currency: string): string {
  if (currency === "원") {
    return `${value.toLocaleString("ko-KR")}원`;
  }
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── 메인 분석 함수 ─────────────────────────────────────

export function analyzeByRules(metrics: QuoteMetrics): RuleEngineResult {
  const swot = generateSwot(metrics);
  const recommendation = calculateRecommendation(metrics);
  const { targetBuy, targetSell } = calculateTargetPrices(metrics);
  const reasoning = buildReasoning(metrics, recommendation, swot);

  return {
    recommendation,
    targetBuy,
    targetSell,
    swotStrength: swot.strengths.length > 0 ? swot.strengths.join(". ") + "." : "PER, PBR, ROE 등 주요 지표 데이터를 확인할 수 없어 강점 분석이 제한됩니다. 기업 공시 자료를 참고해주세요.",
    swotWeakness: swot.weaknesses.length > 0 ? swot.weaknesses.join(". ") + "." : "현재 확인 가능한 지표 범위 내에서 뚜렷한 약점이 감지되지 않았습니다.",
    swotOpportunity: swot.opportunities.length > 0 ? swot.opportunities.join(". ") + "." : "현재 주가 위치상 뚜렷한 매수 기회 신호가 감지되지 않았습니다.",
    swotThreat: swot.threats.length > 0 ? swot.threats.join(". ") + "." : "현재 주가 위치상 뚜렷한 위험 신호가 감지되지 않았습니다.",
    reasoning,
    recentIssues: "규칙 기반 분석으로 최근 이슈 정보는 제공되지 않습니다.",
  };
}
