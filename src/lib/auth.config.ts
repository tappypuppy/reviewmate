import type { NextAuthConfig } from "next-auth";

// Auth config without Prisma adapter - for Edge Middleware
export const authConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const protectedRoutes = ["/dashboard", "/policies", "/review"];
      const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
      );

      if (isProtectedRoute && !isLoggedIn) {
        return false; // Redirect to login
      }

      if (pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
