"use client";
import { useState, useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";
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
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            Monthly Summary - {new Date(ym + "-01").toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
          </h1>
          <div className="flex gap-2">
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
        </div>
        <MonthSummaryClient ym={ym} />
      </div>
    </RequireAuth>
  );
}


