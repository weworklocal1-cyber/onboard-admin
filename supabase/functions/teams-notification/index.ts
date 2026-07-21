// @ts-nocheck
// Supabase Edge Function: teams-notification
// Sends rich Adaptive Card notifications to Microsoft Teams via Incoming Webhook.

import { createClient } from "@supabase/supabase-js";

type DenoEnv = {
  env: { get: (k: string) => string | undefined };
};
declare const Deno: DenoEnv;

interface TeamsMessageCard {
  "@type": "MessageCard";
  "@context": "http://schema.org/extensions";
  themeColor?: string;
  title: string;
  text?: string;
  sections: {
    title?: string;
    activityTitle?: string;
    activitySubtitle?: string;
    facts?: { name: string; value: string }[];
    text?: string;
  }[];
  potentialAction?: {
    "@type": "OpenUri";
    name: string;
    targets: { os: string; uri: string }[];
  }[];
}

async function sendToTeams(webhookUrl: string, card: TeamsMessageCard) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(card),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Teams webhook failed:", res.status, text);
  }
  return res;
}

function buildAdaptiveCard(params: {
  title: string;
  message?: string;
  themeColor?: string;
  facts?: { name: string; value: string }[];
  actionLabel?: string;
  actionUrl?: string;
}): TeamsMessageCard {
  const card: TeamsMessageCard = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: params.themeColor || "0076D7",
    title: params.title,
    sections: [],
  };

  if (params.message) {
    card.text = params.message;
  }

  if (params.facts && params.facts.length > 0) {
    card.sections.push({ facts: params.facts });
  }

  if (params.actionLabel && params.actionUrl) {
    card.potentialAction = [
      {
        "@type": "OpenUri",
        name: params.actionLabel,
        targets: [{ os: "default", uri: params.actionUrl }],
      },
    ];
  }

  return card;
}

// @ts-ignore - Deno runtime
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const teamsWebhookUrl = Deno.env.get("TEAMS_WEBHOOK_URL");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = req.method === "POST" ? await req.json() : {};
    const { title, message, type, data, recipient_id, notification_id } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: "Missing required field: title" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Build facts from data
    const facts: { name: string; value: string }[] = [];
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          facts.push({ name: key, value: String(value) });
        }
      });
    }

    // Determine theme color based on notification type
    const themeColorMap: Record<string, string> = {
      task_assigned: "0076D7",
      task_overdue: "FF0000",
      task_updated: "FFA500",
      blocker_flagged: "FF0000",
      leave_approved: "008000",
      leave_rejected: "FF0000",
      attendance_reminder: "FFA500",
      checkout_reminder: "FFA500",
      update_reminder: "FFA500",
      general: "0076D7",
    };

    const themeColor = themeColorMap[type || "general"] || "0076D7";

    const actionUrl = data?.url || data?.link || undefined;

    const card = buildAdaptiveCard({
      title,
      message: message || undefined,
      themeColor,
      facts: facts.length > 0 ? facts : undefined,
      actionLabel: "Open Workforce Hub",
      actionUrl: actionUrl || `${supabaseUrl.replace("https://", "https://").replace("http://", "http://")}/workforce`,
    });

    if (!teamsWebhookUrl) {
      console.warn("TEAMS_WEBHOOK_URL not configured. Skipping Teams notification.");
      return new Response(JSON.stringify({ success: true, teamsSent: false, reason: "No webhook URL configured" }), {
        headers: { "content-type": "application/json" },
      });
    }

    await sendToTeams(teamsWebhookUrl, card);

    return new Response(JSON.stringify({ success: true, teamsSent: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
