import { supabase } from "@/lib/supabase/client";

export type TripMember = {
  id: string;
  trip_id: string;
  user_id: string;
  role: string | null;
  created_at: string;
};

export async function listTripMembers(tripId: string) {
  const { data, error } = await supabase
    .from("trip_members")
    .select("id, trip_id, user_id, role, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as TripMember[];
}

export async function removeMember(memberId: string) {
  const { error } = await supabase
    .from("trip_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;
}