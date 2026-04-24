# Deploy ke Vercel — PRD Chat Tool

Panduan klik-per-klik dari nol sampai live di production.

---

## Prasyarat (sekali setup)

- [ ] Akun GitHub (repo akan di-push ke sini)
- [ ] Akun Vercel (vercel.com — login pakai GitHub)
- [ ] Akun Neon (console.neon.tech — Postgres untuk production)
- [ ] Google Cloud project untuk OAuth (console.cloud.google.com)
- [ ] OpenRouter API key (openrouter.ai/keys)

---

## Step 1 — Push ke GitHub

```pwsh
cd c:\Users\aca\acagc\projects\prd-chat-tool
git init
git add .
git commit -m "Initial PRD Chat Tool"
# bikin repo private di github.com/new lalu:
git remote add origin git@github.com:<org>/<repo>.git
git branch -M main
git push -u origin main
```

> **Penting**: pastikan `.env.local` ter-gitignore (sudah by default). Verifikasi dengan `git status` sebelum commit pertama.

---

## Step 2 — Buat Postgres production di Neon

1. Login ke [console.neon.tech](https://console.neon.tech).
2. **New Project** → region **Singapore (ap-southeast-1)** (terdekat ke user Indonesia).
3. Project name: `prd-chat-prod`. Klik Create.
4. Di tab **Connection Details**, ambil 2 connection strings:
   - **Pooled** (default, ada `-pooler` di hostname) → untuk `DATABASE_URL`
   - **Direct** (toggle "Pooled connection" off) → untuk `DIRECT_DATABASE_URL`
5. Simpan kedua URL — kita butuh di Step 4.

---

## Step 3 — Setup Google OAuth untuk production

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Bisa pakai OAuth Client yang sudah ada, atau bikin baru: **Create Credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**: tambah `https://<your-vercel-domain>` (kita dapat URL setelah Step 4 — bisa balik update).
4. **Authorized redirect URIs**: tambah `https://<your-vercel-domain>/api/auth/callback/google`.
5. Simpan **Client ID** + **Client Secret**.

---

## Step 4 — Import project ke Vercel

1. Login ke [vercel.com/new](https://vercel.com/new).
2. **Import Git Repository** → pilih repo yang baru di-push.
3. Vercel auto-detect Next.js. Biarkan default kecuali:
   - **Root Directory**: kalau monorepo, set ke `projects/prd-chat-tool`. Kalau repo standalone, biarkan `./`.
4. Expand **Environment Variables** dan paste semua var di bawah ini.

### Environment Variables (wajib)

| Key | Value | Catatan |
|---|---|---|
| `AUTH_SECRET` | `<openssl rand -base64 32>` | Generate sekali, jangan share |
| `NEXTAUTH_URL` | `https://<your-vercel-domain>` | Update setelah deploy pertama |
| `AUTH_GOOGLE_ID` | dari Step 3 | |
| `AUTH_GOOGLE_SECRET` | dari Step 3 | |
| `ALLOWED_EMAIL_DOMAINS` | `detik.com` | Comma-separated kalau multi |
| `DATABASE_URL` | Neon **pooled** URL | Wajib `-pooler` di host + `?sslmode=require&pgbouncer=true&connection_limit=1` |
| `DIRECT_DATABASE_URL` | Neon **direct** URL | Untuk `prisma migrate deploy` saat build |
| `OPENROUTER_API_KEY` | dari openrouter.ai/keys | |
| `OPENROUTER_MODEL_DEFAULT` | `google/gemini-3-flash-preview` | Atau model murah lain |
| `OPENROUTER_MODEL_PREMIUM` | `anthropic/claude-sonnet-4.6` | |
| `OPENROUTER_SITE_URL` | `https://<your-vercel-domain>` | Untuk OpenRouter ranking |
| `OPENROUTER_SITE_NAME` | `PRD Chat (Detik)` | |
| `NEXT_PUBLIC_APP_NAME` | `PRD Chat` | |

### Env vars opsional (skip kalau belum dipakai)

| Key | Kapan butuh |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Kalau Vercel Blob upload sudah dipakai |
| `PLANE_BASE_URL` / `PLANE_WORKSPACE_SLUG` / `PLANE_API_TOKEN` | Kalau integrasi Plane sudah dipakai |

5. Klik **Deploy**. Tunggu ~2 menit.

> Build script akan jalanin `prisma migrate deploy && next build`. Kalau migration belum pernah jalan di DB Neon kosong, dia akan apply semua migration di `prisma/migrations/` otomatis.

---

## Step 5 — Update OAuth redirect setelah dapat domain

1. Vercel kasih URL `https://<repo-name>-<hash>.vercel.app`. Copy domain itu.
2. Balik ke Vercel **Settings → Environment Variables**, update `NEXTAUTH_URL` + `OPENROUTER_SITE_URL` ke domain final. **Redeploy** dari tab Deployments.
3. Update Google OAuth **Authorized origins** + **redirect URI** dengan domain final (Step 3).

---

## Step 6 — (Opsional) Custom domain

1. Vercel **Settings → Domains** → Add `prd.detik.com` (contoh).
2. Tambah CNAME record di DNS sesuai instruksi Vercel.
3. Update lagi `NEXTAUTH_URL` + Google OAuth redirect ke domain custom.

---

## Smoke test setelah deploy

- [ ] Buka `https://<domain>` — landing page muncul
- [ ] Login Google — berhasil dan redirect balik ke app
- [ ] Bikin thread baru, kirim prompt singkat — clarify card muncul
- [ ] Skip clarify → AI generate PRD lengkap (artifact panel auto-open)
- [ ] Refresh halaman — thread tetap ada di sidebar
- [ ] ⌘K → command palette buka

---

## Troubleshooting cepat

| Gejala | Penyebab umum | Fix |
|---|---|---|
| Build gagal di `prisma migrate deploy` | `DIRECT_DATABASE_URL` salah / belum di-set | Cek env var di Vercel, harus URL **non-pooled** |
| Login Google "redirect_uri_mismatch" | URI di Google Console belum match domain Vercel | Update Authorized redirect URI di Google Cloud |
| Streaming chat timeout di tengah | Hobby plan max 60s | Upgrade ke Pro (300s) atau pakai model lebih cepat |
| `PrismaClientInitializationError: prepared statement already exists` | Pooled URL tanpa `pgbouncer=true` | Tambahkan `?pgbouncer=true&connection_limit=1` ke `DATABASE_URL` |
| 500 di `/api/auth/*` | `AUTH_SECRET` belum di-set | Set + redeploy |

---

## Update production

```pwsh
git add .
git commit -m "feat: …"
git push
```

Vercel auto-deploy dari `main`. Preview deployment auto-jalan untuk PR ke branch lain.

Untuk migration baru:

```pwsh
# di local
pnpm db:migrate   # buat migration file
git add prisma/migrations
git commit -m "db: add <table>"
git push          # build di Vercel akan apply migrasi otomatis
```
