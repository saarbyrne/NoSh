/**
 * Deploy:
 *   supabase functions deploy submit-feedback --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 * Local test:
 *   supabase functions serve --no-verify-jwt --env-file ../.env.local
 * Curl example:
 *   curl -s -X POST \
 *     -H 'Content-Type: application/json' \
 *     -d '{"goal_set_id":"00000000-0000-0000-0000-000000000000","achieved":true,"liked":true,"repeat_next":false,"notes":"Great goals!"}' \
 *     http://localhost:54321/functions/v1/submit-feedback | jq .
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReqBody = {
  goal_set_id?: string;
  achieved?: boolean;
  liked?: boolean;
  repeat_next?: boolean;
  notes?: string;
};

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const { goal_set_id, achieved, liked, repeat_next, notes } = body;

    if (!goal_set_id) {
      return new Response(JSON.stringify({ error: "Missing goal_set_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify the goal set exists and get user_id
    const { data: goalSet, error: goalSetError } = await supabase
      .from("goal_sets")
      .select("id, user_id")
      .eq("id", goal_set_id)
      .single();

    if (goalSetError || !goalSet) {
      return new Response(JSON.stringify({ error: "Goal set not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if feedback already exists for this goal set
    const { data: existingFeedback, error: existingError } = await supabase
      .from("goal_feedback")
      .select("id")
      .eq("goal_set_id", goal_set_id)
      .single();

    let result;
    if (existingFeedback) {
      // Update existing feedback
      const { data, error } = await supabase
        .from("goal_feedback")
        .update({
          achieved,
          liked,
          repeat_next,
          notes: notes || null,
        })
        .eq("goal_set_id", goal_set_id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      result = { ...data, action: "updated" };
    } else {
      // Create new feedback
      const { data, error } = await supabase
        .from("goal_feedback")
        .insert({
          goal_set_id,
          user_id: goalSet.user_id,
          achieved,
          liked,
          repeat_next,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      result = { ...data, action: "created" };
    }

    // Update goal set status based on feedback
    let newStatus = "completed";
    if (achieved === false) {
      newStatus = "skipped";
    }

    await supabase
      .from("goal_sets")
      .update({ status: newStatus })
      .eq("id", goal_set_id);

    return new Response(JSON.stringify({ 
      ok: true, 
      feedback: result 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      error: (err as Error).message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
