"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function MonthSummaryClient({ ym }: { ym: string }) {
  const [totals, setTotals] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const run = async () => {
      const supa = getSupabaseClient();
      const { data: session } = await supa.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) {
        setTotals({});
        return;
      }
      const { data } = await supa
        .from("month_summaries")
        .select("totals")
        .eq("user_id", userId)
        .eq("month_ym", ym)
        .maybeSingle();
      const t = (data && typeof data === "object" && "totals" in data ? (data as { totals: Record<string, number> }).totals : {}) || {};
      if (Object.keys(t).length > 0) {
        setTotals(t);
        return;
      }

      // Fallback: aggregate directly from photos -> photo_items for this month
      const { data: monthRow } = await supa
        .from("months")
        .select("id")
        .eq("user_id", userId)
        .eq("month_ym", ym)
        .maybeSingle();
      const monthId = (monthRow as any)?.id as string | undefined;
      if (!monthId) {
        setTotals({});
        return;
      }
      const { data: photos } = await supa
        .from("photos")
        .select("id")
        .eq("month_id", monthId);
      const photoIds = (photos ?? []).map((p: any) => p.id);
      if (photoIds.length === 0) {
        setTotals({});
        return;
      }
      const { data: items } = await supa
        .from("photo_items")
        .select("taxonomy_category, photo_id")
        .in("photo_id", photoIds);
      const agg: Record<string, number> = {};
      for (const it of items ?? []) {
        const cat = (it as any).taxonomy_category || "unmapped";
        agg[cat] = (agg[cat] || 0) + 1;
      }
      setTotals(agg);
    };
    run();
  }, [ym]);

  if (totals == null) return <p className="text-muted">Loading…</p>;
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <p className="text-muted">No data yet.</p>;
  return (
    <ul className="text-sm space-y-1">
      {entries.map(([cat, count]) => (
        <li key={cat} className="flex justify-between">
          <span>{cat}</span>
          <span className="text-muted">{count}</span>
        </li>
      ))}
    </ul>
  );
}


