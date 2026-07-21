"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TeamsTabPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initTeamsTab = async () => {
      try {
        // Try to get existing session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          router.push("/workforce/dashboard");
          return;
        }

        // Check for Teams SSO token in URL hash
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");

          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: params.get("refresh_token") || "",
            });

            if (data.user && !error) {
              window.location.href = "/workforce/dashboard";
              return;
            }
          }
        }

        // Check for auth code from Teams
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get("authCode");

        if (authCode) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

          if (data.user && !error) {
            window.location.href = "/workforce/dashboard";
            return;
          }
        }

        // No valid session - redirect to login
        window.location.href = "/workforce/login";
      } catch {
        window.location.href = "/workforce/login";
      }
    };

    initTeamsTab();
  }, [router, supabase]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto mb-4" />
        <p className="text-gray-600">Loading Workforce Hub...</p>
      </div>
    </div>
  );
}
