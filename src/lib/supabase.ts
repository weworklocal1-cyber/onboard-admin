import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const supabaseAdmin = (() => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return supabase;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
})();
