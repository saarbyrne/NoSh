/**
 * Notify User of New Goals via WhatsApp
 *
 * Called after goals are generated to send them via WhatsApp
 * Can be triggered manually or automatically via database trigger
 *
 * Deploy:
 *   supabase functions deploy notify-goals-via-whatsapp --no-verify-jwt
 *
 * Request body:
 *   { "goal_set_id": "uuid" }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const goalSetId = body.goal_set_id;

    if (!goalSetId) {
      return new Response(
        JSON.stringify({ error: "goal_set_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get goal set
    const { data: goalSet, error: goalError } = await supabase
      .from("goal_sets")
      .select("user_id, goals, month_ym")
      .eq("id", goalSetId)
      .single();

    if (goalError || !goalSet) {
      return new Response(
        JSON.stringify({ error: "Goal set not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user has WhatsApp enabled with goals notifications
    const { data: subscription } = await supabase
      .from("whatsapp_subscriptions")
      .select("phone_number, preferences")
      .eq("user_id", goalSet.user_id)
      .eq("is_active", true)
      .single();

    if (!subscription) {
      return new Response(
        JSON.stringify({ success: false, message: "User not subscribed to WhatsApp" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!subscription.preferences?.goals_notification) {
      return new Response(
        JSON.stringify({ success: false, message: "User disabled goal notifications" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format goals message
    const message = formatGoalsNotification(goalSet.goals, goalSet.month_ym);

    // Send via send-whatsapp-message function
    const sendResponse = await supabase.functions.invoke("send-whatsapp-message", {
      body: {
        user_id: goalSet.user_id,
        message: message,
      },
    });

    if (sendResponse.error) {
      console.error("Error sending WhatsApp message:", sendResponse.error);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: sendResponse.error }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Goals sent via WhatsApp" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in notify-goals-via-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function formatGoalsNotification(goals: any[], monthYm: string): string {
  const [year, month] = monthYm.split("-");
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' });

  let message = `🎯 *Your ${monthName} Nutrition Goals Are Ready!*\n\n`;
  message += `Based on your eating patterns, here are 3 personalized goals:\n\n`;

  goals.forEach((goal: any, i: number) => {
    message += `*${i + 1}. ${goal.title}*\n`;
    message += `💡 ${goal.why}\n`;
    message += `✅ ${goal.how}\n\n`;
  });

  message += `💬 Reply to this message with any questions about your goals!\n\n`;
  message += `Try:\n`;
  message += `• "Why should I ${goals[0]?.title?.toLowerCase()}?"\n`;
  message += `• "Show me my eating patterns"\n`;
  message += `• "Help" for more commands`;

  return message;
}
