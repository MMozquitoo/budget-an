import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET() {
  const lines = await prisma.businessLine.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(lines);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const line = await prisma.businessLine.create({
    data: {
      name: body.name,
      color: body.color,
    },
  });

  return Response.json(line, { status: 201 });
}
