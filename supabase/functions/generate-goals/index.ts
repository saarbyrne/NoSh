/**
 * Deploy:
 *   supabase functions deploy generate-goals --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = { user_id?: string; month_ym?: string };

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing env" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = (await req.json().catch(() => ({}))) as Body;
    const { user_id, month_ym } = body;
    if (!user_id || !month_ym) {
      return new Response(JSON.stringify({ error: "Missing user_id or month_ym" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { data: ms, error } = await supabase
      .from("month_summaries")
      .select("totals")
      .eq("user_id", user_id)
      .eq("month_ym", month_ym)
      .maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    const totals = (ms as any)?.totals || {};

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const instructions = `You are a nutrition assistant. Based on these category totals for the past 3 days in month ${month_ym}, write 3 simple, actionable goals. Keep them realistic, specific, and kind.
Totals JSON:
${JSON.stringify(totals)}
Return strict JSON with this schema:
{
  "goals": [
    {"title": string (<=60), "why": string (<=120), "how": string (<=200), "fallback": string (<=120)}
  ]
}`;

    const payload = {
      contents: [{ parts: [{ text: instructions }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      return new Response(text, { status: upstream.status, headers: { "Content-Type": "application/json" } });
    }

    let root: any;
    try {
      root = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse upstream JSON" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    let goalsObj: unknown = root;
    try {
      const inner = root?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof inner === "string") goalsObj = JSON.parse(inner);
    } catch { /* keep root */ }

    return new Response(JSON.stringify(goalsObj), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


