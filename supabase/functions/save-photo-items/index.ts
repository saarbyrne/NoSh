/**
 * Deploy:
 *   supabase functions deploy save-photo-items --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 * Local test:
 *   supabase functions serve --no-verify-jwt --env-file ../.env.local
 * Curl example:
 *   curl -s -X POST -H 'Content-Type: application/json' \
 *     -d '{"photo_id":"00000000-0000-0000-0000-000000000000","user_id":"<auth_uid>","taken_at":"2025-08-09T12:00:00Z","storage_path":"/photos/2025-08/uuid.jpg","items":[{"raw_label":"apple","confidence":0.9,"packaged":false}]}' \
 *     http://localhost:54321/functions/v1/save-photo-items | jq .
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Item = { raw_label: string; confidence: number; packaged?: boolean; taxonomy_category?: string };
type Body = {
  photo_id?: string;
  user_id?: string;
  taken_at?: string;
  storage_path?: string;
  items?: Item[];
  month_ym?: string;
};

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json().catch(() => ({}))) as Body;
    const { photo_id, user_id, taken_at, storage_path } = body;
    const items = Array.isArray(body.items) ? body.items : [];
    if (!photo_id || !user_id || items.length === 0) {
      return new Response(JSON.stringify({ error: "Missing photo_id, user_id or items" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Resolve month_id if photos.month_id is NOT NULL (your schema uses months.month_ym)
    const ym = body.month_ym || (taken_at ? (new Date(taken_at).toISOString().slice(0,7)) : undefined);
    let month_id: string | undefined;
    if (ym) {
      // Try fetch existing month row by (user_id, month_ym)
      const { data: mSel, error: mSelErr } = await supabase
        .from("months")
        .select("id")
        .eq("user_id", user_id)
        .eq("month_ym", ym)
        .maybeSingle();
      if (mSelErr) {
        return new Response(JSON.stringify({ error: mSelErr.message, where: "months(select)" }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
      month_id = mSel?.id as string | undefined;
      if (!month_id) {
        // Build start_date and end_date (NOT NULL in your schema)
        const [y, m] = ym.split("-").map((v) => parseInt(v, 10));
        const startDate = new Date(Date.UTC(y, m - 1, 1));
        const endDate = new Date(Date.UTC(y, m, 0)); // last day of month
        const fmt = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
        const { data: mIns, error: mInsErr } = await supabase
          .from("months")
          .insert({ user_id, month_ym: ym, start_date: fmt(startDate), end_date: fmt(endDate) })
          .select("id")
          .single();
        if (mInsErr) {
          return new Response(JSON.stringify({ error: mInsErr.message, where: "months(insert)" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
        month_id = (mIns as any)?.id as string;
      }
    }

    // Ensure photo row exists (upsert by id)
    if (taken_at || storage_path) {
      const { error: upsertErr } = await supabase.from("photos").upsert({
        id: photo_id,
        user_id,
        taken_at: taken_at ?? null,
        storage_path: storage_path ?? null,
        status: "uploaded",
        month_id: month_id ?? null,
      } as any, { onConflict: "id" });
      if (upsertErr) {
        return new Response(JSON.stringify({ error: upsertErr.message, where: "photos" }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    const mapped = items.map((it) => ({
      photo_id,
      raw_label: it.raw_label,
      confidence: it.confidence,
      packaged: Boolean(it.packaged),
      taxonomy_category: classify(it.raw_label) ?? it.taxonomy_category ?? "unmapped",
    }));

    const { error: insertErr, count } = await supabase.from("photo_items").insert(mapped, { count: "exact" });
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message, where: "photo_items" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Fire-and-forget summarize functions
    try {
      const dateStr = (taken_at ? new Date(taken_at) : new Date()).toISOString().slice(0, 10);
      const ymStr = ym ?? dateStr.slice(0, 7);
      const fnHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` };
      await fetch(`${supabaseUrl}/functions/v1/summarize-day`, {
        method: "POST",
        headers: fnHeaders,
        body: JSON.stringify({ user_id, date: dateStr }),
      }).catch(() => {});
      await fetch(`${supabaseUrl}/functions/v1/summarize-month`, {
        method: "POST",
        headers: fnHeaders,
        body: JSON.stringify({ user_id, month_ym: ymStr }),
      }).catch(() => {});
    } catch (_) {}

    return new Response(JSON.stringify({ ok: true, inserted: count ?? mapped.length }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

// Minimal in-function mapping of common labels → taxonomy categories.
function classify(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  const norm = key
    .replace(/\([^)]*\)/g, " ") // remove parentheses content
    .replace(/[^a-z0-9\s]/g, " ") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();

  // Heuristic contains-based mapping
  if (norm.includes("banana")) return "fruit";
  if (norm.includes("watermelon")) return "fruit";
  if (norm.includes("apple")) return "fruit";
  if (norm.includes("carrot")) return "vegetables";
  if (norm.includes("orange") && norm.includes("juice")) return "sugary drinks";

  const map: Record<string, string> = {
    "strawberries": "fruit",
    "banana": "fruit",
    "apple": "fruit",
    "watermelon": "fruit",
    "orange juice": "sugary drinks",
    "carrot": "vegetables",
    "spinach": "vegetables",
    "broccoli": "vegetables",
    "cornflakes": "low-fibre cereals",
    "bran flakes": "high-fibre cereals",
    "cola": "sugary drinks",
    "diet cola": "water",
    "smoked bacon": "processed meats",
    "tuna (canned in oil)": "oily fish",
    "milk": "dairy",
    "almonds": "nuts & seeds",
    "chocolate": "sweets & desserts",
    "french fries": "fried foods",
    "whole wheat bread": "whole grains",
    "white bread": "refined grains",
    "coffee": "coffee/tea (unsweetened)",
    "sweetened tea": "coffee/tea (sweetened)",
  };
  return map[key] || map[norm];
}


