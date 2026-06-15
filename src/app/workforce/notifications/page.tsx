"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/types/workforce";

const NOTIFICATION_ICONS: Record<string, string> = {
  attendance_reminder: "📅",
  checkout_reminder: "⏰",
  update_reminder: "📝",
  follow_up_reminder: "📞",
  task_assigned: "📋",
  task_updated: "🔄",
  task_overdue: "⚠️",
  blocker_flagged: "🚨",
  general: "🔔",
};

export default function NotificationsPage() {
  const { profile, loading } = useAuth();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(data || []);
      setUnreadCount(data?.filter((n: any) => !n.read).length || 0);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${profile.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, supabase]);

  const markAllAsRead = async () => {
    if (!profile) return;

    await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("recipient_id", profile.id)
      .eq("read", false);

    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark All Read
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No notifications yet</p>
        ) : (
          notifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationCard({ notification }: { notification: Notification }) {
  const icon = NOTIFICATION_ICONS[notification.type] || "🔔";
  const isUnread = !notification.read;

  return (
    <Card className={isUnread ? "border-l-4 border-l-brand-primary" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{notification.title}</h4>
              {isUnread && (
                <Badge variant="brand" className="text-xs">
                  New
                </Badge>
              )}
            </div>
            {notification.message && (
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              {new Date(notification.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}