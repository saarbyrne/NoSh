"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function GoalsPage({
  params,
}: {
  params: Promise<{ monthId: string }>;
}) {
  type Goal = { title: string; why: string; how: string; fallback: string };
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string>("");
  const [saved, setSaved] = useState<string>("");
  useEffect(() => {
    (async () => {
      const { monthId } = await params;
      try {
        const supa = getSupabaseClient();
        const { data: session } = await supa.auth.getSession();
        const userId = session.session?.user.id;
        if (!userId) return setError("Not logged in");
        const res = await fetch("/api/edge-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fn: "generate-goals", user_id: userId, month_ym: monthId }),
        });
        const json = await res.json();
        const payload = json?.parsed ?? json;
        setGoals(payload?.goals ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [params]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Goals</h1>
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
      {saved ? <p className="text-green-600 text-sm">{saved}</p> : null}
      {!goals ? (
        <p className="text-muted">Generating…</p>
      ) : (
        <ol className="list-decimal pl-5 space-y-3">
          {goals.map((g, i) => (
            <li key={i}>
              <div className="font-medium">{g.title}</div>
              <div className="text-sm text-muted">Why: {g.why}</div>
              <div className="text-sm text-muted">How: {g.how}</div>
              <div className="text-xs text-muted">Fallback: {g.fallback}</div>
            </li>
          ))}
        </ol>
      )}
      {goals ? (
        <div className="mt-4">
          <button
            className="bg-black text-white rounded px-4 py-2"
            onClick={async () => {
              try {
                const { monthId } = await params;
                const supa = getSupabaseClient();
                const { data: session } = await supa.auth.getSession();
                const userId = session.session?.user.id;
                if (!userId) return setError("Not logged in");
                const res = await fetch("/api/edge-proxy", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fn: "submit-goals", user_id: userId, month_ym: monthId, goals }),
                });
                if (!res.ok) throw new Error(await res.text());
                setSaved("Saved goals ✅");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Error");
              }
            }}
          >
            Save goals
          </button>
        </div>
      ) : null}
    </div>
  );
}


