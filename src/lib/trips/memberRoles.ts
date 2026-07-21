import { supabase } from "@/lib/supabase/client";

export async function updateMemberRole(memberId: string, role: "editor" | "viewer") {
  const { error } = await supabase
    .from("trip_members")
    .update({ role })
    .eq("id", memberId);

  if (error) throw error;
}