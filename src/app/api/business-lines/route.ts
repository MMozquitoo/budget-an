import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { safe } from "@/lib/api";

export const GET = safe(async () => {
  const lines = await prisma.businessLine.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(lines);
});

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  const line = await prisma.businessLine.create({
    data: {
      name: body.name,
      color: body.color,
    },
  });

  return Response.json(line, { status: 201 });
});
