import { supabase } from "@/lib/supabase/client";

export async function uploadMemory(tripId: string, file: File) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Brak użytkownika");

  const path = `${tripId}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error: uploadError } = await supabase.storage
    .from("trip-memories")
    .upload(path, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase.from("trip_memories").insert({
    id: crypto.randomUUID(),
    trip_id: tripId,
    user_id: userId,
    file_path: path,
  });

  if (dbError) throw dbError;

  return path;
}

export async function listMemories(tripId: string) {
  const { data, error } = await supabase
    .from("trip_memories")
    .select("id, file_path, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMemoryUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("trip-memories")
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data?.signedUrl || null;
}

export async function setMemoryAsCover(tripId: string, filePath: string) {
  const { error } = await supabase
    .from("trips")
    .update({ cover_path: filePath })
    .eq("id", tripId);

  if (error) throw error;
}

export async function deleteMemory(id: string, path: string) {
  const { error: storageError } = await supabase.storage
    .from("trip-memories")
    .remove([path]);

  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from("trip_memories")
    .delete()
    .eq("id", id);

  if (dbError) throw dbError;
}