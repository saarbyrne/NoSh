/**
 * Deploy:
 *   supabase functions deploy analyze-photo --no-verify-jwt
 * Local test:
 *   supabase functions serve --no-verify-jwt --env-file ../.env.local
 * Curl example:
 *   curl -s -X POST \
 *     -H 'Content-Type: application/json' \
 *     -d '{"photo_url":"https://...signed-url","photo_id":"00000000-0000-0000-0000-000000000000"}' \
 *     http://localhost:54321/functions/v1/analyze-photo | jq .
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type ReqBody = { photo_url?: string; photo_id?: string };

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const photoUrl = body.photo_url?.toString() ?? "";
    const photoId = body.photo_id?.toString() ?? "";
    if (!photoUrl || !photoId) {
      return new Response(JSON.stringify({ error: "Missing photo_url or photo_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const prompt = `Identify foods/drinks in this image.\nReturn strict JSON:\n{\n  "photo_id": string,\n  "items": [\n    { "raw_label": string, "confidence": number, "packaged": boolean }\n  ]\n}\n- confidence is between 0 and 1\n- packaged=true if it's a commercial product`;

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            { text: `photo_url: ${photoUrl}` },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    };

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return new Response(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // The Gemini response is JSON, but the model output may place the strict JSON
    // inside candidates[0].content.parts[0].text as a string. Extract it.
    let root: any;
    try {
      root = JSON.parse(text);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to parse upstream JSON", raw: text }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    let finalObj: unknown = root;
    try {
      const txt = root?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof txt === "string") {
        finalObj = JSON.parse(txt);
      }
    } catch (_e) {
      // fall back to root
    }

    console.log({ parsed: finalObj });
    return new Response(JSON.stringify(finalObj), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});


