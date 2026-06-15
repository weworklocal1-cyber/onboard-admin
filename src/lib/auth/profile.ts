import { supabase } from "@/lib/supabase";
import { Profile, UserRole } from "@/types/workforce";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data as Profile;
}

export async function getProfileWithRole(userId: string): Promise<{
  profile: Profile | null;
  role: UserRole | null;
}> {
  const profile = await getProfile(userId);
  return {
    profile,
    role: profile?.role ?? null,
  };
}