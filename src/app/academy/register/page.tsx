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

export default function AcademyRegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
        return;
      }

      if (data.user) {
        try {
          await fetch("/api/auth/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: data.user.id }),
          });
        } catch {
          // best effort
        }

        toast.success("Account created! Please sign in.");
        router.push("/academy/login");
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
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Join WeWorkLocal Academy</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

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
              minLength={6}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <Button type="submit" className="w-full bg-academy-primary hover:bg-academy-secondary" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/academy/login" className="text-academy-primary font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}