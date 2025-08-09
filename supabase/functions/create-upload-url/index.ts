/**
 * Deploy:
 *   supabase functions deploy create-upload-url --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 * Local test:
 *   supabase functions serve --no-verify-jwt --env-file ../.env.local
 * Curl example (replace content-type on upload):
 *   curl -s -X POST -H 'Content-Type: application/json' -d '{"month_ym":"2025-08","taken_at":"2025-08-09T12:00:00Z"}' \
 *     http://localhost:54321/functions/v1/create-upload-url | jq .
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReqBody = { month_ym?: string; taken_at?: string };

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(url, serviceRoleKey);

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const ym = body.month_ym ?? "";
    const takenAt = body.taken_at ?? "";
    const photoId = crypto.randomUUID();

    // You can structure paths by month if desired
    const storagePath = ym ? `${ym}/${photoId}` : photoId;

    // Create signed upload URL in the 'photos' bucket.
    const { data, error } = await supabase.storage
      .from("photos")
      .createSignedUploadUrl(storagePath, { upsert: true });
    if (error || !data?.signedUrl) {
      return new Response(JSON.stringify({ error: error?.message || "Failed to create signed upload URL" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = {
      photo_id: photoId,
      signed_url: data.signedUrl,
      storage_path: storagePath,
      month_ym: ym || undefined,
      taken_at: takenAt || undefined,
    };

    return new Response(JSON.stringify(response), {
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


