"use client";
import { useState } from "react";
import { createUploadUrl, processPhoto, savePhotoItems } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VisionItem = { raw_label: string; confidence: number; packaged?: boolean };
type AnalyzeResult = { photo_id?: string; items?: VisionItem[] };
import { formatMonthYM, toIsoSeconds } from "@/lib/date";

export default function UploadCard() {
  const [status, setStatus] = useState<string>("");
  const { push } = useToast();
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const now = new Date();
    try {
      setStatus("Requesting upload URL...");
      const res = await createUploadUrl({
        month_ym: formatMonthYM(now),
        taken_at: toIsoSeconds(now),
      });
      const photo_id = (res as { photo_id?: string })?.photo_id;
      const signed_url = (res as { signed_url?: string })?.signed_url;
      if (!photo_id || !signed_url) {
        push(`Failed to get upload URL`);
        setStatus("Failed to get upload URL");
        console.error("create-upload-url response", res);
        return;
      }

      setStatus("Uploading photo...");
      const putResp = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putResp.ok) {
        const text = await putResp.text();
        push(`Upload failed: ${putResp.status}`);
        setStatus(`Upload failed: ${putResp.status}`);
        console.error("PUT upload error", text);
        return;
      }

      setStatus("Processing...");
      // Build a public signed URL reference for the analyzer. Reuse the signed_url without query for path.
      const photoUrl = signed_url?.includes("?") ? signed_url.split("?")[0] : signed_url;
      // Photo row will be created server-side by save-photo-items function
      const result = await processPhoto({ photo_id, photo_url: photoUrl });

      setStatus("Done ✅");
      console.log("analyze-photo result", result);

      // Normalize proxy vs direct response
      let payload: unknown = result;
      if (result && typeof result === "object" && (result as { parsed?: unknown }).parsed !== undefined) {
        payload = (result as { parsed?: unknown }).parsed;
      }
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          // ignore
        }
      }
      if (payload && typeof payload === "object") {
        const maybe = payload as AnalyzeResult;
        if (Array.isArray(maybe.items)) {
          setAnalysis(maybe);
          const top = [...maybe.items]
            .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
            .slice(0, 3)
            .map((i) => i.raw_label)
            .join(", ");
          if (top) push(`Detected: ${top}`);

          try {
            await savePhotoItems(photo_id, maybe.items, {
              user_id: (await (await import("@/lib/supabaseClient")).getSupabaseClient().auth.getUser()).data.user?.id,
              taken_at: toIsoSeconds(now),
              storage_path: new URL(photoUrl).pathname,
            });
          } catch (dbErr) {
            console.error("savePhotoItems error", dbErr);
            push("Saved locally only (DB insert failed)");
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setStatus(message);
      push(message);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {analysis?.items && analysis.items.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Detected items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {analysis.items
                .slice()
                .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
                .slice(0, 5)
                .map((it, idx) => (
                  <li key={`${it.raw_label}-${idx}`} className="flex items-center justify-between">
                    <span>
                      {it.raw_label}
                      {it.packaged ? <span className="ml-2 text-muted">(packaged)</span> : null}
                    </span>
                    <span className="text-muted">{(it.confidence * 100).toFixed(0)}%</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}


