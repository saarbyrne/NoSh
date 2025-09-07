/**
 * Deploy:
 *   supabase functions deploy delete-old-photos --no-verify-jwt --project-ref hbryhtpqdgmywrnapaaf
 * Schedule:
 *   supabase functions deploy delete-old-photos --no-verify-jwt
 *   # Then set up cron job in Supabase dashboard or via SQL
 * 
 * This function should be called daily via cron to delete photos older than 30 days
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    console.log(`Deleting photos older than: ${cutoffDate}`);

    // Find photos older than 30 days
    const { data: oldPhotos, error: selectError } = await supabase
      .from("photos")
      .select("id, storage_path, user_id")
      .lt("created_at", cutoffDate)
      .not("storage_path", "is", null);

    if (selectError) {
      console.error("Error selecting old photos:", selectError);
      return new Response(JSON.stringify({ error: selectError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!oldPhotos || oldPhotos.length === 0) {
      return new Response(JSON.stringify({ 
        ok: true, 
        message: "No old photos to delete",
        deleted_count: 0 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${oldPhotos.length} old photos to delete`);

    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Delete photos from storage and database
    for (const photo of oldPhotos) {
      try {
        // Delete from storage
        if (photo.storage_path) {
          const { error: storageError } = await supabase.storage
            .from("photos")
            .remove([photo.storage_path]);

          if (storageError) {
            console.error(`Storage delete error for ${photo.id}:`, storageError);
            errors.push(`Storage error for ${photo.id}: ${storageError.message}`);
            errorCount++;
            continue;
          }
        }

        // Delete from database (this will cascade to photo_items)
        const { error: dbError } = await supabase
          .from("photos")
          .delete()
          .eq("id", photo.id);

        if (dbError) {
          console.error(`Database delete error for ${photo.id}:`, dbError);
          errors.push(`Database error for ${photo.id}: ${dbError.message}`);
          errorCount++;
          continue;
        }

        deletedCount++;
        console.log(`Successfully deleted photo ${photo.id}`);

      } catch (error) {
        console.error(`Unexpected error deleting photo ${photo.id}:`, error);
        errors.push(`Unexpected error for ${photo.id}: ${(error as Error).message}`);
        errorCount++;
      }
    }

    const result = {
      ok: true,
      deleted_count: deletedCount,
      error_count: errorCount,
      total_found: oldPhotos.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Delete operation completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unexpected error in delete-old-photos:", err);
    return new Response(JSON.stringify({ 
      error: (err as Error).message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
