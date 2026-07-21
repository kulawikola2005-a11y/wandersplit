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

function readStopsFromLocalStorage(tripId: string): TripStop[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(`wandersplit:stops:${tripId}`);
    if (!raw) return [];

    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];

    return arr.map((item: any, index: number) => ({
      id: item.id ?? uid(),
      trip_id: tripId,
      user_id: item.user_id ?? "",
      name: item.name ?? "",
      country_code: item.country_code ?? null,
      lat: item.lat ?? null,
      lng: item.lng ?? null,
      sort_order: item.sort_order ?? index + 1,
      created_at: item.created_at ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function readStopsFromDB(tripId: string): Promise<TripStop[]> {
  const { data, error } = await supabase
    .from("trip_stops")
    .select("*")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true });

  if (!error && data && data.length > 0) {
    return data;
  }

  if (error) {
    console.warn("readStopsFromDB warning:", error instanceof Error ? error.message : error);
  }

  return readStopsFromLocalStorage(tripId);
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
