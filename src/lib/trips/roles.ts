import { supabase } from "@/lib/supabase/client";

export type TripRole = "owner" | "editor" | "viewer";

export async function getMyTripRole(tripId: string): Promise<TripRole> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) return "viewer";

  const userId = authData.user.id;

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("user_id")
    .eq("id", tripId)
    .single();

  if (!tripError && trip?.user_id === userId) return "owner";

  const { data: member, error: memberError } = await supabase
    .from("trip_members")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) return "viewer";

  const role = member?.role;
  if (role === "owner" || role === "editor" || role === "viewer") return role;

  return "viewer";
}

export function canEditTrip(role: TripRole) {
  return role === "owner" || role === "editor";
}

export function canManageTrip(role: TripRole) {
  return role === "owner";
}