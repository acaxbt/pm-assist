import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { allowedEmailDomains, env } from "@/lib/env";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: env.AUTH_SECRET,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      const domain = email.split("@")[1];
      if (!allowedEmailDomains.includes(domain)) {
        return `/sign-in?error=domain`;
      }
      // @ts-expect-error google adds this
      if (profile?.email_verified === false) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-expect-error role from db
        token.role = user.role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        // @ts-expect-error augment
        session.user.role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
});
