import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── DELETE: 계좌 삭제 ───────────────────────────────────
// 관련 holdings, tradeLogs, cashBalances, cashLogs는
// Prisma 스키마의 onDelete: Cascade로 자동 삭제됩니다.

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = parseInt(params.id, 10);
  if (isNaN(accountId)) {
    return Response.json({ error: "잘못된 계좌 ID입니다." }, { status: 400 });
  }

  // 본인 계좌인지 확인
  const account = await prisma.investAccount.findUnique({
    where: { id: accountId },
    select: { userId: true },
  });

  if (!account) {
    return Response.json({ error: "계좌를 찾을 수 없습니다." }, { status: 404 });
  }

  if (account.userId !== session.user.id) {
    return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  await prisma.investAccount.delete({ where: { id: accountId } });

  return Response.json({ success: true });
}
