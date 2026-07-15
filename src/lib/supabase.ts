import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

let _supabaseAdmin: SupabaseClient | null = null;
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, _receiver) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not set. Server/admin operations require the service role key; " +
          "falling back to the anon client would silently break RLS-bypassed queries (e.g. admin applicants list)."
      );
    }
    if (!_supabaseAdmin) {
      _supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    const value = (_supabaseAdmin as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(_supabaseAdmin) : value;
  },
});
