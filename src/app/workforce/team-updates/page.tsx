"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { MOOD_EMOJIS, Mood } from "@/types/workforce";
import { toast } from "sonner";

export default function TeamUpdatesPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [updates, setUpdates] = useState<{
    id: string;
    employee_id: string;
    date: string;
    completed_today: string;
    plan_for_tomorrow: string;
    blockers: string | null;
    has_blocker: boolean;
    mood: Mood | null;
    submitted_at: string;
    employee?: { full_name: string; department: string; profile_picture_url: string | null };
  }[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showBlockersOnly, setShowBlockersOnly] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetchTeamUpdates();
  }, [profile, filterDate, showBlockersOnly]);

  const fetchTeamUpdates = async () => {
    setFetching(true);
    try {
      // Get all team members (employees who report to the same manager)
      const { data: teamMembers, error: teamError } = await supabase
        .from("profiles")
        .select("id")
        .eq("reporting_manager_id", profile!.id)
        .eq("status", "active");

      if (teamError) throw teamError;

      const teamMemberIds = (teamMembers || []).map(m => m.id);
      if (teamMemberIds.length === 0) {
        setUpdates([]);
        setFetching(false);
        return;
      }

      let query = supabase
        .from("daily_updates")
        .select(`
          *,
          employee:profiles!employee_id(id, full_name, department, profile_picture_url)
        `)
        .in("employee_id", teamMemberIds)
        .eq("date", filterDate)
        .order("submitted_at", { ascending: false });

      if (showBlockersOnly) {
        query = query.eq("has_blocker", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUpdates(data || []);
    } catch (err: unknown) {
      console.error("Error fetching team updates:", err);
      toast.error("Failed to load team updates");
    } finally {
      setFetching(false);
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

  const isLeadOrAdmin = ['founder', 'super_admin', 'hr_admin', 'team_lead'].includes(profile.role);

  if (!isLeadOrAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Updates</h1>
          <p className="text-gray-500">
            View daily updates from your team members
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="blockers-only"
                checked={showBlockersOnly}
                onChange={e => setShowBlockersOnly(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="blockers-only" className="text-sm cursor-pointer">
                Blockers only
              </Label>
            </div>
            <div className="ml-auto pt-5">
              <Badge variant="outline">
                {updates.length} update{updates.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {fetching ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : updates.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📝</p>
          <p className="font-semibold text-gray-600">No team updates found for this date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <Card key={update.id} className={update.has_blocker ? "border-l-4 border-l-red-500" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold shrink-0">
                    {update.employee?.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{update.employee?.full_name}</h4>
                      <span className="text-xs text-gray-500">{update.employee?.department}</span>
                      {update.has_blocker && <Badge className="bg-red-100 text-red-700">🚫 Blocker</Badge>}
                      {update.mood && (
                        <span className="text-lg" title={`Mood: ${update.mood}`}>
                          {MOOD_EMOJIS[update.mood]}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">✅ Completed Today:</p>
                        <p className="text-gray-600 whitespace-pre-wrap">{update.completed_today}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">📅 Plan for Tomorrow:</p>
                        <p className="text-gray-600 whitespace-pre-wrap">{update.plan_for_tomorrow}</p>
                      </div>
                      {update.blockers && (
                        <div>
                          <p className="font-medium text-red-700">🚫 Blockers:</p>
                          <p className="text-red-600 whitespace-pre-wrap">{update.blockers}</p>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-3">
                      Submitted at {format(new Date(update.submitted_at), "hh:mm a")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
  return (
    <label className={`text-sm font-medium text-gray-700 ${className || ""}`} {...props}>
      {children}
    </label>
  );
}
