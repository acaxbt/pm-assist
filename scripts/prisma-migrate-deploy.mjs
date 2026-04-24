import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL?.trim();
const directDatabaseUrl = process.env.DIRECT_DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("[prisma-deploy] Missing DATABASE_URL.");
  process.exit(1);
}

if (!directDatabaseUrl) {
  let host = "";
  let search = "";

  try {
    const parsed = new URL(databaseUrl);
    host = parsed.host.toLowerCase();
    search = parsed.search.toLowerCase();
  } catch {
    // Let Prisma surface the real parsing/connection error below.
  }

  const usesPooledConnection =
    host.includes("-pooler") || search.includes("pgbouncer=true");

  if (usesPooledConnection) {
    console.error(
      [
        "[prisma-deploy] DIRECT_DATABASE_URL is required when DATABASE_URL points to a pooled connection.",
        "[prisma-deploy] For Neon, copy the direct (non-pooled) connection string and set it as DIRECT_DATABASE_URL in Vercel.",
      ].join("\n"),
    );
    process.exit(1);
  }

  process.env.DIRECT_DATABASE_URL = databaseUrl;
  console.warn(
    "[prisma-deploy] DIRECT_DATABASE_URL is not set; falling back to DATABASE_URL for prisma migrate deploy.",
  );
}

const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("[prisma-deploy] Failed to run Prisma migrate deploy.", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);