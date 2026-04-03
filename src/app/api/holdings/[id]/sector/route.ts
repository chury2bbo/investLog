import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// PUT /api/holdings/[id]/sector — 내 섹터(sectorManual) + 태그 수정
export async function PUT(
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

  const body = await req.json();
  const { sectorManual, tags } = body;

  // 소유권 확인
  const holding = await prisma.holding.findFirst({
    where: { id: holdingId, account: { userId: session.user.id } },
  });

  if (!holding) {
    return Response.json({ error: "Holding not found" }, { status: 404 });
  }

  const updated = await prisma.holding.update({
    where: { id: holdingId },
    data: {
      ...(sectorManual !== undefined ? { sectorManual: sectorManual || null } : {}),
      ...(tags !== undefined ? { tags } : {}),
    },
  });

  return Response.json(updated);
}
