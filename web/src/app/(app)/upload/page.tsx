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

interface Photo {
  id: string;
  url: string;
  file?: File;
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

    // Process photo
    const photoUrl = signed_url?.includes("?") ? signed_url.split("?")[0] : signed_url;
    const result = await processPhoto({ photo_id, photo_url: photoUrl });

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);

    return {
      id: photo_id,
      url: objectUrl,
      file,
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
      <div className="min-h-screen bg-background pb-20">
        <Header 
          title="Log Your Day" 
          subtitle="Upload photos of your meals and snacks"
          actions={
            <div className="flex gap-2">
              <Link href={`/day/${today}`}>
                <Button variant="secondary" size="sm">
                  Today&apos;s Summary
                </Button>
              </Link>
              <Link href={`/month/${currentMonth}`}>
                <Button variant="secondary" size="sm">
                  Monthly Summary
                </Button>
              </Link>
            </div>
          }
        />
        
        <div className="p-4">
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


