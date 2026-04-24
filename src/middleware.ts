import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: uses authConfig WITHOUT Prisma adapter.
// Session check di middleware pakai JWT cookie (ada/tidak), bukan DB lookup.
// DB lookup tetap jalan di RSC/API routes via `auth()` dari "@/auth".
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
