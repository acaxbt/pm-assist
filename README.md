# PRD Chat Tool

AI chat tool internal untuk bantu Product Manager menulis PRD lebih cepat & konsisten, dengan integrasi ke [Plane.so](https://plane.so).

## Quick Start

```bash
cd projects/prd-chat-tool
pnpm install
cp .env.example .env.local
# isi semua env var (lihat docs/SETUP.md)
pnpm prisma migrate dev
pnpm dev
```

Buka http://localhost:3000

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind + shadcn/ui
- **NextAuth v5** + Google Provider (restrict ke `@detik.com`)
- **Vercel AI SDK** + **OpenRouter** (multi-model LLM)
- **Neon Postgres** + **Prisma**
- **Vercel Blob** untuk file upload
- **Plane.so API** integration

## Dokumen

- [Arsitektur](./docs/ARCHITECTURE.md)
- [Setup lengkap](./docs/SETUP.md)
- [PRD tool ini sendiri](./docs/PRD.md)

## Status

🚧 MVP — sedang scaffolding (M0).

## Milestones

| Fase | Status |
|---|---|
| M0 — Scaffold | 🚧 in progress |
| M1 — Login Google | ⏳ |
| M2 — Chat streaming (OpenRouter) | ⏳ |
| M3 — Template PRD + side-by-side editor | ⏳ |
| M4 — Persistence (Neon + Prisma) | ⏳ |
| M5 — Plane.so integration | ⏳ |
| M6 — Export MD/PDF | ⏳ |
| M7 — Deploy ke Vercel | ⏳ |
| M8 — Pilot 3–5 PM | ⏳ |
