import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, request) {
        // Blunt brute force on the shared password: cap attempts per IP.
        // Upstash-backed when configured, in-memory otherwise (see rate-limit.ts).
        const ip =
          (request?.headers?.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
        if (!(await checkRateLimit(`login:${ip}`, 10, 10 * 60)).allowed) return null;

        const hashB64 = process.env.AUTH_PASSWORD_HASH;
        if (!hashB64 || !credentials?.password) return null;
        const hash = Buffer.from(hashB64, "base64").toString();
        const valid = await bcrypt.compare(
          credentials.password as string,
          hash
        );
        if (!valid) return null;
        return { id: "1", name: "Adrien" };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 15 * 24 * 60 * 60,
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isApi = request.nextUrl.pathname.startsWith("/api");
      const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");
      const isLogin = request.nextUrl.pathname === "/login";
      // Vercel cron requests carry no session — they authenticate with
      // CRON_SECRET, which each /api/cron route checks for itself.
      const isCron = request.nextUrl.pathname.startsWith("/api/cron");

      if (isAuthApi) return true;
      if (isLogin) return true;
      // Cron routes carry no session — require the CRON_SECRET bearer at the
      // edge, so a future cron route that forgets to check it is still protected.
      if (isCron) {
        const secret = process.env.CRON_SECRET;
        const ok = !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
        return ok ? true : Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!isLoggedIn) {
        if (isApi) return Response.json({ error: "Unauthorized" }, { status: 401 });
        return false; // redirects to login
      }

      return true;
    },
  },
});
