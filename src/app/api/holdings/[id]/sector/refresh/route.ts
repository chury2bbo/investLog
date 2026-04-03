import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getYahooSector } from "@/lib/yahoo";
import { getKisSector } from "@/lib/kis";
import { NextRequest } from "next/server";

// POST /api/holdings/[id]/sector/refresh — sectorAuto 새로고침
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const holdingId = parseInt(id, 10);
  if (isNaN(holdingId)) {
    return Response.json({ error: "Invalid holding id" }, { status: 400 });
  }

  const holding = await prisma.holding.findFirst({
    where: { id: holdingId, account: { userId: session.user.id } },
  });

  if (!holding) {
    return Response.json({ error: "Holding not found" }, { status: 404 });
  }

  // 국내 → KIS, 해외 → Yahoo
  const isDomestic = /^\d{6}$/.test(holding.ticker);
  const sectorInfo = isDomestic
    ? { ...await getKisSector(holding.ticker), industry: null }
    : await getYahooSector(holding.ticker);

  const updated = await prisma.holding.update({
    where: { id: holdingId },
    data: {
      sectorAuto: sectorInfo.sector,
    },
  });

  return Response.json({
    sectorAuto: updated.sectorAuto,
    industry: sectorInfo.industry,
  });
}
