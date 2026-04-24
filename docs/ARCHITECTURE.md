# Arsitektur — PRD Chat Tool

## Overview

```
                 ┌─────────────────┐
                 │  PM Browser     │
                 └────────┬────────┘
                          │ HTTPS
                          ▼
        ┌──────────────────────────────────┐
        │  Vercel — Next.js 14 App         │
        │  ├── App Router (RSC + Actions)  │
        │  ├── /api/chat  (streaming)      │
        │  ├── /api/auth  (NextAuth)       │
        │  ├── /api/plane (push to Plane)  │
        │  └── middleware (auth gate)      │
        └──┬─────────┬─────────┬───────────┘
           │         │         │
   ┌───────▼──┐ ┌────▼────┐ ┌──▼─────────┐
   │ Google   │ │OpenRouter│ │Neon (PG)  │
   │ OAuth    │ │  (LLM)   │ │+ Prisma   │
   └──────────┘ └──────────┘ └───────────┘
                                   │
                            ┌──────▼────────┐
                            │  Plane.so API │
                            │  (push PRD)   │
                            └───────────────┘
```

## Komponen

| Layer | Tech | Catatan |
|---|---|---|
| Hosting | Vercel | `git push` → deploy. Hobby tier untuk pilot. |
| Framework | Next.js 14 App Router | RSC + Server Actions; streaming chat via Vercel AI SDK. |
| Auth | NextAuth v5 + Google | Restrict ke domain `@detik.com` di `signIn` callback. |
| LLM | OpenRouter (OpenAI-compatible) | Default `openai/gpt-4o-mini`, premium `anthropic/claude-sonnet-4.5`. |
| DB | Neon Postgres + Prisma | Free tier MVP. pgvector untuk RAG di v0.2. |
| File Storage | Vercel Blob | Upload PRD lama (md/docx/pdf). |
| PM Integration | Plane.so REST API (PAT) | Push Page + create Issues. |

## Flow Utama

### 1. Login
```
User → /sign-in → Google OAuth → callback → signIn callback
  → cek email domain @detik.com
  → jika bukan: redirect /sign-in?error=domain
  → jika ya: PrismaAdapter buat User + Session → /
```

### 2. Chat → Draft PRD
```
User type prompt → useChat() → POST /api/chat
  → auth() check → streamText(openrouter, system=PRD_SYSTEM_PROMPT)
  → SSE stream balik ke UI → render markdown
  → (M4) save Message + Conversation ke Postgres
```

### 3. Push ke Plane (M5)
```
User klik "Send to Plane" → Server Action
  → planeApi.createPage(projectId, { name, description_html })
  → simpan plane_page_id ke Prd record
  → opsional: extract user stories → planeApi.createIssue() per story
```

## Keputusan Arsitektur

- **Server Actions** dipakai untuk mutation simpel (signOut, save draft); REST API untuk streaming & integrasi eksternal.
- **Database session** (bukan JWT) supaya gampang revoke + butuh tabel User untuk relasi PRD.
- **Prisma** untuk DX cepat; jika perlu performa tinggi nanti, bisa migrate ke Drizzle.
- **OpenRouter** dipilih supaya bebas swap model tanpa ganti SDK; Vercel AI SDK pakai `@ai-sdk/openai-compatible`.
- **Plane PAT** cukup untuk MVP single-tenant; OAuth Plane app menyusul jika multi-workspace.

## Roadmap (post-MVP)

- pgvector di Neon → RAG dari arsip PRD lama & style guide internal.
- Langfuse / Helicone → observability LLM (cost, latency per user).
- Comment sync 2 arah dengan Plane.
- Versioning + diff antar revisi PRD.
