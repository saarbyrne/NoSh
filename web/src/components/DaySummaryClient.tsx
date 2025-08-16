"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DaySummaryProps {
  userId: string;
  date: string;
}

interface DaySummaryData {
  totals: { [category: string]: number };
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

export default function DaySummaryClient({ userId, date }: DaySummaryProps) {
  const [summary, setSummary] = useState<DaySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDaySummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        
        // First try to get pre-calculated summary
        const { data: daySummary, error: summaryError } = await supabase
          .from("day_summaries")
          .select("totals")
          .eq("user_id", userId)
          .eq("date", date)
          .single();

        if (summaryError && summaryError.code !== 'PGRST116') {
          throw new Error(summaryError.message);
        }

        // Get photos for this day
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
          .eq("user_id", userId)
          .gte("taken_at", `${date}T00:00:00`)
          .lt("taken_at", `${date}T23:59:59`)
          .order("taken_at", { ascending: false });

        if (photosError) {
          throw new Error(photosError.message);
        }

        // Calculate totals if no pre-calculated summary exists
        let calculatedTotals: { [key: string]: number } = {};
        if (daySummary) {
          calculatedTotals = daySummary.totals;
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
          photos: photos || []
        });
      } catch (err) {
        setError((err as Error).message);
        console.error("Error fetching day summary:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDaySummary();
  }, [userId, date]);

  if (loading) {
    return <div className="text-muted">Loading day summary...</div>;
  }

  if (error) {
    return <div className="text-destructive">Error: {error}</div>;
  }

  if (!summary || summary.photos.length === 0) {
    return <div className="text-muted">No photos for this day.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(summary.totals).map(([category, count]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="font-medium">{category}</span>
                <Badge>{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photos Card */}
      <Card>
        <CardHeader>
          <CardTitle>Photos ({summary.photos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.photos.map((photo) => (
              <div key={photo.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm text-muted">
                    {new Date(photo.taken_at).toLocaleTimeString()}
                  </span>
                  <Badge variant="outline">{photo.photo_items?.length || 0} items</Badge>
                </div>
                
                {photo.photo_items && photo.photo_items.length > 0 && (
                  <div className="space-y-2">
                    {photo.photo_items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>
                          {item.raw_label}
                          {item.packaged && <Badge variant="outline" className="ml-2">Packaged</Badge>}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted">{(item.confidence * 100).toFixed(0)}%</span>
                          <Badge variant="secondary">{item.taxonomy_category}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
