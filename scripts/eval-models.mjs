// Quick eval: bandingkan 4 model OpenRouter untuk usecase PRD writing.
// Run: node scripts/eval-models.mjs
import fs from "node:fs";
import path from "node:path";

// Load .env.local manually
const envPath = path.resolve(".env.local");
const envText = fs.readFileSync(envPath, "utf8");
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 0) continue;
  const k = line.slice(0, eq).trim();
  let v = line.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) throw new Error("OPENROUTER_API_KEY missing");

const MODELS = [
  "xiaomi/mimo-v2-pro",
  "google/gemini-3-flash-preview",
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2.6",
];

const SYSTEM = `Kamu adalah PRD assistant untuk tim Product di Detik (media digital Indonesia).
Tugasmu: bantu PM menulis Product Requirements Document yang jelas, terstruktur, dan actionable.
Format output: Markdown dengan section heading. Bahasa: Bahasa Indonesia profesional, hindari jargon basi.
Sertakan: Problem, Goals (measurable), Non-Goals, User Stories, Functional Requirements, Success Metrics, Risks.`;

const USER = `Bantu saya draft PRD singkat untuk fitur baru:

"Smart Notification Digest" — fitur di app Detik yang menggantikan push notification berisik harian dengan satu notifikasi pagi (07:00) berisi rangkuman 5 berita paling relevan untuk user, di-personalisasi berdasarkan reading history. Tujuannya: turunkan unsubscribe rate (saat ini 8%/bulan) dan naikkan DAU.

Buat PRD-nya, jangan terlalu panjang (target ~500 kata), tapi lengkap di tiap section.`;

async function callModel(model) {
  const t0 = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "PRD Chat eval",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: USER },
        ],
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });
    const elapsed = Date.now() - t0;
    const json = await res.json();
    if (!res.ok || json.error) {
      return { model, error: json.error?.message || `HTTP ${res.status}`, elapsed };
    }
    const text = json.choices?.[0]?.message?.content ?? "";
    const usage = json.usage ?? {};
    return {
      model,
      elapsed,
      chars: text.length,
      words: text.split(/\s+/).length,
      promptTok: usage.prompt_tokens,
      completionTok: usage.completion_tokens,
      text,
    };
  } catch (e) {
    return { model, error: String(e), elapsed: Date.now() - t0 };
  }
}

console.log("Calling 4 models in parallel…\n");
const results = await Promise.all(MODELS.map(callModel));

for (const r of results) {
  console.log("═".repeat(80));
  console.log(`MODEL: ${r.model}`);
  if (r.error) {
    console.log(`❌ ERROR: ${r.error}  (${r.elapsed}ms)`);
    continue;
  }
  console.log(`⏱  ${r.elapsed}ms | ${r.chars} chars | ${r.words} words | tok in=${r.promptTok} out=${r.completionTok}`);
  console.log("─".repeat(80));
  console.log(r.text);
  console.log();
}

fs.writeFileSync("scripts/eval-results.json", JSON.stringify(results, null, 2));
console.log("\n→ saved to scripts/eval-results.json");
