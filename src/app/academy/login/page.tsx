"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export default function AcademyLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success("Welcome to WeWorkLocal Academy!");
        router.refresh();
        setTimeout(() => {
          window.location.href = "/academy/dashboard";
        }, 150);
      }
    } catch {
      setError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-academy-light to-white p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-academy-primary to-academy-secondary flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">WeWorkLocal Academy</h1>
          <p className="text-sm text-gray-500 mt-1">Learn. Certify. Internship.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <Button type="submit" className="w-full bg-academy-primary hover:bg-academy-secondary" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/academy/register" className="text-academy-primary font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}