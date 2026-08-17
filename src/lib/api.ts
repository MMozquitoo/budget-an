// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<Response> | Response;

function prismaErrorCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code: unknown }).code;
    if (typeof code === "string" && /^P\d{4}$/.test(code)) return code;
  }
  return undefined;
}

/**
 * Wraps a route handler so uncaught errors become clean JSON responses instead
 * of a 500 with a leaked stack trace. Known Prisma errors are mapped to sensible
 * status codes; a delete/update on a missing row (P2025) becomes an idempotent
 * 404 rather than a crash (fixes e.g. double-clicking a delete button).
 */
export function safe(handler: RouteHandler): RouteHandler {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (e) {
      const code = prismaErrorCode(e);
      if (code === "P2025")
        return Response.json({ error: "Introuvable" }, { status: 404 });
      if (code === "P2002")
        return Response.json({ error: "Doublon" }, { status: 409 });
      if (code === "P2003")
        return Response.json({ error: "Référence invalide" }, { status: 400 });
      // Malformed JSON body (request.json() throws SyntaxError) or Prisma
      // validation error (bad enum/type reaching the query) → 400, not 500.
      if (e instanceof SyntaxError || e?.constructor?.name === "PrismaClientValidationError")
        return Response.json({ error: "Données invalides" }, { status: 400 });
      console.error("API error:", e);
      return Response.json({ error: "Erreur interne" }, { status: 500 });
    }
  };
}

/** Validate that `value` is one of an enum's values (safe against prototype keys). */
export function isEnumValue(
  value: unknown,
  enumObj: Record<string, string>
): boolean {
  return typeof value === "string" && Object.values(enumObj).includes(value);
}

/**
 * Validate that `value` is one of the (own, enumerable) keys of a lookup map —
 * e.g. the dynamic taxonomy's groupLabels/categoryLabels (lib/taxonomy.ts),
 * which replaced the old TransactionGroup/TransactionCategory Prisma enums.
 * Same prototype-pollution guard as isEnumValue, just checking keys instead
 * of values.
 */
export function isValidKey(value: unknown, keys: Record<string, unknown>): boolean {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(keys, value);
}

/** Coerce to a finite number, or return undefined if not a valid number. */
export function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse to a valid Date, or return undefined if unparseable. */
export function toValidDate(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** 400 response with a message. */
export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}
