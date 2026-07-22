import { put, list, del } from "@vercel/blob";
import { buildBackup, backupPathname, assertPlausible } from "@/lib/backup";

/**
 * Daily database backup, triggered by the Vercel cron defined in vercel.json.
 *
 * Writes a full JSON export to a *private* Blob store and prunes anything older
 * than the retention window. Private matters: this file is the entire financial
 * history in plain text.
 *
 * Auth is the cron secret, not the app session — this route is deliberately let
 * through the auth middleware and checks the header itself.
 */

const RETENTION_DAYS = 30;

// A full export of every table; well under the limit, but not instant.
export const maxDuration = 60;

function blobOptions() {
  // On Vercel, the OIDC token plus BLOB_STORE_ID authenticates without a
  // long-lived read/write token. BLOB_READ_WRITE_TOKEN still works if the store
  // is connected to the project the classic way.
  const storeId = process.env.BLOB_STORE_ID;
  return storeId ? { storeId } : {};
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  try {
    const backup = await buildBackup(now);
    assertPlausible(backup);

    const pathname = backupPathname(now);
    const blob = await put(pathname, JSON.stringify(backup), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      ...blobOptions(),
    });

    // Prune old backups. Done after a successful upload, never before, so a
    // failed run can't leave the store emptier than it found it.
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { blobs } = await list({ prefix: "backups/", ...blobOptions() });
    const expired = blobs.filter((b) => new Date(b.uploadedAt) < cutoff);
    if (expired.length > 0) {
      await del(expired.map((b) => b.url), blobOptions());
    }

    return Response.json({
      ok: true,
      pathname: blob.pathname,
      counts: backup.counts,
      pruned: expired.length,
      retentionDays: RETENTION_DAYS,
    });
  } catch (e) {
    // Surface the reason in the cron logs; a backup that fails silently is the
    // worst possible outcome here.
    console.error("Backup failed:", e);
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
