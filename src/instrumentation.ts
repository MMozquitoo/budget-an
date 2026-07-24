import * as Sentry from "@sentry/nextjs";

// Server/edge error monitoring. Only initializes when a DSN is set, so the
// build and local dev work untouched until a Sentry project is connected.
// The Vercel Sentry integration only provisions NEXT_PUBLIC_SENTRY_DSN (the DSN
// isn't secret — it's designed to ship in client bundles), so that's the fallback.
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  }
}

export const onRequestError = Sentry.captureRequestError;
