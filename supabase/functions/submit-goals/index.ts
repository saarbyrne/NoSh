/**
 * Deploy:
 *   supabase functions deploy submit-goals --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Goal = { title: string; why: string; how: string; fallback: string };
type Body = { user_id?: string; month_ym?: string; goals?: Goal[] };

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing env" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json().catch(() => ({}))) as Body;
    const { user_id, month_ym } = body;
    const goals = Array.isArray(body.goals) ? body.goals : [];
    if (!user_id || !month_ym || goals.length !== 3) {
      return new Response(JSON.stringify({ error: "Missing user_id, month_ym or goals (length 3)" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { error } = await supabase
      .from("goal_sets")
      .upsert({ user_id, month_ym, goals }, { onConflict: "user_id,month_ym" } as any);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


