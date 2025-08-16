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
      <div className="min-h-screen bg-background">
        <Header title={`Monthly Summary - ${new Date(ym + "-01").toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}`} />
        <div className="pt-20 p-6 space-y-6">
          <div className="flex justify-end gap-2">
            <Link href={`/day/${today}`}>
              <Button variant="outline" size="sm">
                Today&apos;s Summary
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="outline" size="sm">
                Upload Photo
              </Button>
            </Link>
            <Link href={`/goals/${ym}`}>
              <Button variant="outline" size="sm">
                View Goals
              </Button>
            </Link>
          </div>
          <MonthSummaryClient ym={ym} />
        </div>
      </div>
    </RequireAuth>
  );
}


