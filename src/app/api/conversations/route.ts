import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe } from "@/lib/api";

// GET /api/conversations — recent conversations for the history list.
export const GET = safe(async () => {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  return Response.json(
    conversations.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    }))
  );
});

// POST /api/conversations — start a new (empty) conversation.
export const POST = safe(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));
  const conversation = await prisma.conversation.create({
    data: { title: typeof body.title === "string" ? body.title.slice(0, 60) : null },
  });
  return Response.json({ id: conversation.id }, { status: 201 });
});
