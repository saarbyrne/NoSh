"use client";
import { useState, useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";
import Header from "@/components/Header";
import MonthSummaryClient from "@/components/MonthSummaryClient";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MonthPage({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const [ym, setYm] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setYm(p.ym));
  }, [params]);

  if (!ym) {
    return <div className="p-6 text-muted">Loading...</div>;
  }

  const currentDate = new Date();
  const today = currentDate.toISOString().split('T')[0];

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background pb-24">
        <Header title={`Month - ${new Date(ym + "-01").toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}`} />
        <div className="pt-20 p-4 sm:p-6 max-w-4xl mx-auto pb-24 space-y-6">
          <MonthSummaryClient ym={ym} />
        </div>
      </div>
    </RequireAuth>
  );
}


