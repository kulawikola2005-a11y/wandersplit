import { supabase } from "@/lib/supabase/client";

export type TripStop = {
  id: string;
  trip_id: string;
  user_id: string;
  name: string;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  sort_order: number;
  created_at: string;
};

export function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function readStopsFromDB(tripId: string): Promise<TripStop[]> {
  const { data, error } = await supabase
    .from("trip_stops")
    .select("*")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("readStopsFromDB error:", error);
    return [];
  }

  return data ?? [];
}

export async function insertStopToDB(
  tripId: string,
  name: string,
  sortOrder: number
) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Brak użytkownika");

  const { error } = await supabase.from("trip_stops").insert({
    id: uid(),
    trip_id: tripId,
    user_id: userId,
    name,
    sort_order: sortOrder,
  });

  if (error) throw error;
}

export async function deleteStopFromDB(id: string) {
  const { error } = await supabase
    .from("trip_stops")
    .delete()
    .eq("id", id);

  if (error) throw error;
}