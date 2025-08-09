"use client";
import { useState } from "react";
import { createUploadUrl, processPhoto } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMonthYM, toIsoSeconds } from "@/lib/date";

export default function UploadCard() {
  const [status, setStatus] = useState<string>("");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const now = new Date();
    try {
      setStatus("Requesting upload URL...");
      const { photo_id, signed_url, storage_path } = await createUploadUrl({
        month_ym: formatMonthYM(now),
        taken_at: toIsoSeconds(now),
      });

      setStatus("Uploading photo...");
      await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      setStatus("Processing...");
      // Build a public signed URL reference for the analyzer. Reuse the signed_url without query for path.
      const photoUrl = signed_url.split("?")[0];
      const result = await processPhoto({ photo_id, photo_url: photoUrl });

      setStatus("Done ✅");
      console.log("analyze-photo result", result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setStatus(message);
    }
  }

  return (
    <div className="p-4 border rounded-lg w-full max-w-md">
      <Input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        aria-label="Upload food photo"
      />
      <p className="text-sm mt-2 h-5" aria-live="polite">{status}</p>
      <div className="mt-3">
        <Button type="button" variant="secondary" disabled>
          Capture (coming soon)
        </Button>
      </div>
    </div>
  );
}


