import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingDone: true, name: true, email: true, password: true },
  });

  return Response.json({
    onboardingDone: user?.onboardingDone ?? false,
    name: user?.name ?? "",
    email: user?.email ?? "",
    hasPassword: !!user?.password,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, currentPassword, newPassword } = await req.json();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  // 비밀번호 변경/설정 요청인 경우
  if (newPassword) {
    if (user?.password) {
      // 기존 비밀번호가 있는 경우 → 현재 비밀번호 확인 필수
      if (!currentPassword) {
        return Response.json({ error: "현재 비밀번호를 입력해주세요." }, { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return Response.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
      }
    }
    // 소셜 계정(password 없음)은 현재 비밀번호 없이 새로 설정 가능
  }

  const updateData: Record<string, string> = {};
  if (name !== undefined) updateData.name = name;
  if (newPassword) updateData.password = await bcrypt.hash(newPassword, 12);

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  return Response.json({ success: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // relation 없는 테이블 수동 삭제 (cascade 미적용 대상)
  await Promise.all([
    prisma.apiUsageLog.deleteMany({ where: { userId } }),
    prisma.personalityCache.deleteMany({ where: { userId } }),
    prisma.coachingHistory.deleteMany({ where: { userId } }),
  ]);

  // User 삭제 (나머지는 onDelete: Cascade로 자동 삭제)
  await prisma.user.delete({ where: { id: userId } });

  return Response.json({ success: true });
}
