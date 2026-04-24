# Setup — PRD Chat Tool

Panduan langkah-demi-langkah untuk setup pertama kali.

## 0. Prasyarat

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Akun: GitHub, Vercel, Neon, Google Cloud, OpenRouter, Plane.so

## 1. Clone & install

```bash
cd projects/prd-chat-tool
pnpm install
cp .env.example .env.local
```

## 2. Generate `AUTH_SECRET`

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Tempel ke `AUTH_SECRET=` di `.env.local`.

## 3. Google OAuth

1. Buka https://console.cloud.google.com/apis/credentials
2. Create Project (mis. `acagc-prd-chat`)
3. **OAuth consent screen**: Internal (kalau Google Workspace detik.com), atau External + tambah test users.
4. **Create credentials → OAuth client ID → Web application**
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-prod-domain.vercel.app/api/auth/callback/google`
6. Copy `Client ID` → `AUTH_GOOGLE_ID`
7. Copy `Client secret` → `AUTH_GOOGLE_SECRET`

## 4. Neon Postgres

1. https://console.neon.tech → Create Project (region: Singapore)
2. Copy `Connection string` (pooled, mode `require`) → `DATABASE_URL`
3. Run migrations:
   ```bash
   pnpm db:migrate
   ```

## 5. OpenRouter

1. https://openrouter.ai/keys → Create Key
2. Copy → `OPENROUTER_API_KEY`
3. Top up saldo (mulai $5)
4. Default model bisa diubah di `.env.local`:
   - `OPENROUTER_MODEL_DEFAULT=openai/gpt-4o-mini`
   - `OPENROUTER_MODEL_PREMIUM=anthropic/claude-sonnet-4.5`

## 6. Vercel Blob (opsional di MVP)

1. Vercel Dashboard → Storage → Create Blob Store
2. Copy `BLOB_READ_WRITE_TOKEN`

## 7. Plane.so (opsional, bisa belakangan)

1. Workspace Settings → API Tokens → Generate
2. Isi `.env.local`:
   - `PLANE_BASE_URL=https://api.plane.so` (cloud) atau URL self-hosted
   - `PLANE_WORKSPACE_SLUG=<slug-workspace>`
   - `PLANE_API_TOKEN=<token>`

## 8. Run

```bash
pnpm dev
# buka http://localhost:3000 → login pakai akun @detik.com
```

## 9. Deploy ke Vercel

```bash
# pertama kali
pnpm dlx vercel link
pnpm dlx vercel env pull .env.local   # sync env from dashboard

# atau via dashboard: Import GitHub repo
```

Pastikan semua env var di `.env.example` sudah diisi di **Vercel Project Settings → Environment Variables**.

Update `NEXTAUTH_URL` ke domain produksi & tambahkan redirect URI di Google Console.

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `Hanya email @detik.com yang diizinkan` | Login pakai email perusahaan, atau ubah `ALLOWED_EMAIL_DOMAINS`. |
| `PrismaClientInitializationError` | Pastikan `DATABASE_URL` benar & `pnpm db:migrate` sudah jalan. |
| `OpenRouter 401` | Cek `OPENROUTER_API_KEY` & saldo > 0. |
| Streaming putus di Vercel | Pastikan `maxDuration` di route ≥ kebutuhan; upgrade ke Pro kalau >60s. |
