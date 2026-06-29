"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function TesterLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: tester, error } = await supabase
        .from("testers")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !tester) {
        toast.error("Email not registered as tester");
        return;
      }

      if (tester.status !== "approved") {
        toast.error("Access pending approval");
        return;
      }

      sessionStorage.setItem("tester_email", email);
      toast.success("Welcome!");
      router.push("/testing/dashboard");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-brand-primary">🧪</span> LocalWala Testing
          </h1>
          <p className="text-gray-600 mt-2">Tester Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Enter Portal"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-500">Invited beta testers only</p>
        </div>
      </div>
    </div>
  );
}