"use client";
import UploadCard from "@/components/UploadCard";
import RequireAuth from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function UploadPage() {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <RequireAuth>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Upload a photo</h1>
          <div className="flex gap-2">
            <Link href={`/day/${today}`}>
              <Button variant="outline" size="sm">
                Today&apos;s Summary
              </Button>
            </Link>
            <Link href={`/month/${currentMonth}`}>
              <Button variant="outline" size="sm">
                Monthly Summary
              </Button>
            </Link>
          </div>
        </div>
        <UploadCard />
      </div>
    </RequireAuth>
  );
}


