import * as Sentry from "@sentry/nextjs";

// Server/edge error monitoring. Only initializes when SENTRY_DSN is set, so the
// build and local dev work untouched until a Sentry project is connected.
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
  }
}

export const onRequestError = Sentry.captureRequestError;
