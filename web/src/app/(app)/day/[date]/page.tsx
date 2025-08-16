"use client";
import DaySummary from "@/components/DaySummary";
import RequireAuth from "@/components/RequireAuth";
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
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">
          Day Summary - {new Date(date).toLocaleDateString()}
        </h1>
        <DaySummary date={date} />
      </div>
    </RequireAuth>
  );
}


