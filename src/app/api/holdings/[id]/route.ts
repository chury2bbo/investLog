import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// ─── PUT: 평단가 / 수량 수정 ────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const holdingId = parseInt((await params).id);
  if (isNaN(holdingId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  // 소유권 확인
  const holding = await prisma.holding.findFirst({
    where: { id: holdingId, account: { userId: session.user.id } },
  });
  if (!holding) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { avgPrice, quantity } = body;

  if (typeof avgPrice !== "number" || typeof quantity !== "number") {
    return Response.json({ error: "avgPrice, quantity 필수" }, { status: 400 });
  }
  if (avgPrice <= 0 || quantity <= 0) {
    return Response.json({ error: "0보다 커야 합니다" }, { status: 400 });
  }

  const updated = await prisma.holding.update({
    where: { id: holdingId },
    data: { avgPrice, quantity },
  });

  return Response.json(updated);
}

// ─── DELETE: 보유 종목 삭제 ──────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const holdingId = parseInt((await params).id);
  if (isNaN(holdingId)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  // 소유권 확인
  const holding = await prisma.holding.findFirst({
    where: { id: holdingId, account: { userId: session.user.id } },
  });
  if (!holding) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.holding.delete({ where: { id: holdingId } });

  return Response.json({ success: true });
}
