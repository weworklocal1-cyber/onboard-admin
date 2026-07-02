"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Award, Trophy, Zap, Clock, CheckCircle2 } from "lucide-react";

interface Profile {
  full_name: string;
  email: string;
}

interface Stats {
  certificates_earned: number;
  total_xp: number;
  learning_hours: number;
  rank: number;
}

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    certificates_earned: 0,
    total_xp: 0,
    learning_hours: 0,
    rank: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

       setProfile({
         id: user.id,
         full_name: (user.user_metadata?.full_name as string) || (user as any).full_name || "",
         email: user.email || "",
       } as any);

      const { count: certCount } = await supabase
        .from("academy_certificates")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { data: xpData } = await supabase
        .from("academy_xp")
        .select("points")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: progressData } = await supabase
        .from("academy_progress")
        .select("completed, lesson:academy_lessons!inner(duration_minutes)")
        .eq("user_id", user.id)
        .eq("completed", true);

      let learningMinutes = 0;
      if (progressData) {
        learningMinutes = progressData.reduce((sum: number, p: any) => sum + (p.lesson?.duration_minutes || 0), 0);
      }

      const { data: leaderboard } = await supabase
        .from("academy_xp")
        .select("user_id, points")
        .order("points", { ascending: false });

      let rank = 0;
      if (leaderboard) {
        const idx = leaderboard.findIndex((entry) => entry.user_id === user.id);
        if (idx >= 0) rank = idx + 1;
      }

      setStats({
        certificates_earned: (certCount as number) || 0,
        total_xp: (xpData as any)?.points || 0,
        learning_hours: Math.round(learningMinutes / 60),
        rank,
      });

      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  if (loading) {
    return <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Profile</h1>
        <p className="text-gray-500">Your learning achievements</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-academy-primary to-academy-secondary mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl text-white font-bold">
                    {profile?.full_name?.charAt(0) || "U"}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{profile?.full_name || "User"}</h2>
                <p className="text-sm text-gray-500">{profile?.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <Award className="h-8 w-8 text-academy-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.certificates_earned}</p>
              <p className="text-xs text-gray-500">Certificates</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 text-center">
              <Trophy className="h-8 w-8 text-academy-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">#{stats.rank}</p>
              <p className="text-xs text-gray-500">Rank</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 text-center">
              <Zap className="h-8 w-8 text-academy-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.total_xp}</p>
              <p className="text-xs text-gray-500">XP Points</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 text-center">
              <Clock className="h-8 w-8 text-academy-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.learning_hours}h</p>
              <p className="text-xs text-gray-500">Learning Hours</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Badge className="bg-academy-primary text-white">Eligible</Badge>
            <span className="text-sm">You qualify for LocalWala internships based on your certificates</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold">Badges Earned</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Award className="h-3 w-3" /> Course Completion
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Top Performer
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> 100% Score
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
