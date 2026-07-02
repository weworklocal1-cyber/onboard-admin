"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Award, Zap } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  full_name: string;
  points: number;
}

interface XpData {
  points: number;
  user_name: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<"weekly" | "monthly" | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("academy_xp")
        .select(`
          points,
          user_name
        `)
        .order("points", { ascending: false })
        .limit(50);

      if (data) {
        setEntries(data.map((entry: XpData, i) => ({
          rank: i + 1,
          full_name: entry.user_name,
          points: entry.points,
        })));
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Leaderboard</h1>
        <p className="text-gray-500">Top performers in WeWorkLocal Academy</p>
      </div>

      <div className="flex gap-2">
        {["weekly", "monthly", "all"].map((filter) => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter as any)}
            className={timeFilter === filter ? "bg-academy-primary text-white" : "bg-gray-100"}
          >
            <Badge variant={timeFilter === filter ? "brand" : "secondary"} className="capitalize cursor-pointer">
              {filter}
            </Badge>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 rounded bg-gray-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    entry.rank === 1 ? "bg-academy-light" : "bg-gray-50"
                  }`}
                >
                  <Badge
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      entry.rank === 1
                        ? "bg-academy-primary text-white"
                        : entry.rank <= 3
                        ? "bg-academy-secondary text-white"
                        : ""
                    }`}
                  >
                    {entry.rank}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-semibold">{entry.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{entry.points.toLocaleString()} XP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}