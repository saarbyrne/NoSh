"use client";
import { useState } from "react";
import PhotoUploadForm from "@/components/PhotoUploadForm";
import RequireAuth from "@/components/RequireAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { createUploadUrl, processPhoto, savePhotoItems } from "@/lib/api";
import { formatMonthYM, toIsoSeconds } from "@/lib/date";

interface DetectedItem {
  raw_label: string;
  confidence: number;
  packaged?: boolean;
}

interface Photo {
  id: string;
  url: string;
  file?: File;
  detectedItems?: DetectedItem[];
}

export default function UploadPage() {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { push } = useToast();

  const handlePhotoUpload = async (file: File): Promise<Photo> => {
    const now = new Date();

    // Create upload URL
    const res = await createUploadUrl({
      month_ym: formatMonthYM(now),
      taken_at: toIsoSeconds(now),
    });

    const photo_id = (res as { photo_id?: string })?.photo_id;
    const signed_url = (res as { signed_url?: string })?.signed_url;
    const storage_path = (res as { storage_path?: string })?.storage_path;

    if (!photo_id || !signed_url) {
      throw new Error("Failed to get upload URL");
    }

    // Upload file
    const putResp = await fetch(signed_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!putResp.ok) {
      throw new Error(`Upload failed: ${putResp.status}`);
    }

    // Process photo with AI
    const photoUrl = signed_url?.includes("?") ? signed_url.split("?")[0] : signed_url;
    const result = await processPhoto({ photo_id, photo_url: photoUrl });

    // Extract detected items from AI response
    const items = (result as any)?.items || [];
    const detectedItems: DetectedItem[] = items.map((item: any) => ({
      raw_label: item.raw_label || item.label || "Unknown",
      confidence: item.confidence || 0,
      packaged: item.packaged || false,
    }));

    // Save detected items to database
    if (detectedItems.length > 0) {
      try {
        await savePhotoItems(photo_id, detectedItems, {
          taken_at: toIsoSeconds(now),
          storage_path,
        });
        console.log(`Saved ${detectedItems.length} items for photo ${photo_id}`);
      } catch (saveError) {
        console.error("Failed to save photo items:", saveError);
        // Continue anyway - we still show the items to the user
      }
    }

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);

    return {
      id: photo_id,
      url: objectUrl,
      file,
      detectedItems,
    };
  };

  const handlePhotoDelete = async (photoId: string) => {
    // Clean up object URL and handle deletion
    console.log("Deleting photo:", photoId);
  };

  const handleFinishDay = async (photos: Photo[], notes: string, date: Date) => {
    try {
      push("Analyzing your photos...");
      
      // Here you would typically save the notes and trigger analysis
      console.log("Finishing day with:", { photos: photos.length, notes, date });
      
      // Navigate to day summary
      const dateStr = date.toISOString().split('T')[0];
      window.location.href = `/day/${dateStr}`;
    } catch (error) {
      push("Failed to finish day");
      console.error("Finish day error:", error);
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background pb-24">
        <Header
          title="Add Meals"
          subtitle="Upload photos of your meals and snacks"
        />

        <div className="pt-20 p-4 sm:p-6 max-w-4xl mx-auto pb-24">
          <PhotoUploadForm
            onPhotoUpload={handlePhotoUpload}
            onPhotoDelete={handlePhotoDelete}
            onFinishDay={handleFinishDay}
          />
        </div>
      </div>
    </RequireAuth>
  );
}


