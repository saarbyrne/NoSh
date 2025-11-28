/**
 * Send WhatsApp Message via Twilio
 *
 * Utility function to send outbound WhatsApp messages to users
 * Used for goal notifications, weekly check-ins, etc.
 *
 * Deploy:
 *   supabase functions deploy send-whatsapp-message --no-verify-jwt
 *
 * Environment variables needed:
 *   - TWILIO_ACCOUNT_SID
 *   - TWILIO_AUTH_TOKEN
 *   - TWILIO_WHATSAPP_NUMBER (e.g., whatsapp:+14155238886 for sandbox)
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendMessageRequest {
  user_id?: string;
  phone_number?: string; // Either user_id or phone_number required
  message: string;
  media_url?: string; // Optional image/media URL
}

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get environment variables
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!twilioSid || !twilioToken || !twilioNumber || !supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing required environment variables" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body: SendMessageRequest = await req.json();

    if (!body.message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get phone number from user_id if needed
    let phoneNumber = body.phone_number;
    let userId = body.user_id;

    if (!phoneNumber && userId) {
      const { data: subscription } = await supabase
        .from("whatsapp_subscriptions")
        .select("phone_number")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (!subscription) {
        return new Response(
          JSON.stringify({ error: "User not subscribed to WhatsApp" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      phoneNumber = subscription.phone_number;
    }

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number or user_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure phone number has whatsapp: prefix
    const toNumber = phoneNumber.startsWith("whatsapp:")
      ? phoneNumber
      : `whatsapp:${phoneNumber}`;

    // Send via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append("From", twilioNumber);
    formData.append("To", toNumber);
    formData.append("Body", body.message);

    if (body.media_url) {
      formData.append("MediaUrl", body.media_url);
    }

    const twilioAuth = btoa(`${twilioSid}:${twilioToken}`);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${twilioAuth}`,
      },
      body: formData,
    });

    const twilioResponse = await response.json();

    if (!response.ok) {
      console.error("Twilio API error:", twilioResponse);
      return new Response(
        JSON.stringify({ error: "Failed to send message", details: twilioResponse }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Store in conversation history if we have user_id
    if (userId) {
      await supabase.from("whatsapp_conversations").insert({
        user_id: userId,
        phone_number: phoneNumber.replace("whatsapp:", ""),
        direction: "outbound",
        message_sid: twilioResponse.sid,
        message_body: body.message,
        message_status: twilioResponse.status,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_sid: twilioResponse.sid,
        status: twilioResponse.status,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-whatsapp-message:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
