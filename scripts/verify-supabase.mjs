/**
 * Quick connectivity check: node scripts/verify-supabase.mjs
 * Loads .env.local from the project root (requires dotenv — use Node 20+ --env-file if preferred).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || key === "PASTE_SERVICE_ROLE_KEY_HERE") {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

if (key.startsWith("sb_publishable_")) {
  console.error("SUPABASE_SERVICE_ROLE_KEY must be the secret key (sb_secret_... or legacy eyJ...), not publishable.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { count: clients, error: e1 } = await sb.from("clients").select("*", { count: "exact", head: true });
if (e1) {
  console.error("clients:", e1.message);
  process.exit(1);
}

const { count: assets, error: e2 } = await sb.from("assets").select("*", { count: "exact", head: true });
if (e2) {
  console.error("assets:", e2.message);
  process.exit(1);
}

console.log(`OK — connected to ${url}`);
console.log(`  clients: ${clients ?? 0}`);
console.log(`  assets:  ${assets ?? 0}`);
