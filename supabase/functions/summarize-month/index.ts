/**
 * Deploy:
 *   supabase functions deploy summarize-month --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
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
    const { user_id, month_ym } = body as { user_id?: string; month_ym?: string };
    if (!user_id || !month_ym) {
      return new Response(JSON.stringify({ error: "Missing user_id or month_ym" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Fetch day_summaries for that month
    const { data: days, error } = await supabase
      .from("day_summaries")
      .select("date, totals")
      .gte("date", `${month_ym}-01`)
      .lte("date", `${month_ym}-31`)
      .eq("user_id", user_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    // Sum totals across the days (first 3 days for MVP)
    const first3 = (days ?? []).sort((a: any, b: any) => a.date.localeCompare(b.date)).slice(0, 3);
    const totals: Record<string, number> = {};
    for (const d of first3) {
      const t = (d as any).totals || {};
      for (const [k, v] of Object.entries(t)) {
        totals[k] = (totals[k] || 0) + (v as number);
      }
    }

    // Persist month_summaries
    const { error: upErr } = await supabase
      .from("month_summaries")
      .upsert({ user_id, month_ym, totals }, { onConflict: 'user_id,month_ym' }) as any;
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true, totals }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


