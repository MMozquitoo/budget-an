import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe, badRequest } from "@/lib/api";
import type { Prisma } from "@/generated/prisma/client";

interface UIMessageLike {
  id?: string;
  role?: string;
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
}

function extractText(m: UIMessageLike): string {
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join(" ")
      .slice(0, 500);
  }
  return typeof m.content === "string" ? m.content.slice(0, 500) : "";
}

// GET /api/conversations/[id] — the full messages, reload-ready.
export const GET = safe(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { seq: "asc" } } },
  });
  if (!conversation) return Response.json({ error: "Introuvable" }, { status: 404 });
  return Response.json({
    id: conversation.id,
    title: conversation.title,
    messages: conversation.messages.map((m) => m.data),
  });
});

// PUT /api/conversations/[id] — replace the conversation's messages (idempotent).
export const PUT = safe(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json();
  const messages: UIMessageLike[] = Array.isArray(body.messages) ? body.messages : [];

  // Bound what a client can persist under one conversation.
  if (messages.length > 1000) return badRequest("Trop de messages");
  for (const m of messages) {
    if (JSON.stringify(m).length > 100_000) return badRequest("Message trop volumineux");
  }

  const firstUser = messages.find((m) => m.role === "user");
  const title = firstUser ? extractText(firstUser).slice(0, 60) : null;

  const rows: Prisma.MessageCreateManyInput[] = messages.map((m, i) => ({
    conversationId: id,
    role: String(m.role ?? "assistant"),
    content: extractText(m),
    data: m as unknown as Prisma.InputJsonValue,
    seq: i,
  }));

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { conversationId: id } }),
    ...(rows.length ? [prisma.message.createMany({ data: rows })] : []),
    prisma.conversation.update({ where: { id }, data: { title } }),
  ]);

  return Response.json({ ok: true });
});

// DELETE /api/conversations/[id]
export const DELETE = safe(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await prisma.conversation.delete({ where: { id } });
  return Response.json({ ok: true });
});
