import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const date = searchParams.get("date");   // YYYY-MM-DD

  if (month) {
    const memos = await prisma.dailyMemo.findMany({
      where: { userId: session.user.id, date: { startsWith: month } },
      select: { date: true },
    });
    return Response.json({ dates: memos.map((m) => m.date) });
  }

  if (date) {
    const memo = await prisma.dailyMemo.findUnique({
      where: { userId_date: { userId: session.user.id, date } },
    });
    return Response.json({ content: memo?.content ?? null });
  }

  return Response.json({ error: "date or month required" }, { status: 400 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { date, content } = await req.json();
  if (!date) return Response.json({ error: "date required" }, { status: 400 });

  if (!content?.trim()) {
    await prisma.dailyMemo.deleteMany({
      where: { userId: session.user.id, date },
    });
    return Response.json({ deleted: true });
  }

  const memo = await prisma.dailyMemo.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    create: { userId: session.user.id, date, content: content.trim() },
    update: { content: content.trim() },
  });
  return Response.json(memo);
}
