"use client";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { useToast } from "./ui/toast";
import { generateGoals, submitGoals, submitGoalFeedback } from "@/lib/api";
import { Target, CheckCircle, XCircle, Edit3, Save, X, RefreshCw } from "lucide-react";

interface Goal {
  title: string;
  why: string;
  how: string;
  fallback: string;
}

interface GoalSet {
  id: string;
  goals: Goal[];
  created_at: string;
  feedback?: {
    achieved: boolean;
    liked: boolean;
    repeat_next: boolean;
    notes?: string;
  };
}

interface GoalsViewProps {
  monthId: string;
  monthYm: string;
  onGoalsGenerated?: (goals: Goal[]) => void;
}

export default function GoalsView({ monthId, monthYm, onGoalsGenerated }: GoalsViewProps) {
  const [goalSet, setGoalSet] = useState<GoalSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedGoals, setEditedGoals] = useState<Goal[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    loadGoals();
  }, [monthId]);

  const loadGoals = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: goals, error } = await supabase
        .from("goal_sets")
        .select(`
          *,
          goal_feedback (
            achieved,
            liked,
            repeat_next,
            notes
          )
        `)
        .eq("user_id", user.id)
        .eq("month_ym", monthYm)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading goals:", error);
        push("Failed to load goals");
      } else if (goals) {
        setGoalSet({
          id: goals.id,
          goals: goals.goals,
          created_at: goals.created_at,
          feedback: goals.goal_feedback?.[0]
        });
      }
    } catch (error) {
      console.error("Error loading goals:", error);
      push("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGoals = async () => {
    try {
      setGenerating(true);
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        push("Please log in to generate goals");
        return;
      }

      const { data: monthSummary } = await supabase
        .from("month_summaries")
        .select("totals, pattern_flags")
        .eq("user_id", user.id)
        .eq("month_ym", monthYm)
        .single();

      if (!monthSummary) {
        push("No data available for this month yet. Upload some photos first!");
        return;
      }

      const result = await generateGoals({
        user_id: user.id,
        month_ym: monthYm
      });

      if (result && (result as any).goals) {
        const goals = (result as any).goals;
        setEditedGoals(goals);
        setEditing(true);
        onGoalsGenerated?.(goals);
        push("Goals generated! Review and edit them before saving.");
      } else {
        push("Failed to generate goals. Please try again.");
      }
    } catch (error) {
      console.error("Error generating goals:", error);
      push("Failed to generate goals");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGoals = async () => {
    try {
      setSubmitting(true);
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        push("Please log in to save goals");
        return;
      }

      await submitGoals({
        user_id: user.id,
        month_ym: monthYm,
        goals: editedGoals
      });

      await loadGoals();
      setEditing(false);
      push("Goals saved successfully!");
    } catch (error) {
      console.error("Error saving goals:", error);
      push("Failed to save goals");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditedGoals([]);
  };

  const handleEditGoal = (index: number, field: keyof Goal, value: string) => {
    const updated = [...editedGoals];
    updated[index] = { ...updated[index], [field]: value };
    setEditedGoals(updated);
  };

  const handleSubmitFeedback = async (achieved: boolean, liked: boolean, repeatNext: boolean, notes?: string) => {
    if (!goalSet) return;

    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await submitGoalFeedback({
        goal_set_id: goalSet.id,
        achieved,
        liked,
        repeat_next: repeatNext,
        notes
      });

      await loadGoals();
      push("Feedback submitted successfully!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      push("Failed to submit feedback");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Monthly Goals</h2>
        {!goalSet && !editing && (
          <Button 
            onClick={handleGenerateGoals} 
            disabled={generating}
            className="flex items-center gap-2"
          >
            {generating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
            {generating ? "Generating..." : "Generate Goals"}
          </Button>
        )}
      </div>

      {editing && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Edit Your Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editedGoals.map((goal, index) => (
              <div key={index} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Goal {index + 1}</Badge>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={goal.title}
                    onChange={(e) => handleEditGoal(index, "title", e.target.value)}
                    placeholder="What do you want to achieve?"
                    maxLength={60}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Why</label>
                  <Textarea
                    value={goal.why}
                    onChange={(e) => handleEditGoal(index, "why", e.target.value)}
                    placeholder="Why is this important to you?"
                    maxLength={120}
                    rows={2}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">How</label>
                  <Textarea
                    value={goal.how}
                    onChange={(e) => handleEditGoal(index, "how", e.target.value)}
                    placeholder="How will you achieve this?"
                    maxLength={200}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Fallback</label>
                  <Textarea
                    value={goal.fallback}
                    onChange={(e) => handleEditGoal(index, "fallback", e.target.value)}
                    placeholder="What's your backup plan?"
                    maxLength={120}
                    rows={2}
                  />
                </div>
              </div>
            ))}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveGoals} 
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {submitting ? "Saving..." : "Save Goals"}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {goalSet && !editing && (
        <div className="space-y-4">
          {goalSet.goals.map((goal, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-medium">{goal.title}</h3>
                  <Badge variant="outline">Goal {index + 1}</Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Why</h4>
                    <p className="text-sm">{goal.why}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">How</h4>
                    <p className="text-sm">{goal.how}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Fallback</h4>
                    <p className="text-sm">{goal.fallback}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {!goalSet.feedback && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How did you do?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleSubmitFeedback(true, true, true)}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Achieved & Liked
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleSubmitFeedback(true, false, false)}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Achieved but Not Liked
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleSubmitFeedback(false, false, true)}
                      className="flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      Try Again Next Month
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {goalSet.feedback && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Feedback Submitted</span>
                </div>
                <div className="text-sm text-green-700">
                  {goalSet.feedback.achieved ? "✅ Achieved" : "❌ Not achieved"} • 
                  {goalSet.feedback.liked ? " 👍 Liked" : " 👎 Didn't like"} • 
                  {goalSet.feedback.repeat_next ? " 🔄 Repeat next month" : " 🚫 Don't repeat"}
                </div>
                {goalSet.feedback.notes && (
                  <p className="text-sm text-green-700 mt-2 italic">"{goalSet.feedback.notes}"</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!goalSet && !editing && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No goals set for this month</h3>
            <p className="text-muted-foreground mb-4">
              Generate personalized goals based on your eating patterns to help improve your nutrition.
            </p>
            <Button onClick={handleGenerateGoals} disabled={generating}>
              {generating ? "Generating..." : "Generate Goals"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
