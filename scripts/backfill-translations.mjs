#!/usr/bin/env node
// One-off backfill: walks every translatable admin table, picks rows whose
// *_en value is still empty (and not manually locked), and calls the
// translate-content Edge Function so DeepL fills them in.
//
// Usage:
//   node scripts/backfill-translations.mjs            # only fill missing
//   node scripts/backfill-translations.mjs --force    # re-translate everything
//                                                       except locked fields
//
// Env vars required (read from .env automatically via dotenv if installed,
// otherwise must be exported beforehand):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY
//
// Safe to run multiple times.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
try {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {
  /* .env optional */
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const force = process.argv.includes("--force");
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
  { name: "partner_tiles", fields: ["description"] },
  {
    name: "location_teasers",
    fields: ["title", "description", "city", "expected_date"],
  },
  { name: "skypadel_gallery", fields: ["alt_text"] },
  { name: "partner_touchpoint_slides", fields: ["title", "description"] },
];

const needsTranslation = (row, fields) =>
  fields.some((f) => {
    const source = row[f];
    if (typeof source !== "string" || source.trim().length === 0) return false;
    const locked = Boolean(row[`${f}_en_locked`]);
    if (locked) return false;
    if (force) return true;
    const enValue = row[`${f}_en`];
    return typeof enValue !== "string" || enValue.trim().length === 0;
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const translateRow = async (table, id, fields) => {
  const { data, error } = await client.functions.invoke("translate-content", {
    body: { table, id, fields },
  });
  if (error) throw error;
  return data;
};

let totalTranslated = 0;
let totalSkipped = 0;
let totalFailed = 0;

for (const { name, fields } of TABLES) {
  console.log(`\n=== ${name} ===`);
  const { data: rows, error } = await client.from(name).select("*");
  if (error) {
    console.error(`  read failed: ${error.message}`);
    continue;
  }
  if (!rows || rows.length === 0) {
    console.log("  (no rows)");
    continue;
  }
  console.log(`  ${rows.length} rows total`);

  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!needsTranslation(row, fields)) {
      skipped++;
      continue;
    }
    try {
      const result = await translateRow(name, row.id, fields);
      const updated = result?.updatedFields ?? [];
      if (updated.length > 0) {
        translated++;
        console.log(`  ✓ ${row.id.slice(0, 8)} → ${updated.join(", ")}`);
      } else {
        skipped++;
      }
      // gentle pacing so we don't hammer DeepL Free quota with bursts
      await sleep(150);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${row.id.slice(0, 8)} → ${err?.message ?? err}`);
    }
  }

  console.log(`  done: ${translated} translated, ${skipped} skipped, ${failed} failed`);
  totalTranslated += translated;
  totalSkipped += skipped;
  totalFailed += failed;
}

console.log(
  `\nTotal: ${totalTranslated} translated, ${totalSkipped} skipped, ${totalFailed} failed`,
);
process.exit(totalFailed > 0 ? 1 : 0);
