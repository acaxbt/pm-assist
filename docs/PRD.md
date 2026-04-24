# PRD: PRD Chat Tool (meta-PRD)

> PRD dari tool ini sendiri. Akan terus di-update seiring iterasi.

## 1. Ringkasan (TL;DR)
Chat AI internal yang membantu Product Manager Detik menulis PRD lebih cepat & konsisten, dengan integrasi langsung ke Plane.so untuk push Page dan generate Issues.

## 2. Masalah & Konteks
- PM menghabiskan banyak waktu menyusun PRD dari nol; format tidak konsisten antar tim.
- Hand-off ke Plane manual: copy-paste deskripsi, bikin issue satu per satu.
- Reviewer (Tech Lead/Designer) sulit memberi feedback terstruktur tanpa template baku.

## 3. Target User
- **Primary:** PM (semua level) di Detik.
- **Secondary:** Tech Lead, Designer, Engineering Manager (review mode).

## 4. Tujuan & Non-Tujuan
**Tujuan:**
- Kurangi waktu drafting PRD ≥ 40%.
- 100% PRD dari tool mengikuti template standar.
- 1-click push ke Plane (Page + Issues).

**Non-Tujuan:**
- Bukan replacement Plane/Confluence.
- Bukan general-purpose chatbot.
- Tidak handle approval workflow di MVP.

## 5. User Stories
- Sebagai PM, saya bisa login dengan akun Google @detik.com.
- Sebagai PM, saya bisa cerita ide kasar dan dapat draft PRD ber-section.
- Sebagai PM, saya bisa iterasi tiap section lewat chat.
- Sebagai PM, saya bisa pilih model (cepat vs premium) sesuai kebutuhan.
- Sebagai PM, saya bisa upload PRD lama dan minta critique.
- Sebagai PM, saya bisa push PRD final ke Plane sebagai Page.
- Sebagai PM, saya bisa generate Issues di Plane dari user stories di PRD.
- Sebagai PM, saya bisa export PRD ke Markdown / PDF.

## 6. Persyaratan Fungsional
1. Auth: NextAuth + Google, restrict domain `@detik.com`.
2. Chat streaming dengan OpenRouter (default + premium model).
3. Sistem prompt khusus PRD (Bahasa Indonesia, struktur baku 10 section).
4. Persistence: User, Conversation, Message, PRD, PrdVersion.
5. Side-by-side view: chat di kiri, live PRD draft (markdown) di kanan. *(M3)*
6. File upload (PRD lama) ke Vercel Blob → AI critique. *(M4)*
7. Plane integration: createPage + createIssue per user story. *(M5)*
8. Export Markdown (M6), PDF (post-MVP).

## 7. Persyaratan Non-Fungsional
- **Performance:** First token ≤ 2 detik (gpt-4o-mini).
- **Keamanan:** Domain restriction, semua mutation di-auth, env var di Vercel.
- **Compliance:** Data PRD tidak dipakai training (OpenRouter route ke provider yg honor opt-out).
- **Cost guardrail:** Default ke model murah; premium opt-in.
- **Aksesibilitas:** Keyboard nav, prefers-color-scheme.

## 8. Success Metrics (90 hari pasca-launch)
- **Primary:** ≥ 70% PM aktif pakai 1×/minggu.
- **Primary:** Median waktu drafting PRD turun ≥ 40% (self-reported survey).
- **Secondary:** ≥ 50 PRD dibuat lewat tool.
- **Secondary:** ≥ 30% PRD di-push ke Plane via tool.
- **Guardrail:** LLM cost ≤ $30/bln di pilot (≤30 user).

## 9. Risiko & Mitigasi
| Risiko | Mitigasi |
|---|---|
| Output PRD generik | System prompt ketat + few-shot dari PRD terbaik internal |
| Hallucinated angka/data internal | Instruksi "minta dari user, jangan ngarang" + `[NEEDS INPUT]` marker |
| Cost LLM membengkak | Default `gpt-4o-mini`, premium opt-in; rate limit per user |
| Adopsi rendah | Pilot 3–5 PM dulu, iterasi berdasar feedback sebelum rollout |
| Plane API breaking change | Wrapper terisolasi di `lib/plane.ts`, version pin |

## 10. Open Questions
- [NEEDS INPUT] Plane.so cloud vs self-hosted? URL & workspace slug?
- [NEEDS INPUT] Apakah perlu admin panel untuk kelola template?
- [NEEDS INPUT] Retention policy: berapa lama simpan conversation history?
- [NEEDS INPUT] Apakah perlu integrasi tambahan (Slack notif, Confluence sync)?
