"use client";
import DaySummary from "@/components/DaySummary";
import RequireAuth from "@/components/RequireAuth";
import Header from "@/components/Header";
import { useState, useEffect } from "react";

export default function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const [date, setDate] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setDate(p.date));
  }, [params]);

  if (!date) {
    return <div className="p-6 text-muted">Loading...</div>;
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background">
        <Header title={`Day Summary - ${new Date(date).toLocaleDateString()}`} />
        <div className="pt-20 p-6">
          <DaySummary date={date} />
        </div>
      </div>
    </RequireAuth>
  );
}


