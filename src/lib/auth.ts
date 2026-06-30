import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const hash = process.env.AUTH_PASSWORD_HASH;
        if (!hash || !credentials?.password) return null;
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
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isApi = request.nextUrl.pathname.startsWith("/api");
      const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");
      const isLogin = request.nextUrl.pathname === "/login";

      if (isAuthApi) return true;
      if (isLogin) return true;

      if (!isLoggedIn) {
        if (isApi) return Response.json({ error: "Unauthorized" }, { status: 401 });
        return false; // redirects to login
      }

      return true;
    },
  },
});
