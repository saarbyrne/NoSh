"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, Camera, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";

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
    return (
      <div className="text-center py-12">
        <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No photos for this day</h3>
        <p className="text-muted-foreground mb-4">
          Upload some photos to see your daily nutrition summary.
        </p>
        <Button asChild>
          <Link href="/upload">Upload Photos</Link>
        </Button>
      </div>
    );
  }

  const currentDate = new Date(date);
  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const formatDisplayDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  const totalItems = Object.values(summary.totals).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/day/${formatDate(prevDate)}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">{formatDisplayDate(currentDate)}</h2>
            <p className="text-sm text-muted-foreground">{summary.photos.length} photos</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
            disabled={nextDate > new Date()}
          >
            <Link href={nextDate <= new Date() ? `/day/${formatDate(nextDate)}` : '#'}>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
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
            Daily Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{summary.photos.length}</div>
              <div className="text-sm text-muted-foreground">Photos</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">Categories</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(summary.totals).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Photos ({summary.photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.photos.map((photo) => (
              <div key={photo.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {new Date(photo.taken_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <Badge variant="outline">{photo.photo_items?.length || 0} items</Badge>
                </div>
                
                {photo.photo_items && photo.photo_items.length > 0 && (
                  <div className="space-y-2">
                    {photo.photo_items.map((item, index) => (
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
