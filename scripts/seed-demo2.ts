import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ─── 1. 유저 ──────────────────────────────────────────────────────────────
  let user = await prisma.user.findUnique({ where: { email: "demo2@demo.com" } });

  if (!user) {
    const hashed = await bcrypt.hash("1234567a!", 12);
    user = await prisma.user.create({
      data: {
        email: "demo2@demo.com",
        name: "김개미",
        password: hashed,
        provider: "credentials",
        onboardingDone: true,
      },
    });
    console.log("✅ 유저 생성:", user.id);
  } else {
    console.log("🔄 기존 데이터 초기화...");
    const accounts = await prisma.investAccount.findMany({ where: { userId: user.id } });
    for (const acc of accounts) {
      await prisma.tradeLog.deleteMany({ where: { accountId: acc.id } });
      await prisma.holding.deleteMany({ where: { accountId: acc.id } });
      await prisma.cashBalance.deleteMany({ where: { accountId: acc.id } });
      await prisma.cashLog.deleteMany({ where: { accountId: acc.id } });
    }
    await prisma.investAccount.deleteMany({ where: { userId: user.id } });
    await prisma.monthlyAssetSnapshot.deleteMany({ where: { userId: user.id } });
    await prisma.coachingHistory.deleteMany({ where: { userId: user.id } });
    await prisma.personalityResult.deleteMany({ where: { userId: user.id } });
    await prisma.user.update({ where: { id: user.id }, data: { onboardingDone: true } });
    console.log("✅ 초기화 완료, 유저:", user.id);
  }

  // ─── 2. 증권사 코드 ────────────────────────────────────────────────────────
  const brokerages = await prisma.brokerageCompany.findMany();
  const kiwoomCode = brokerages.find((b) => b.name.includes("키움"))?.code;
  const miraeCode  = brokerages.find((b) => b.name.includes("미래"))?.code;

  if (!kiwoomCode || !miraeCode) {
    console.error("❌ 키움/미래에셋 증권사 코드를 찾을 수 없습니다.");
    console.log("사용 가능한 코드:", brokerages.map((b) => `${b.code}=${b.name}`));
    return;
  }

  // ─── 3. 계좌 생성 ──────────────────────────────────────────────────────────
  const accKR = await prisma.investAccount.create({
    data: { userId: user.id, accountCode: kiwoomCode, memo: "국내주식 계좌" },
  });
  await prisma.cashBalance.create({
    data: { accountId: accKR.id, currency: "KRW", amount: 3000000 },
  });

  const accUS = await prisma.investAccount.create({
    data: { userId: user.id, accountCode: miraeCode, memo: "해외주식 계좌" },
  });
  await prisma.cashBalance.create({
    data: { accountId: accUS.id, currency: "USD", amount: 2500 },
  });
  console.log("✅ 계좌 생성: 키움(", accKR.id, "), 미래에셋(", accUS.id, ")");

  // ─── 4. 매매 기록 36건 ─────────────────────────────────────────────────────
  // 스토리 아크: FOMO 입문 (-6%) → 고점 추격 바닥 (-15%) → 버텨일지 시작 (-3%)
  //             → 원칙 수립 (+10%) → 안정화 (+15%) → 장기보유 (+25%)

  interface Trade {
    accountId: number;
    date: string;
    ticker: string;
    name: string;
    type: "BUY" | "SELL";
    price: number;
    quantity: number;
    reasonTags: string[];
    emotion: string;
    reasonMemo: string;
  }

  const trades: Trade[] = [
    // ═══ Phase 1 — FOMO 입문기 (2025.11) · 8건 ═══
    // 메모 없음. 일부 종목이 잠깐 반등하면서 "됐다" 착각. 월말 기준 -6%
    {
      accountId: accUS.id, date: "2025-11-04", ticker: "TSLA", name: "Tesla Inc",
      type: "BUY", price: 251.44, quantity: 4,
      reasonTags: ["테마·트렌드", "뉴스·공시"], emotion: "FOMO", reasonMemo: "",
    },
    {
      accountId: accUS.id, date: "2025-11-07", ticker: "NVDA", name: "NVIDIA Corp",
      type: "BUY", price: 148.88, quantity: 5,
      reasonTags: ["테마·트렌드", "지인추천"], emotion: "FOMO", reasonMemo: "",
    },
    {
      accountId: accKR.id, date: "2025-11-12", ticker: "102460", name: "이수페타시스",
      type: "BUY", price: 61200, quantity: 10,
      reasonTags: ["뉴스·공시", "테마·트렌드"], emotion: "FOMO", reasonMemo: "",
    },
    {
      accountId: accUS.id, date: "2025-11-14", ticker: "PLTR", name: "Palantir Technologies",
      type: "BUY", price: 71.96, quantity: 10,
      reasonTags: ["지인추천", "테마·트렌드"], emotion: "FOMO", reasonMemo: "",
    },
    {
      accountId: accKR.id, date: "2025-11-19", ticker: "012450", name: "한화에어로스페이스",
      type: "BUY", price: 318000, quantity: 2,
      reasonTags: ["뉴스·공시"], emotion: "불안", reasonMemo: "",
    },
    {
      accountId: accUS.id, date: "2025-11-21", ticker: "TSLA", name: "Tesla Inc",
      type: "BUY", price: 352.56, quantity: 2,
      reasonTags: ["추가매수"], emotion: "FOMO", reasonMemo: "",
    },
    {
      accountId: accUS.id, date: "2025-11-26", ticker: "MSTR", name: "MicroStrategy Inc",
      type: "BUY", price: 397.87, quantity: 1,
      reasonTags: ["테마·트렌드", "뉴스·공시"], emotion: "FOMO", reasonMemo: "",
    },
    {
      accountId: accKR.id, date: "2025-11-28", ticker: "005930", name: "삼성전자",
      type: "BUY", price: 107200, quantity: 15,
      reasonTags: ["저평가"], emotion: "불안", reasonMemo: "",
    },

    // ═══ Phase 2 — 고점 추격 + 수익률 바닥 (2025.12) · 7건 ═══
    // 손절 연속 + TSLA ATH 직전 고점 추격매수. 월말 기준 -15% (수익률 최저)
    {
      accountId: accUS.id, date: "2025-12-03", ticker: "MSTR", name: "MicroStrategy Inc",
      type: "SELL", price: 354.12, quantity: 1,
      reasonTags: ["손절"], emotion: "손절(감정적)",
      reasonMemo: "못 버티겠다 -11% 손절",
    },
    {
      accountId: accKR.id, date: "2025-12-05", ticker: "102460", name: "이수페타시스",
      type: "SELL", price: 51400, quantity: 10,
      reasonTags: ["손절", "추세이탈"], emotion: "손절(감정적)",
      reasonMemo: "물렸다. 기다려봤는데 더 빠질 것 같아서",
    },
    {
      accountId: accUS.id, date: "2025-12-10", ticker: "NVDA", name: "NVIDIA Corp",
      type: "BUY", price: 134.25, quantity: 3,
      reasonTags: ["추가매수", "저평가"], emotion: "불안",
      reasonMemo: "떨어졌으니까 더 사야하나... 모르겠다",
    },
    {
      accountId: accUS.id, date: "2025-12-12", ticker: "TSLA", name: "Tesla Inc",
      type: "SELL", price: 424.77, quantity: 2,
      reasonTags: ["고평가판단"], emotion: "불안",
      reasonMemo: "일단 수익 챙기자. 언제 빠질지 모르니까",
    },
    {
      accountId: accUS.id, date: "2025-12-19", ticker: "PLTR", name: "Palantir Technologies",
      type: "SELL", price: 76.07, quantity: 10,
      reasonTags: ["손절"], emotion: "손절(감정적)",
      reasonMemo: "트럼프 관세 뉴스 나오고 무서워서 팔았다",
    },
    {
      accountId: accKR.id, date: "2025-12-23", ticker: "005930", name: "삼성전자",
      type: "BUY", price: 115400, quantity: 10,
      reasonTags: ["저평가", "추가매수"], emotion: "불안",
      reasonMemo: "52주 신저 구간인데... 가치주니까 괜찮겠지",
    },
    {
      accountId: accUS.id, date: "2025-12-26", ticker: "TSLA", name: "Tesla Inc",
      type: "BUY", price: 477.60, quantity: 2,
      reasonTags: ["추가매수", "테마·트렌드"], emotion: "FOMO",
      reasonMemo: "ATH 눈앞이다. 유튜브에서 연말 $500 간다는 말 봤다. 지금이 진짜 마지막 기회인 것 같다",
    },

    // ═══ Phase 3 — 수익률 바닥 탈출 + 버텨일지 시작 (2026.01) · 7건 ═══
    // TSLA 고점매수 패닉셀 (-29%). "뭐가 잘못된 걸까" → 처음 메모 등장. 월말 -3%
    {
      accountId: accUS.id, date: "2026-01-06", ticker: "NVDA", name: "NVIDIA Corp",
      type: "BUY", price: 140.12, quantity: 2,
      reasonTags: ["분할매수", "저평가"], emotion: "기계적",
      reasonMemo: "이번엔 한 번에 몰아넣지 않고 3번 나눠서 살 계획. 오늘 1차",
    },
    {
      accountId: accUS.id, date: "2026-01-08", ticker: "TSLA", name: "Tesla Inc",
      type: "BUY", price: 394.74, quantity: 1,
      reasonTags: ["추가매수"], emotion: "불안",
      reasonMemo: "아직도 TSLA가 맞는 선택인지 모르겠다. 그냥 들고가야 하나",
    },
    {
      accountId: accUS.id, date: "2026-01-12", ticker: "TSLA", name: "Tesla Inc",
      type: "SELL", price: 336.40, quantity: 2,
      reasonTags: ["손절", "추세이탈"], emotion: "손절(감정적)",
      reasonMemo: "12월에 산 2주 -29%. 진짜 이러면 안 되는 줄 알면서 팔았다. 뭐가 잘못된 걸까",
    },
    {
      accountId: accKR.id, date: "2026-01-13", ticker: "005930", name: "삼성전자",
      type: "BUY", price: 136200, quantity: 5,
      reasonTags: ["분할매수", "저평가"], emotion: "기계적",
      reasonMemo: "매달 5주씩 분할매수 계획. 지금 역대 저점 구간",
    },
    {
      accountId: accUS.id, date: "2026-01-18", ticker: "NVDA", name: "NVIDIA Corp",
      type: "BUY", price: 136.89, quantity: 2,
      reasonTags: ["분할매수"], emotion: "기계적",
      reasonMemo: "2차 매수. 평단 낮추는 중. 3차는 130 이하에서",
    },
    {
      accountId: accKR.id, date: "2026-01-21", ticker: "012450", name: "한화에어로스페이스",
      type: "SELL", price: 368000, quantity: 2,
      reasonTags: ["목표가달성"], emotion: "확신",
      reasonMemo: "목표가 +15% 도달. 계획대로 익절. 처음으로 계획 지킴",
    },
    {
      accountId: accUS.id, date: "2026-01-28", ticker: "META", name: "Meta Platforms",
      type: "BUY", price: 679.12, quantity: 1,
      reasonTags: ["실적호조", "신규진입"], emotion: "기계적",
      reasonMemo: "실적 보고 들어감. 광고 매출 예상치 상회. 나스닥 비중 다양화",
    },

    // ═══ Phase 4 — 원칙 수립기 (2026.02) · 5건 ═══
    // 분할매수 완수, 실적 기반 진입. 월말 +10% 턴어라운드
    {
      accountId: accUS.id, date: "2026-02-03", ticker: "NVDA", name: "NVIDIA Corp",
      type: "BUY", price: 123.85, quantity: 3,
      reasonTags: ["분할매수"], emotion: "기계적",
      reasonMemo: "3차 매수 완료. 분할매수 계획 완수. 이제 추가매수 없음",
    },
    {
      accountId: accKR.id, date: "2026-02-07", ticker: "005930", name: "삼성전자",
      type: "BUY", price: 162400, quantity: 5,
      reasonTags: ["분할매수"], emotion: "기계적",
      reasonMemo: "2월 정기 분할매수",
    },
    {
      accountId: accUS.id, date: "2026-02-11", ticker: "PLTR", name: "Palantir Technologies",
      type: "BUY", price: 97.67, quantity: 5,
      reasonTags: ["실적호조", "신규진입"], emotion: "확신",
      reasonMemo: "Q4 실적 어닝서프라이즈. 11월에 손절했던 종목인데 이번엔 실적 보고 다시 진입",
    },
    {
      accountId: accUS.id, date: "2026-02-18", ticker: "META", name: "Meta Platforms",
      type: "BUY", price: 704.33, quantity: 1,
      reasonTags: ["실적호조", "추가매수"], emotion: "확신",
      reasonMemo: "광고 매출 +21% YoY. AI 인프라 투자 과도하다는 우려 있지만 실적이 증명함",
    },
    {
      accountId: accKR.id, date: "2026-02-25", ticker: "005380", name: "현대차",
      type: "BUY", price: 196000, quantity: 3,
      reasonTags: ["저평가", "배당목적"], emotion: "기계적",
      reasonMemo: "PER 4.2, 배당수익률 4.1%. 관세 우려로 눌린 것 같음. 장기 배당주 포지션",
    },

    // ═══ Phase 5 — 안정화 (2026.03) · 5건 ═══
    // 이란 전쟁 우려에도 패닉셀 없음. TSLA 리밸런싱. 월말 +15%
    {
      accountId: accKR.id, date: "2026-03-04", ticker: "005930", name: "삼성전자",
      type: "BUY", price: 182600, quantity: 5,
      reasonTags: ["분할매수"], emotion: "기계적",
      reasonMemo: "3월 정기 분할매수",
    },
    {
      accountId: accUS.id, date: "2026-03-07", ticker: "PLTR", name: "Palantir Technologies",
      type: "BUY", price: 94.22, quantity: 3,
      reasonTags: ["실적호조", "추가매수"], emotion: "확신",
      reasonMemo: "NATO 방산예산 확대. 이란 전쟁 우려로 방산 수요 증가. 정부 계약 파이프라인 강화 확인 후 추가",
    },
    {
      accountId: accUS.id, date: "2026-03-12", ticker: "TSLA", name: "Tesla Inc",
      type: "SELL", price: 285.17, quantity: 5,
      reasonTags: ["포트리밸런싱", "고평가판단"], emotion: "기계적",
      reasonMemo: "TSLA 비중이 너무 높음. AI 모멘텀 약화. 포트 리밸런싱으로 전량 매도",
    },
    {
      accountId: accUS.id, date: "2026-03-19", ticker: "NVDA", name: "NVIDIA Corp",
      type: "BUY", price: 117.93, quantity: 2,
      reasonTags: ["분할매수", "저평가"], emotion: "기계적",
      reasonMemo: "이란 전쟁 우려로 눌림. 실적 펀더멘털 변화 없음. 기회로 판단",
    },
    {
      accountId: accKR.id, date: "2026-03-27", ticker: "005380", name: "현대차",
      type: "BUY", price: 188500, quantity: 2,
      reasonTags: ["분할매수", "저평가"], emotion: "기계적",
      reasonMemo: "이란 전쟁 우려로 추가 하락. 2차 분할매수. 배당 받으면서 버팀",
    },

    // ═══ Phase 6 — 장기보유 전환 (2026.04) · 4건 ═══
    // 매매 빈도 최저. 관세 충격에도 흔들리지 않음. 월말 +25%
    {
      accountId: accKR.id, date: "2026-04-03", ticker: "005930", name: "삼성전자",
      type: "BUY", price: 197800, quantity: 5,
      reasonTags: ["분할매수"], emotion: "기계적",
      reasonMemo: "4월 정기 분할매수. 이제 매달 자동반사처럼 됨",
    },
    {
      accountId: accUS.id, date: "2026-04-07", ticker: "NVDA", name: "NVIDIA Corp",
      type: "BUY", price: 88.01, quantity: 3,
      reasonTags: ["분할매수", "저평가"], emotion: "기계적",
      reasonMemo: "이란 전쟁 여파로 -20% 급락. 놀랍도록 불안하지 않음. 분할매수 계획 있으니까",
    },
    {
      accountId: accUS.id, date: "2026-04-15", ticker: "META", name: "Meta Platforms",
      type: "BUY", price: 558.62, quantity: 1,
      reasonTags: ["분할매수", "저평가"], emotion: "기계적",
      reasonMemo: "AI 관련 우려 반영 과매도 구간. 3차 추가",
    },
    {
      accountId: accKR.id, date: "2026-04-22", ticker: "005380", name: "현대차",
      type: "BUY", price: 196500, quantity: 2,
      reasonTags: ["분할매수"], emotion: "기계적",
      reasonMemo: "3차. 배당 보면서 버팀",
    },
  ];

  for (const t of trades) {
    await prisma.tradeLog.create({
      data: {
        accountId: t.accountId,
        date: new Date(t.date),
        ticker: t.ticker,
        name: t.name,
        type: t.type,
        price: t.price,
        quantity: t.quantity,
        reasonTags: t.reasonTags,
        emotion: t.emotion,
        reasonMemo: t.reasonMemo || null,
        memo: t.reasonMemo || null,
      },
    });
  }
  console.log(`✅ 매매 기록 ${trades.length}건 생성`);

  // ─── 5. Holding 계산 ────────────────────────────────────────────────────────
  // 최종 보유: NVDA 20, PLTR 8, META 3, 삼성전자 45, 현대차 7

  const holdingMap = new Map<string, {
    accountId: number; ticker: string; name: string; country: string;
    totalBuyQty: number; totalBuyAmount: number; totalSellQty: number;
    sectorAuto: string;
  }>();

  const sectorMap: Record<string, string> = {
    "005930": "반도체",
    "005380": "자동차",
    "NVDA": "Technology",
    "PLTR": "Technology",
    "META": "Communication Services",
  };

  for (const t of trades) {
    const key = `${t.accountId}-${t.ticker}`;
    if (!holdingMap.has(key)) {
      holdingMap.set(key, {
        accountId: t.accountId,
        ticker: t.ticker,
        name: t.name,
        country: /^\d{6}$/.test(t.ticker) ? "KR" : "US",
        totalBuyQty: 0, totalBuyAmount: 0, totalSellQty: 0,
        sectorAuto: sectorMap[t.ticker] ?? "기타",
      });
    }
    const h = holdingMap.get(key)!;
    if (t.type === "BUY") {
      h.totalBuyAmount += t.price * t.quantity;
      h.totalBuyQty    += t.quantity;
    } else {
      h.totalSellQty   += t.quantity;
    }
  }

  let holdingCount = 0;
  for (const h of holdingMap.values()) {
    const remainQty = h.totalBuyQty - h.totalSellQty;
    if (remainQty <= 0) continue;

    const avgPrice = h.totalBuyAmount / h.totalBuyQty;
    await prisma.holding.create({
      data: {
        accountId: h.accountId,
        ticker: h.ticker,
        name: h.name,
        country: h.country,
        avgPrice: Math.round(avgPrice * 100) / 100,
        quantity: remainQty,
        sectorAuto: h.sectorAuto,
      },
    });
    holdingCount++;
    console.log(`  📈 ${h.name} (${h.ticker}): ${remainQty}주, 평단가 ${Math.round(avgPrice).toLocaleString()}`);
  }
  console.log(`✅ 보유종목 ${holdingCount}개 생성`);

  // ─── 6. 월별 자산 스냅샷 ────────────────────────────────────────────────────
  // 목표 수익률: -6% → -15%(바닥) → -3% → +10% → +15% → +25%
  // 아래 월말 종가는 목표 수익률을 역산해 설정한 데모용 가격입니다

  const monthlyPrices: Record<string, Record<string, number>> = {
    "2025-11": {
      "102460": 58000,    // 이수페타시스
      "012450": 312000,   // 한화에어로스페이스
      "005930": 104000,   // 삼성전자
      "TSLA":  255,
      "NVDA":  143,
      "PLTR":   68,
      "MSTR":  365,
    },
    "2025-12": {
      "012450": 298000,   // 한화에어로스페이스 (여전히 보유)
      "005930": 107000,
      "TSLA":  218,       // ATH 후 급락 → 15%+ 손실 구간
      "NVDA":  117,
    },
    "2026-01": {
      "005930": 129000,
      "TSLA":  248,
      "NVDA":  127,
      "META":  655,
    },
    "2026-02": {
      "005930": 167000,
      "005380": 194000,   // 현대차
      "TSLA":  257,
      "NVDA":  139,
      "PLTR":  100,
      "META":  710,
    },
    "2026-03": {
      "005930": 178000,
      "005380": 191000,
      // TSLA: Mar-12 전량 매도, 스냅샷 불필요
      "NVDA":  136,
      "PLTR":   99,
      "META":  700,
    },
    "2026-04": {
      "005930": 179000,
      "005380": 199000,
      "NVDA":  176,
      "PLTR":  103,
      "META":  732,
    },
  };

  const monthlyUsdRate: Record<string, number> = {
    "2025-11": 1468,
    "2025-12": 1444,
    "2026-01": 1451,
    "2026-02": 1440,
    "2026-03": 1504,
    "2026-04": 1475,
  };

  const months = Object.keys(monthlyPrices);
  const baseCashKRW = 3000000;
  const baseCashUSD = 2500;

  for (const month of months) {
    const [year, mon] = month.split("-").map(Number);
    const monthEnd    = new Date(year, mon, 0);
    const prices      = monthlyPrices[month];
    const usdRate     = monthlyUsdRate[month];

    const tradesUntil = trades.filter((t) => new Date(t.date) <= monthEnd);

    const holdings: Record<string, { qty: number }> = {};
    let cashDeltaKRW = 0;
    let cashDeltaUSD = 0;

    for (const t of tradesUntil) {
      if (!holdings[t.ticker]) holdings[t.ticker] = { qty: 0 };
      if (t.type === "BUY") {
        holdings[t.ticker].qty += t.quantity;
        /^\d{6}$/.test(t.ticker)
          ? (cashDeltaKRW -= t.price * t.quantity)
          : (cashDeltaUSD -= t.price * t.quantity);
      } else {
        holdings[t.ticker].qty -= t.quantity;
        /^\d{6}$/.test(t.ticker)
          ? (cashDeltaKRW += t.price * t.quantity)
          : (cashDeltaUSD += t.price * t.quantity);
      }
    }

    let evalKRW = 0, evalUSD = 0, investedKRW = 0, investedUSD = 0;

    for (const [ticker, h] of Object.entries(holdings)) {
      if (h.qty <= 0) continue;
      const price = prices[ticker] ?? 0;
      if (price === 0) continue;

      const buys  = tradesUntil.filter((t) => t.ticker === ticker && t.type === "BUY");
      const sells = tradesUntil.filter((t) => t.ticker === ticker && t.type === "SELL");
      const invested = buys.reduce((s, t) => s + t.price * t.quantity, 0)
                     - sells.reduce((s, t) => s + t.price * t.quantity, 0);

      if (/^\d{6}$/.test(ticker)) {
        evalKRW     += price * h.qty;
        investedKRW += invested;
      } else {
        evalUSD     += price * h.qty;
        investedUSD += invested;
      }
    }

    const currentCashKRW = baseCashKRW + cashDeltaKRW;
    const currentCashUSD = baseCashUSD + cashDeltaUSD;
    const cashTotal       = currentCashKRW + currentCashUSD * usdRate;
    const investedAmount  = investedKRW + investedUSD * usdRate;
    const evaluatedAmount = evalKRW + evalUSD * usdRate + cashTotal;
    const snapshotDate    = new Date(Date.UTC(year, mon - 1, 1));

    await prisma.monthlyAssetSnapshot.create({
      data: {
        userId: user.id,
        date: snapshotDate,
        cashTotal:       Math.round(cashTotal),
        investedAmount:  Math.round(investedAmount),
        evaluatedAmount: Math.round(evaluatedAmount),
        usdRate,
      },
    });

    const pnlRate = investedAmount > 0
      ? ((evalKRW + evalUSD * usdRate - investedAmount) / investedAmount * 100).toFixed(1)
      : "0";
    console.log(`📊 ${month} | 환율 ${usdRate} | 투자원금 ${Math.round(investedAmount).toLocaleString()} | 평가액 ${Math.round(evaluatedAmount).toLocaleString()} | 수익률 ${pnlRate}%`);
  }
  console.log("✅ 월별 자산 스냅샷 6개월 생성 완료");

  // ─── 7. AI 코칭 히스토리 3건 ────────────────────────────────────────────────
  const coachingData = [
    {
      createdAt: new Date("2026-01-15T09:00:00Z"),
      strengths: "이번 달 처음으로 매매 이유를 메모로 남기기 시작했어요\nNVDA 분할매수 계획을 세우고 1·2차를 실행했어요",
      mistakes: "FOMO 고점 추격 매수 후 패닉셀 패턴이 반복됩니다 (MSTR, TSLA 12월→1월)\nTSLA를 $477에 추가 매수 후 3주 만에 $336에 손절 → -29% 실현손실\n메모 없이 매매한 건이 전체의 75%입니다",
      goals: "이번 달은 매매 전 반드시 reasonMemo 한 줄 이상 작성하기\n충동이 느껴질 때 48시간 기다려보기",
    },
    {
      createdAt: new Date("2026-02-20T09:00:00Z"),
      strengths: "분할매수 3회 계획을 완수했어요 (NVDA)\n실적 기반 진입 비율이 늘었어요 (PLTR 재진입, META 진입)",
      mistakes: "아직 TSLA 비중이 포트의 30%로 과집중 상태입니다\n매도 타이밍을 감정으로 결정하는 경향이 남아있어요",
      goals: "TSLA 비중을 20% 이하로 조정하는 리밸런싱 계획 세우기\n목표가 사전 설정 후 도달 시 기계적 익절 연습",
    },
    {
      createdAt: new Date("2026-03-25T09:00:00Z"),
      strengths: "TSLA 리밸런싱을 실행했어요. 계획 실행력이 크게 향상됐습니다\n이란 전쟁 우려 구간에서도 패닉셀 없이 오히려 추가 매수했어요",
      mistakes: "배당주(현대차) 편입 근거가 다소 단순합니다. 기업 펀더멘털 분석 깊이를 늘려보세요",
      goals: "현대차 IR 자료 한 번 읽어보기\n4월에도 정기 분할매수 루틴 유지하기",
    },
  ];

  for (const c of coachingData) {
    await prisma.coachingHistory.create({
      data: {
        userId:    user.id,
        strengths: c.strengths,
        mistakes:  c.mistakes,
        goals:     c.goals,
        createdAt: c.createdAt,
      },
    });
  }
  console.log("✅ AI 코칭 히스토리 3건 생성");

  console.log("\n🎉 demo2 데이터 생성 완료!");
  console.log("   로그인: demo2@demo.com / 1234567a!");
  console.log("   수익률 아크: -6% → -15%(바닥) → -3% → +10% → +15% → +25%");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
