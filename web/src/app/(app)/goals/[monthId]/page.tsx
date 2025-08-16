"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import RequireAuth from "@/components/RequireAuth";
import Link from "next/link";

interface Goal {
  title: string;
  why: string;
  how: string;
  fallback: string;
}

export default function GoalsPage({
  params,
}: {
  params: Promise<{ monthId: string }>;
}) {
  const [monthId, setMonthId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    params.then((p) => setMonthId(p.monthId));
  }, [params]);

  useEffect(() => {
    if (!monthId) return;

    const fetchGoals = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user.id;
        if (!userId) {
          setError("Not logged in");
          return;
        }

        const res = await fetch("/api/edge-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fn: "generate-goals", user_id: userId, month_ym: monthId }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const json = await res.json();
        const payload = json?.parsed ?? json;
        setGoals(payload?.goals ?? null);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Error generating goals";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [monthId, toast]);

  const handleSaveGoals = async () => {
    if (!monthId || !goals) return;
    
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) {
        throw new Error("Not logged in");
      }

      const res = await fetch("/api/edge-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fn: "submit-goals", user_id: userId, month_ym: monthId, goals }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast({
        title: "Goals Saved!",
        description: "Your goals have been successfully saved.",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error saving goals";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const currentDate = new Date();
  const today = currentDate.toISOString().split('T')[0];

  return (
    <RequireAuth>
      <div className="p-6 space-y-6">
        {/* Header with Navigation */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">
              Monthly Goals - {monthId ? new Date(monthId + "-01").toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'Loading...'}
            </h1>
            <p className="text-sm text-muted mt-1">
              AI-generated personalized goals based on your food patterns
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/day/${today}`}>
              <Button variant="outline" size="sm">
                Today&apos;s Summary
              </Button>
            </Link>
            <Link href={`/month/${monthId}`}>
              <Button variant="outline" size="sm">
                Monthly Summary
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="outline" size="sm">
                Upload Photo
              </Button>
            </Link>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <p className="text-muted">Generating personalized goals...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals Display */}
        {!loading && goals && (
          <div className="space-y-6">
            <div className="grid gap-4">
              {goals.map((goal, index) => (
                <Card key={index} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          Goal {index + 1}
                        </Badge>
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <span className="text-accent">Why</span>
                        <Badge variant="secondary" className="text-xs">Motivation</Badge>
                      </h4>
                      <p className="text-sm text-muted leading-relaxed">{goal.why}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <span className="text-accent">How</span>
                        <Badge variant="secondary" className="text-xs">Strategy</Badge>
                      </h4>
                      <p className="text-sm text-muted leading-relaxed">{goal.how}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <span className="text-accent">Fallback</span>
                        <Badge variant="secondary" className="text-xs">Plan B</Badge>
                      </h4>
                      <p className="text-sm text-muted leading-relaxed">{goal.fallback}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Save Button */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Save Your Goals</h3>
                    <p className="text-sm text-muted">
                      Save these goals to track your progress throughout the month
                    </p>
                  </div>
                  <Button 
                    onClick={handleSaveGoals} 
                    disabled={saving}
                    className="min-w-[120px]"
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </div>
                    ) : (
                      "Save Goals"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Goals State */}
        {!loading && !goals && !error && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-muted">No goals generated yet.</p>
                <p className="text-sm text-muted">
                  Upload more photos to generate personalized goals based on your eating patterns.
                </p>
                <Link href="/upload">
                  <Button>Upload Photo</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RequireAuth>
  );
}


