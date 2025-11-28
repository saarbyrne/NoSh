/**
 * WhatsApp Webhook Handler
 *
 * Receives incoming WhatsApp messages from Twilio and responds with AI-generated replies
 * Uses Gemini AI with user's nutrition context for personalized conversations
 *
 * Deploy:
 *   supabase functions deploy whatsapp-webhook --no-verify-jwt
 *
 * Environment variables needed:
 *   - GEMINI_API_KEY
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - TWILIO_AUTH_TOKEN (for webhook signature verification)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface TwilioWebhookBody {
  MessageSid: string;
  From: string; // Phone number with whatsapp: prefix
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

interface UserContext {
  user_id: string;
  recent_goals?: any[];
  recent_patterns?: any;
  conversation_history?: any[];
}

serve(async (req: Request) => {
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      console.error("Missing required environment variables");
      return new Response("Server configuration error", { status: 500 });
    }

    // Parse Twilio webhook payload (form-urlencoded)
    const formData = await req.formData();
    const webhookData: TwilioWebhookBody = {
      MessageSid: formData.get("MessageSid")?.toString() || "",
      From: formData.get("From")?.toString() || "",
      To: formData.get("To")?.toString() || "",
      Body: formData.get("Body")?.toString() || "",
      NumMedia: formData.get("NumMedia")?.toString(),
      MediaUrl0: formData.get("MediaUrl0")?.toString(),
      MediaContentType0: formData.get("MediaContentType0")?.toString(),
    };

    console.log("Received WhatsApp message:", {
      from: webhookData.From,
      body: webhookData.Body,
      hasMedia: !!webhookData.NumMedia,
    });

    // Extract phone number (remove whatsapp: prefix)
    const phoneNumber = webhookData.From.replace("whatsapp:", "");

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user_id from phone number
    const { data: subscription, error: subError } = await supabase
      .from("whatsapp_subscriptions")
      .select("user_id, is_active")
      .eq("phone_number", phoneNumber)
      .eq("is_active", true)
      .single();

    if (subError || !subscription) {
      console.error("User not found for phone:", phoneNumber);
      return sendTwiMLResponse(
        "Welcome to NoSh! To use WhatsApp features, please link your phone number in the app first."
      );
    }

    const userId = subscription.user_id;

    // Store incoming message
    await supabase.from("whatsapp_conversations").insert({
      user_id: userId,
      phone_number: phoneNumber,
      direction: "inbound",
      message_sid: webhookData.MessageSid,
      message_body: webhookData.Body,
      media_url: webhookData.MediaUrl0 ? [webhookData.MediaUrl0] : null,
      message_status: "received",
    });

    // Handle media uploads (photos)
    if (webhookData.NumMedia && parseInt(webhookData.NumMedia) > 0) {
      const response = await handlePhotoUpload(
        supabase,
        userId,
        webhookData.MediaUrl0!,
        geminiKey
      );
      return sendTwiMLResponse(response);
    }

    // Handle text commands and conversations
    const userContext = await getUserContext(supabase, userId);
    const aiResponse = await getAIResponse(
      webhookData.Body,
      userContext,
      geminiKey
    );

    // Store outgoing message
    await supabase.from("whatsapp_conversations").insert({
      user_id: userId,
      phone_number: phoneNumber,
      direction: "outbound",
      message_body: aiResponse,
      message_status: "sent",
    });

    return sendTwiMLResponse(aiResponse);

  } catch (error) {
    console.error("Error in whatsapp-webhook:", error);
    return sendTwiMLResponse(
      "Sorry, I encountered an error processing your message. Please try again later."
    );
  }
});

/**
 * Get user's nutrition context for AI conversation
 */
async function getUserContext(supabase: any, userId: string): Promise<UserContext> {
  // Get recent goals
  const { data: goals } = await supabase
    .from("goal_sets")
    .select("goals, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get recent month summary for patterns
  const { data: monthSummary } = await supabase
    .from("month_summaries")
    .select("*")
    .eq("user_id", userId)
    .order("month_ym", { ascending: false })
    .limit(1)
    .single();

  // Get recent conversation history
  const { data: history } = await supabase
    .from("whatsapp_conversations")
    .select("direction, message_body, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    user_id: userId,
    recent_goals: goals ? goals.goals : [],
    recent_patterns: monthSummary,
    conversation_history: history || [],
  };
}

/**
 * Generate AI response using Gemini with user context
 */
async function getAIResponse(
  userMessage: string,
  context: UserContext,
  geminiKey: string
): Promise<string> {
  // Check for simple commands first
  const lowerMessage = userMessage.toLowerCase().trim();

  if (lowerMessage === "help" || lowerMessage === "menu") {
    return `🍎 NoSh WhatsApp Commands:

📸 *Photo* - Send a food photo to analyze
🎯 *Goals* - View your current nutrition goals
📊 *Stats* - See your eating patterns
❓ *Ask me anything* about your nutrition

Just send a message and I'll help!`;
  }

  if (lowerMessage === "goals") {
    if (!context.recent_goals || context.recent_goals.length === 0) {
      return "You don't have any goals yet. Upload at least 3 food photos over 3 days to generate personalized goals!";
    }

    return formatGoalsMessage(context.recent_goals);
  }

  // Use Gemini for conversational AI
  const systemPrompt = buildSystemPrompt(context);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt + "\n\nUser message: " + userMessage }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error("Gemini API error:", await response.text());
    return "I'm having trouble thinking right now. Could you try asking again?";
  }

  const data = await response.json();
  const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

  return aiResponse || "I didn't quite understand that. Try asking about your goals or nutrition patterns!";
}

/**
 * Build system prompt with user context
 */
function buildSystemPrompt(context: UserContext): string {
  let prompt = `You are NoSh, a friendly nutrition assistant chatting via WhatsApp.

Your role:
- Help users understand their eating patterns
- Answer questions about their personalized nutrition goals
- Provide encouragement and practical advice
- Keep responses SHORT (2-3 sentences max) - this is WhatsApp!
- Use emojis occasionally to be friendly
- Be supportive, not preachy

`;

  if (context.recent_goals && context.recent_goals.length > 0) {
    prompt += `\nUser's current goals:\n`;
    context.recent_goals.forEach((goal: any, i: number) => {
      prompt += `${i + 1}. ${goal.title}\n   Why: ${goal.why}\n   How: ${goal.how}\n`;
    });
  }

  if (context.recent_patterns) {
    const patterns = context.recent_patterns;
    prompt += `\nRecent eating patterns:\n`;
    if (patterns.high_sugar) prompt += "- High sugar intake\n";
    if (patterns.high_processed) prompt += "- High processed foods\n";
    if (patterns.low_whole_foods) prompt += "- Low whole foods\n";
    if (patterns.high_caffeine) prompt += "- High caffeine\n";
  }

  if (context.conversation_history && context.conversation_history.length > 0) {
    prompt += `\nRecent conversation:\n`;
    context.conversation_history
      .slice(0, 5)
      .reverse()
      .forEach((msg: any) => {
        const role = msg.direction === "inbound" ? "User" : "You";
        prompt += `${role}: ${msg.message_body}\n`;
      });
  }

  return prompt;
}

/**
 * Format goals as WhatsApp message
 */
function formatGoalsMessage(goals: any[]): string {
  let message = "🎯 *Your Nutrition Goals*\n\n";

  goals.forEach((goal: any, i: number) => {
    message += `*${i + 1}. ${goal.title}*\n`;
    message += `💡 Why: ${goal.why}\n`;
    message += `✅ How: ${goal.how}\n\n`;
  });

  message += "Reply with questions about any goal!";
  return message;
}

/**
 * Handle photo upload via WhatsApp
 */
async function handlePhotoUpload(
  supabase: any,
  userId: string,
  mediaUrl: string,
  geminiKey: string
): Promise<string> {
  // TODO: Implement photo upload flow
  // 1. Download media from Twilio URL
  // 2. Upload to Supabase storage
  // 3. Trigger analyze-photo function
  // 4. Return processing confirmation

  return "📸 Photo received! I'm analyzing it now... I'll send you the results in a moment. (This feature is coming soon!)";
}

/**
 * Send TwiML response back to Twilio
 */
function sendTwiMLResponse(message: string): Response {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
