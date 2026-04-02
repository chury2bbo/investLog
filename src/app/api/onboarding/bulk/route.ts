import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // TODO: 팀원 A — prisma.$transaction으로 Account/Holding/CashBalance/TradeLog 일괄 생성
  // 현재는 onboardingDone 플래그만 업데이트 (건너뛰기 대응)

  const { accounts, trade } = body;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingDone: true },
  });

  return Response.json({ success: true });
}
