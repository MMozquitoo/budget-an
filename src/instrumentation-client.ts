import * as Sentry from "@sentry/nextjs";

// Client-side error monitoring. Gated on NEXT_PUBLIC_SENTRY_DSN so it stays inert
// until a Sentry project is connected.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
