import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── PATCH: 매매 기록 부분 수정 (태그, 심리, 메모) ──────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tradeId = parseInt(id, 10);
  if (isNaN(tradeId)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 본인 매매 기록인지 확인
  const trade = await prisma.tradeLog.findFirst({
    where: {
      id: tradeId,
      account: { userId: session.user.id },
    },
  });

  if (!trade) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { reasonTags, emotion, memo } = body;

  const updated = await prisma.tradeLog.update({
    where: { id: tradeId },
    data: {
      ...(reasonTags !== undefined && { reasonTags }),
      ...(emotion !== undefined && { emotion }),
      ...(memo !== undefined && { memo }),
    },
  });

  return Response.json(updated);
}
