/**
 * Deploy:
 *   supabase functions deploy process-photo --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 * Local test:
 *   supabase functions serve --no-verify-jwt --env-file ../.env.local
 * Curl example:
 *   curl -s -X POST \
 *     -H 'Content-Type: application/json' \
 *     -d '{"photo_id":"00000000-0000-0000-0000-000000000000"}' \
 *     http://localhost:54321/functions/v1/process-photo | jq .
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReqBody = { photo_id?: string };

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
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const photoId = body.photo_id?.toString() ?? "";
    
    if (!photoId) {
      return new Response(JSON.stringify({ error: "Missing photo_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get photo details
    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("id, user_id, storage_path, taken_at, month_id")
      .eq("id", photoId)
      .single();

    if (photoError || !photo) {
      return new Response(JSON.stringify({ error: "Photo not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update photo status to processing
    await supabase
      .from("photos")
      .update({ status: "processing" })
      .eq("id", photoId);

    try {
      // Get signed URL for the photo
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("photos")
        .createSignedUrl(photo.storage_path!, 3600); // 1 hour expiry

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error("Failed to get signed URL");
      }

      // Call analyze-photo function
      const analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-photo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          photo_id: photoId,
          photo_url: signedUrlData.signedUrl,
        }),
      });

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        throw new Error(`Analyze photo failed: ${errorText}`);
      }

      const analysisResult = await analyzeResponse.json();
      console.log("Analysis result:", analysisResult);

      // Call save-photo-items function
      const saveResponse = await fetch(`${supabaseUrl}/functions/v1/save-photo-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          photo_id: photoId,
          user_id: photo.user_id,
          taken_at: photo.taken_at,
          storage_path: photo.storage_path,
          items: analysisResult.items || [],
          month_ym: photo.taken_at ? new Date(photo.taken_at).toISOString().slice(0, 7) : undefined,
        }),
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        throw new Error(`Save photo items failed: ${errorText}`);
      }

      const saveResult = await saveResponse.json();
      console.log("Save result:", saveResult);

      // Update photo status to processed
      await supabase
        .from("photos")
        .update({ status: "processed" })
        .eq("id", photoId);

      return new Response(JSON.stringify({ 
        ok: true, 
        photo_id: photoId,
        analysis: analysisResult,
        saved_items: saveResult.inserted || 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      // Update photo status to failed
      await supabase
        .from("photos")
        .update({ status: "failed" })
        .eq("id", photoId);

      return new Response(JSON.stringify({ 
        error: (error as Error).message,
        photo_id: photoId 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
