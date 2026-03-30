"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { uploadTripCover, getTripCoverUrl } from "@/lib/trips/media";

type TripRow = {
  id: string;
  title: string;
  cover_path: string | null;
};

export default function TripCoverPage() {
  const params = useParams();
  const tripId = String(params?.id ?? "");

  const [trip, setTrip] = useState<TripRow | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);

    const { data, error } = await supabase
      .from("trips")
      .select("id, title, cover_path")
      .eq("id", tripId)
      .single();

    if (error) {
      console.error(error);
      setMsg("Nie udało się wczytać tripa.");
      return;
    }

    setTrip(data);

    if (data?.cover_path) {
      try {
        const url = await getTripCoverUrl(data.cover_path);
        setCoverUrl(url);
      } catch (e) {
        console.error(e);
        setCoverUrl(null);
      }
    } else {
      setCoverUrl(null);
    }
  }

  useEffect(() => {
    if (tripId) load();
  }, [tripId]);

  async function onFileChange(file: File | null) {
    if (!file) return;

    setBusy(true);
    setMsg(null);

    try {
      await uploadTripCover(tripId, file);
      await load();
      setMsg("Okładka została wgrana.");
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się wgrać okładki.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 pb-10 pt-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">WanderSplit</div>
            <h1 className="text-2xl font-bold text-slate-900">
              Okładka tripa
            </h1>
            <div className="text-sm text-slate-500">
              {trip?.title ?? "Trip"}
            </div>
          </div>

          <button
            onClick={() => { window.location.href = `/trips/${tripId}`; }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Powrót
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={trip?.title ?? "Cover"}
              className="h-80 w-full object-cover"
            />
          ) : (
            <div className="flex h-80 items-center justify-center bg-slate-100 text-slate-400">
              Brak okładki
            </div>
          )}

          <div className="space-y-4 p-5">
            <div className="text-sm font-semibold text-slate-700">
              Wybierz zdjęcie z komputera lub galerii telefonu
            </div>

            <label className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50">
              <span>{busy ? "Wgrywanie..." : "Wybierz zdjęcie"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="text-xs text-slate-500">
              Na telefonie otworzy się galeria/wybór zdjęcia. Na komputerze wybór pliku.
            </div>

            {msg ? (
              <div className="text-sm text-slate-700">{msg}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}