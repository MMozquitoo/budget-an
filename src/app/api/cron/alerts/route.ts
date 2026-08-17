import { Resend } from "resend";
import { computeInsights } from "@/lib/insights-data";
import { buildAlertEmail } from "@/lib/alerts-email";

/**
 * Weekly alert email, triggered by the Vercel cron defined in vercel.json
 * (Monday mornings). Same auth pattern as src/app/api/cron/backup/route.ts —
 * this route is deliberately let through the auth middleware and checks the
 * cron secret itself, since there is no user session in a cron invocation.
 */

const RECIPIENT = "adrien@butterflyagency.io";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const domain = process.env.RESEND_EMAIL_DOMAIN;
  if (!apiKey || !domain) {
    console.error("Alerts failed: RESEND_API_KEY or RESEND_EMAIL_DOMAIN missing");
    return Response.json({ ok: false, error: "Resend is not configured" }, { status: 500 });
  }

  try {
    const insights = await computeInsights();
    const { subject, html } = buildAlertEmail(insights);

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: `Budget AN <alerts@${domain}>`,
      to: RECIPIENT,
      subject,
      html,
    });
    if (error) throw error;

    return Response.json({
      ok: true,
      month: insights.month,
      year: insights.year,
      recommendationCount: insights.recommendations.length,
      messageId: data?.id,
    });
  } catch (e) {
    console.error("Alerts failed:", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
