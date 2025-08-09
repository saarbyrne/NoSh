/**
 * Deploy:
 *   supabase functions deploy summarize-day --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing env" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const { user_id, date } = body as { user_id?: string; date?: string };
    if (!user_id || !date) {
      return new Response(JSON.stringify({ error: "Missing user_id or date" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Aggregate photo_items by taxonomy_category for the given day
    const { data: items, error } = await supabase
      .from("photo_items")
      .select("taxonomy_category, photo_id, created_at")
      .gte("created_at", `${date}T00:00:00Z`)
      .lte("created_at", `${date}T23:59:59Z`);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    const totals: Record<string, number> = {};
    for (const it of items ?? []) {
      const cat = (it as any).taxonomy_category as string;
      totals[cat] = (totals[cat] || 0) + 1;
    }

    // Upsert into day_summaries
    const { error: upErr } = await supabase
      .from("day_summaries")
      .upsert({ user_id, date, totals }) as any;
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true, totals }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


