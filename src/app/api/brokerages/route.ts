import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brokerages = await prisma.brokerageCompany.findMany({
    where: { financialCode: "C" },
    select: { code: true, name: true },
    orderBy: { name: "asc" },
  });

  const TOP5 = ["미래에셋증권", "삼성증권", "KB증권", "NH투자증권", "키움증권"];

  const sorted = [
    ...TOP5.flatMap((top) => brokerages.filter((b) => b.name.includes(top))),
    ...brokerages.filter((b) => !TOP5.some((top) => b.name.includes(top))),
  ];

  return Response.json(sorted);
}
