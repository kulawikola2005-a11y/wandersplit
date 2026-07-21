"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  uploadMemory,
  listMemories,
  getMemoryUrl,
  setMemoryAsCover,
} from "@/lib/trips/memories";

type MemoryRow = {
  id: string;
  file_path: string;
  created_at: string;
};

export default function MemoriesPage() {
  const params = useParams();
  const tripId = String(params?.id || "");

  const [images, setImages] = useState<MemoryRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);

    const rows = await listMemories(tripId);

    const urlMap: Record<string, string> = {};

    for (const r of rows) {
      const url = await getMemoryUrl(r.file_path);
      if (url) urlMap[r.id] = url;
    }

    setImages(rows);
    setUrls(urlMap);
    setLoading(false);
  }

  useEffect(() => {
    if (tripId) load();
  }, [tripId]);

  async function onUpload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    await uploadMemory(tripId, file);
    await load();
    setBusy(false);
    e.target.value = "";
  }

  
  async function onDelete(id: string, path: string) {
    if (!confirm("Usunąć zdjęcie?")) return;
    console.log('deleteMemory disabled in build');
    await load();
  }

async function onSetCover(path: string) {
    setBusy(true);
    await setMemoryAsCover(tripId, path);
    alert("Ustawiono jako okładkę ✅");
    setBusy(false);
  }

  return (
    <div className="p-5 space-y-4">

      <button
        onClick={() => { window.location.href = `/trips/${tripId}`; }}
        className="border px-4 py-2 rounded-xl"
      >
        ← Powrót
      </button>

      <label className="block border p-3 rounded-xl cursor-pointer">
        {busy ? "Wgrywanie..." : "Dodaj zdjęcie"}
        <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
      </label>

      {loading ? (
        <div>Ładowanie...</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {images.map((img) => (
            <div key={img.id} className="border rounded-xl overflow-hidden">

              <img
                src={urls[img.id]}
                className="w-full h-40 object-cover"
              />

              <button
                onClick={() => onSetCover(img.file_path)}
                className="w-full text-sm p-2 border-t"
              >
                Ustaw jako okładkę
              </button>

              <button
                onClick={() => onDelete(img.id, img.file_path)}
                className="w-full text-sm p-2 border-t text-red-600"
              >
                Usuń
              </button>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}