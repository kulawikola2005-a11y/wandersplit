import { supabase } from "@/lib/supabase/client";

function extFromFile(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

export async function uploadTripCover(tripId: string, file: File) {
  const ext = extFromFile(file);
  const path = `${tripId}/cover-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("trip-covers")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase
    .from("trips")
    .update({ cover_path: path })
    .eq("id", tripId);

  if (dbError) throw dbError;

  return path;
}

async function trySignedUrl(bucket: "trip-covers" | "trip-memories", path: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error) return null;
  return data?.signedUrl || null;
}

export async function getTripCoverUrl(path: string) {
  const fromCovers = await trySignedUrl("trip-covers", path);
  if (fromCovers) return fromCovers;

  const fromMemories = await trySignedUrl("trip-memories", path);
  if (fromMemories) return fromMemories;

  return null;
}

export async function uploadTripMemory(tripId: string, file: File, caption?: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Brak użytkownika");

  const ext = extFromFile(file);
  const path = `${tripId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("trip-memories")
    .upload(path, file, {
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase.from("trip_memories").insert({
    id: crypto.randomUUID(),
    trip_id: tripId,
    user_id: userId,
    file_path: path,
    caption: caption || null,
  });

  if (dbError) throw dbError;

  return path;
}

export async function readTripMemories(tripId: string) {
  const { data, error } = await supabase
    .from("trip_memories")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getMemorySignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("trip-memories")
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data?.signedUrl || null;
}