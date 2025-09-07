/**
 * Deploy:
 *   supabase functions deploy summarize-month --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DayTotals = Record<string, number>;

type PatternFlags = {
  LOW_FIBRE?: boolean;
  HIGH_SUGARY_DRINKS?: boolean;
  LOW_OMEGA3?: boolean;
  HIGH_PROCESSED_MEAT?: boolean;
  HIGH_FIBRE_CEREAL_PRESENT?: boolean;
};

function evaluateMonthPatterns(
  totals3Days: Array<DayTotals>,
  ocrText?: string
): PatternFlags {
  const sumCat = (cat: string) =>
    totals3Days.reduce((acc, day) => acc + (day[cat] || 0), 0);

  const flags: PatternFlags = {};

  if (sumCat("fruit") + sumCat("vegetables") < 5) flags.LOW_FIBRE = true;
  if (sumCat("sugary drinks") >= 2) flags.HIGH_SUGARY_DRINKS = true;
  if (sumCat("oily fish") === 0) flags.LOW_OMEGA3 = true;
  if (sumCat("processed meats") >= 2) flags.HIGH_PROCESSED_MEAT = true;

  if (ocrText) {
    const t = ocrText.toLowerCase();
    if (t.includes("whole grain") || /\b6g\s*fibre\s*\/\s*100g\b/i.test(ocrText)) {
      flags.HIGH_FIBRE_CEREAL_PRESENT = true;
    }
  }

  return flags;
}

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

    // Generate pattern flags using rules
    const patternFlags = evaluateMonthPatterns(first3.map((d: any) => d.totals || {}));

    // Persist month_summaries
    const { error: upErr } = await supabase
      .from("month_summaries")
      .upsert({ user_id, month_ym, totals, pattern_flags: patternFlags }, { onConflict: 'user_id,month_ym' }) as any;
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true, totals, pattern_flags: patternFlags }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


