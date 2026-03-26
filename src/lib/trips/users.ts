import { supabase } from "@/lib/supabase/client";

export async function getUserEmail(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(error);
    return userId;
  }

  return data?.email || userId;
}