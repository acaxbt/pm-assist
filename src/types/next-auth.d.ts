import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

type AppRole = "USER" | "ADMIN";

declare module "next-auth" {
  interface User {
    id: string;
    role?: AppRole;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: AppRole;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
  }
}
