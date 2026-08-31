import { NextRequest } from "next/server";
import { safe, badRequest } from "@/lib/api";
import { getTreasuryData, upsertCashSnapshot, deleteCashSnapshot } from "@/lib/treasury-data";

export const GET = safe(async () => {
  const data = await getTreasuryData();
  return Response.json(data);
});

export const POST = safe(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.month || !body.year) return badRequest("month and year required");
  if (typeof body.amount !== "number") return badRequest("amount required");

  const snapshot = await upsertCashSnapshot({
    month: body.month,
    year: body.year,
    amount: body.amount,
    notes: body.notes ?? null,
  });

  return Response.json(snapshot, { status: 201 });
});

export const DELETE = safe(async (request: NextRequest) => {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");

  await deleteCashSnapshot(id);
  return Response.json({ ok: true });
});
