"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Target, Calendar, Camera, CheckCircle, XCircle } from "lucide-react";
import GoalsView from "./GoalsView";
import Link from "next/link";

interface MonthSummaryData {
  totals: Record<string, number>;
  pattern_flags: Record<string, boolean>;
  photos: Array<{
    id: string;
    taken_at: string;
    storage_path: string;
    photo_items: Array<{
      raw_label: string;
      confidence: number;
      packaged: boolean;
      taxonomy_category: string;
    }>;
  }>;
}

export default function MonthSummaryClient({ ym }: { ym: string }) {
  const [summary, setSummary] = useState<MonthSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGoals, setShowGoals] = useState(false);

  useEffect(() => {
    const fetchMonthSummary = async () => {
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

        // First try to get pre-calculated summary
        const { data: monthSummary, error: summaryError } = await supabase
          .from("month_summaries")
          .select("totals, pattern_flags")
          .eq("user_id", userId)
          .eq("month_ym", ym)
          .single();

        if (summaryError && summaryError.code !== 'PGRST116') {
          throw new Error(summaryError.message);
        }

        // Get photos for this month
        const { data: monthRow } = await supabase
          .from("months")
          .select("id")
          .eq("user_id", userId)
          .eq("month_ym", ym)
          .maybeSingle();

        const monthId = (monthRow as { id?: string })?.id;
        if (!monthId) {
          setSummary({ totals: {}, pattern_flags: {}, photos: [] });
          return;
        }

        const { data: photos, error: photosError } = await supabase
          .from("photos")
          .select(`
            id,
            taken_at,
            storage_path,
            photo_items (
              raw_label,
              confidence,
              packaged,
              taxonomy_category
            )
          `)
          .eq("month_id", monthId)
          .order("taken_at", { ascending: false });

        if (photosError) {
          throw new Error(photosError.message);
        }

        // Calculate totals if no pre-calculated summary exists
        let calculatedTotals: Record<string, number> = {};
        if (monthSummary) {
          calculatedTotals = monthSummary.totals;
        } else if (photos) {
          photos.forEach(photo => {
            photo.photo_items?.forEach(item => {
              const category = item.taxonomy_category || "unmapped";
              calculatedTotals[category] = (calculatedTotals[category] || 0) + 1;
            });
          });
        }

        setSummary({
          totals: calculatedTotals,
          pattern_flags: monthSummary?.pattern_flags || {},
          photos: photos || []
        });
      } catch (err) {
        setError((err as Error).message);
        console.error("Error fetching month summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthSummary();
  }, [ym]);

  if (loading) {
    return <div className="text-muted">Loading month summary...</div>;
  }

  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  if (!summary || Object.keys(summary.totals).length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No data for this month</h3>
        <p className="text-muted-foreground mb-4">
          Upload some photos to see your monthly nutrition summary and get personalized goals.
        </p>
        <Button asChild>
          <Link href="/upload">Upload Photos</Link>
        </Button>
      </div>
    );
  }

  const sortedTotals = Object.entries(summary.totals).sort((a, b) => b[1] - a[1]);
  const totalItems = Object.values(summary.totals).reduce((sum, count) => sum + count, 0);
  const activePatterns = Object.entries(summary.pattern_flags).filter(([_, value]) => value);

  const formatMonth = (ym: string) => {
    const [year, month] = ym.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getPatternDescription = (flag: string) => {
    const descriptions: Record<string, string> = {
      LOW_FIBRE: "You're not eating enough fruits and vegetables. Try adding more colorful produce to your meals.",
      HIGH_SUGARY_DRINKS: "You're consuming too many sugary drinks. Consider switching to water or unsweetened beverages.",
      LOW_OMEGA3: "You're missing out on omega-3 fatty acids. Try adding oily fish, nuts, or seeds to your diet.",
      HIGH_PROCESSED_MEAT: "You're eating too much processed meat. Consider lean proteins like chicken, fish, or plant-based options.",
      HIGH_FIBRE_CEREAL_PRESENT: "Great! You're including high-fiber cereals in your diet."
    };
    return descriptions[flag] || "This pattern has been detected in your eating habits.";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{formatMonth(ym)}</h2>
          <p className="text-muted-foreground">{summary.photos.length} photos • {totalItems} items</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/upload">
            <Camera className="w-4 h-4 mr-2" />
            Add Photos
          </Link>
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Monthly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{summary.photos.length}</div>
              <div className="text-sm text-muted-foreground">Photos</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{Object.keys(summary.totals).length}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">Top Categories</h4>
            <div className="grid grid-cols-2 gap-2">
              {sortedTotals.slice(0, 6).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Flags Card */}
      {Object.keys(summary.pattern_flags).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Nutrition Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activePatterns.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-3">
                  Based on your eating patterns, we've identified these areas for improvement:
                </div>
                <div className="space-y-2">
                  {activePatterns.map(([flag, _]) => (
                    <div key={flag} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <XCircle className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-orange-800 capitalize">
                          {flag.replace(/_/g, ' ').toLowerCase()}
                        </div>
                        <div className="text-sm text-orange-600">
                          {getPatternDescription(flag)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-green-700 font-medium">Great nutrition patterns!</p>
                <p className="text-sm text-green-600">No concerning patterns detected this month.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Goals Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Monthly Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showGoals ? (
            <GoalsView monthId={ym} monthYm={ym} />
          ) : (
            <div className="text-center py-6">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Get Personalized Goals</h3>
              <p className="text-muted-foreground mb-4">
                Based on your eating patterns, we can generate personalized nutrition goals to help you improve.
              </p>
              <Button onClick={() => setShowGoals(true)}>
                <Target className="w-4 h-4 mr-2" />
                View Goals
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Photos Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Recent Photos ({summary.photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.photos.slice(0, 5).map((photo) => (
              <div key={photo.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm text-muted-foreground">
                    {new Date(photo.taken_at).toLocaleDateString()} at {new Date(photo.taken_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  <Badge variant="outline">{photo.photo_items?.length || 0} items</Badge>
                </div>
                
                {photo.photo_items && photo.photo_items.length > 0 && (
                  <div className="space-y-2">
                    {photo.photo_items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted/20 rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.raw_label}</span>
                          {item.packaged && (
                            <Badge variant="outline" className="text-xs">Packaged</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted text-xs">
                            {(item.confidence * 100).toFixed(0)}%
                          </span>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {item.taxonomy_category.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {photo.photo_items.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{photo.photo_items.length - 3} more items
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {summary.photos.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm">
                  View All Photos
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


