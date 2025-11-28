/**
 * Deploy:
 *   supabase functions deploy generate-goals --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = { user_id?: string; month_ym?: string };

interface PhotoItem {
  raw_label: string;
  confidence: number;
  packaged: boolean;
  taken_at: string;
}

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

    // Query actual photo items from this month
    const startDate = `${month_ym}-01`;
    const endDate = `${month_ym}-31`; // Safe overshoot

    const { data: items, error: itemsError } = await supabase
      .from("photo_items")
      .select("raw_label, confidence, packaged, taken_at")
      .eq("user_id", user_id)
      .gte("taken_at", startDate)
      .lte("taken_at", endDate)
      .order("taken_at", { ascending: true });

    if (itemsError) {
      console.error("Error fetching photo items:", itemsError);
      return new Response(JSON.stringify({ error: itemsError.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const photoItems = (items as PhotoItem[]) || [];

    // If no data, return early with empty goals
    if (photoItems.length === 0) {
      return new Response(JSON.stringify({
        goals: [],
        message: "No food data yet. Upload some photos to generate personalized goals!"
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Analyze patterns
    const foodCounts: Record<string, number> = {};
    const packagedCount = photoItems.filter(i => i.packaged).length;
    const totalCount = photoItems.length;
    const packagedRatio = totalCount > 0 ? Math.round((packagedCount / totalCount) * 100) : 0;

    // Group by food name (case-insensitive)
    photoItems.forEach(item => {
      const key = item.raw_label.toLowerCase();
      foodCounts[key] = (foodCounts[key] || 0) + 1;
    });

    // Get top foods
    const topFoods = Object.entries(foodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => `${name} (${count}x)`);

    // Group by time of day (if timestamps available)
    const morningFoods: string[] = [];
    const afternoonFoods: string[] = [];
    const eveningFoods: string[] = [];

    photoItems.forEach(item => {
      const hour = new Date(item.taken_at).getHours();
      const food = item.raw_label;
      if (hour >= 5 && hour < 12) morningFoods.push(food);
      else if (hour >= 12 && hour < 17) afternoonFoods.push(food);
      else if (hour >= 17 || hour < 5) eveningFoods.push(food);
    });

    // Categorize foods (simple heuristic)
    const vegetables = photoItems.filter(i =>
      /salad|lettuce|carrot|broccoli|spinach|kale|vegetable|tomato|cucumber/i.test(i.raw_label)
    ).length;
    const fruits = photoItems.filter(i =>
      /apple|banana|orange|berry|fruit|grape|melon|mango/i.test(i.raw_label)
    ).length;
    const proteins = photoItems.filter(i =>
      /chicken|beef|fish|egg|tofu|meat|protein|salmon/i.test(i.raw_label)
    ).length;
    const sweets = photoItems.filter(i =>
      /candy|chocolate|cookie|cake|dessert|ice cream|donut/i.test(i.raw_label)
    ).length;

    // Build context for AI
    const context = `
You are analyzing ${photoItems.length} food items tracked over ${month_ym}.

SPECIFIC FOODS CONSUMED:
${topFoods.join(", ")}

MEAL TIMING:
- Morning (5am-12pm): ${morningFoods.length} items - ${morningFoods.slice(0, 5).join(", ") || "none"}
- Afternoon (12pm-5pm): ${afternoonFoods.length} items - ${afternoonFoods.slice(0, 5).join(", ") || "none"}
- Evening (5pm-5am): ${eveningFoods.length} items - ${eveningFoods.slice(0, 5).join(", ") || "none"}

FOOD CATEGORIES DETECTED:
- Vegetables: ${vegetables} items
- Fruits: ${fruits} items
- Proteins: ${proteins} items
- Sweets/Desserts: ${sweets} items
- Packaged/Processed: ${packagedCount} items (${packagedRatio}% of total)

KEY PATTERNS TO ADDRESS:
${vegetables === 0 ? "⚠️ NO vegetables detected" : ""}
${fruits === 0 ? "⚠️ NO fruits detected" : ""}
${packagedRatio > 50 ? `⚠️ High processed food consumption (${packagedRatio}%)` : ""}
${morningFoods.length === 0 ? "⚠️ No breakfast foods logged" : ""}

Generate 3 specific, varied, actionable goals based on ACTUAL patterns above:
1. Focus on different aspects (variety, timing, specific categories)
2. Reference specific foods they're already eating
3. Be encouraging and realistic
4. Make each goal distinct (don't repeat themes)

Return strict JSON:
{
  "goals": [
    {"title": string (<=60), "why": string (<=120), "how": string (<=200), "fallback": string (<=120)}
  ]
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      contents: [{ parts: [{ text: context }] }],
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
