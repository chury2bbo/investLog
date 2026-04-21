import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getYahooSector } from "@/lib/yahoo";
import { getKisSector } from "@/lib/kis";

// ─── POST: 보유 종목 직접 등록 (예수금 차감 없음 — 온보딩과 동일) ───
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { accountId, ticker, name, country, avgPrice, quantity, replace } = body;

  if (!accountId || !ticker || !name || !avgPrice || !quantity) {
    return Response.json(
      { error: "필수 항목을 모두 입력해주세요." },
      { status: 400 }
    );
  }

  // 계좌 소유권 확인
  const account = await prisma.investAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    return Response.json(
      { error: "계좌를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 이미 같은 종목이 있으면 평단가 재계산
  const existing = await prisma.holding.findUnique({
    where: { accountId_ticker: { accountId, ticker } },
  });

  // sectorAuto 자동 조회: 국내 → KIS, 해외 → Yahoo
  let sectorAuto: string | null = null;
  if (!existing?.sectorAuto) {
    try {
      const isDomestic = /^\d{6}$/.test(ticker);
      const sectorInfo = isDomestic
        ? await getKisSector(ticker)
        : await getYahooSector(ticker);
      sectorAuto = sectorInfo.sector;
    } catch { /* 섹터 조회 실패 시 무시 */ }
  }

  let holding;
  try {
    if (existing) {
      if (replace) {
        holding = await prisma.holding.update({
          where: { id: existing.id },
          data: {
            avgPrice,
            quantity,
            ...(sectorAuto && !existing.sectorAuto ? { sectorAuto } : {}),
          },
        });
      } else {
        const totalQty = existing.quantity + quantity;
        const newAvgPrice =
          (existing.avgPrice * existing.quantity + avgPrice * quantity) / totalQty;

        holding = await prisma.holding.update({
          where: { id: existing.id },
          data: {
            avgPrice: newAvgPrice,
            quantity: totalQty,
            ...(sectorAuto && !existing.sectorAuto ? { sectorAuto } : {}),
          },
        });
      }
    } else {
      holding = await prisma.holding.create({
        data: {
          accountId,
          ticker,
          name,
          country: country || (/^\d{6}$/.test(ticker) ? "KR" : "US"),
          avgPrice,
          quantity,
          ...(sectorAuto ? { sectorAuto } : {}),
        },
      });
    }
  } catch (err: unknown) {
    console.error("holding upsert error:", err);
    const message = err instanceof Error ? err.message : "DB 오류";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json(holding, { status: 201 });
}
