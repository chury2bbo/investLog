import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) return Response.json([]);

  const results = await prisma.stockMaster.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { ticker: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { ticker: true, name: true, market: true },
    orderBy: { name: "asc" },
    take: 10,
  });

  return Response.json(results);
}
