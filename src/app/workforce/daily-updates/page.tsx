"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { MOOD_EMOJIS, Mood } from "@/types/workforce";

export default function DailyUpdatesPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [submitting, setSubmitting] = useState(false);
  const [completedToday, setCompletedToday] = useState("");
  const [planForTomorrow, setPlanForTomorrow] = useState("");
  const [blockers, setBlockers] = useState("");
  const [mood, setMood] = useState<Mood | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("daily_updates").upsert({
        employee_id: profile.id,
        date: format(new Date(), "yyyy-MM-dd"),
        completed_today: completedToday,
        plan_for_tomorrow: planForTomorrow,
        blockers: blockers || null,
        has_blocker: !!blockers,
        mood: mood || null,
      });

      if (error) throw error;
      toast.success("Daily update submitted!");
    } catch (err) {
      console.error("Error submitting update:", err);
      toast.error("Failed to submit update");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Update</h1>
        <p className="text-gray-600">Submit your EOD report before 8 PM</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{today}</span>
            <Badge variant="outline">Due Today</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                What did you complete today? <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Describe your accomplishments..."
                value={completedToday}
                onChange={(e) => setCompletedToday(e.target.value)}
                required
                minLength={50}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Min 50 characters ({completedToday.length}/50)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                What will you work on tomorrow? <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Your plans for tomorrow..."
                value={planForTomorrow}
                onChange={(e) => setPlanForTomorrow(e.target.value)}
                required
                minLength={30}
                rows={2}
              />
              <p className="text-xs text-gray-500">
                Min 30 characters ({planForTomorrow.length}/30)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Any blockers or dependencies?
              </label>
              <Textarea
                placeholder="Describe any blockers (optional)..."
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Energy Level / Mood</label>
              <div className="flex gap-2">
                {(["great", "good", "neutral", "bad", "terrible"] as Mood[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(mood === m ? "" : m)}
                    className={`text-2xl p-2 rounded-lg transition-transform ${
                      mood === m ? "bg-brand-primary/10 scale-110" : "hover:bg-gray-100"
                    }`}
                  >
                    {MOOD_EMOJIS[m]}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" isLoading={submitting}>
              Submit Update
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}