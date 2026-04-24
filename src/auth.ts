import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { allowedEmailDomains, env } from "@/lib/env";
import { authConfig } from "@/auth.config";

function getEmailVerified(profile: unknown): boolean | undefined {
  if (!profile || typeof profile !== "object" || !("email_verified" in profile)) {
    return undefined;
  }

  const { email_verified } = profile as { email_verified?: unknown };
  return typeof email_verified === "boolean" ? email_verified : undefined;
}

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
      if (getEmailVerified(profile) === false) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role ?? "USER";
      }
      return session;
    },
  },
});
