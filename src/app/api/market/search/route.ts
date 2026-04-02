import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getYahooSearch } from "@/lib/yahoo";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const country = searchParams.get("country") ?? "KR";

  if (!q) return Response.json([]);

  // 국내 종목 — stock_master DB 조회
  async function searchKR() {
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
    return results.map((r) => ({ ...r, country: "KR" }));
  }

  // 해외 종목 — yahoo-finance2 search()
  async function searchUS() {
    try {
      return await getYahooSearch(q);
    } catch {
      return [];
    }
  }

  // ALL: 국내 + 해외 동시 검색
  if (country === "ALL") {
    const [krResults, usResults] = await Promise.all([searchKR(), searchUS()]);
    return Response.json([...krResults, ...usResults].slice(0, 15));
  }

  if (country === "US") {
    return Response.json(await searchUS());
  }

  // 기본: 국내만
  return Response.json(await searchKR());
}
