import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// ─── PUT: 계좌 수정 (증권사, 계좌명) ────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const accountId = parseInt(id, 10);
  if (isNaN(accountId)) return Response.json({ error: "잘못된 ID" }, { status: 400 });
  const body = await req.json();
  const { accountCode, accountNumber, memo } = body;

  // 소유권 확인
  const account = await prisma.investAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    return Response.json({ error: "계좌를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.investAccount.update({
    where: { id: accountId },
    data: {
      ...(accountCode ? { accountCode } : {}),
      accountNumber: accountNumber !== undefined ? accountNumber || null : undefined,
      memo: memo !== undefined ? memo || null : undefined,
    },
    include: {
      brokerageCompany: { select: { code: true, name: true } },
      holdings: true,
      cashBalances: true,
    },
  });

  return Response.json(updated);
}

// ─── DELETE: 계좌 삭제 (보유종목·매매이력·예수금 연쇄 삭제) ──

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const accountId = parseInt(id, 10);
  if (isNaN(accountId)) return Response.json({ error: "잘못된 ID" }, { status: 400 });

  // 소유권 확인
  const account = await prisma.investAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    return Response.json({ error: "계좌를 찾을 수 없습니다." }, { status: 404 });
  }

  // onDelete: Cascade로 holdings, tradeLogs, cashBalances, cashLogs 모두 삭제됨
  await prisma.investAccount.delete({
    where: { id: accountId },
  });

  return Response.json({ success: true });
}
