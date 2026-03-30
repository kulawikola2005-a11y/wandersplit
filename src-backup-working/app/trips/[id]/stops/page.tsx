"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { geocodeCity } from "@/lib/maps/geocode";
import { readStopsFromDB, type TripStop } from "@/lib/trips/db";
import { getMyTripRole, canEditTrip, type TripRole } from "@/lib/trips/roles";

export default function TripStopsPage() {
  const params = useParams();
  const tripId = String(params?.id ?? "");

  const [items, setItems] = useState<TripStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<TripRole>("viewer");

  const editable = canEditTrip(myRole);

  async function load() {
    setLoading(true);
    try {
      const rows = await readStopsFromDB(tripId);
      setItems(rows);
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się wczytać przystanków.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tripId) return;
    getMyTripRole(tripId).then(setMyRole).catch(() => setMyRole("viewer"));
    load();
  }, [tripId]);

  async function addStop() {
    if (!editable) return;
    if (!name.trim()) {
      setMsg("Podaj nazwę przystanku.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const geo = await geocodeCity(name.trim());

      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;

      if (!userId) {
        setMsg("Brak użytkownika.");
        return;
      }

      const { error } = await supabase.from("trip_stops").insert({
        id: crypto.randomUUID(),
        trip_id: tripId,
        user_id: userId,
        name: name.trim(),
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        sort_order: items.length + 1,
      });

      if (error) throw error;

      setName("");
      await load();
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się dodać przystanku.");
    } finally {
      setBusy(false);
    }
  }

  async function removeStop(id: string) {
    if (!editable) return;

    setBusy(true);
    setMsg(null);

    try {
      const { error } = await supabase.from("trip_stops").delete().eq("id", id);
      if (error) throw error;
      await load();
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się usunąć przystanku.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-3 pb-10 pt-5">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Przystanki</h1>

          <Link
            href={`/trips/${tripId}`}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Powrót
          </Link>
        </div>

        {!editable && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            Masz dostęp tylko do podglądu. Edycja jest wyłączona dla roli viewer.
          </div>
        )}

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rome, Paris, Tokyo..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={!editable || busy}
            />
            <button
              onClick={addStop}
              disabled={!editable || busy}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Dodaj
            </button>
          </div>

          {msg && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</div>}

          {loading ? (
            <div>Ładowanie…</div>
          ) : items.length === 0 ? (
            <div>Brak przystanków</div>
          ) : (
            <div className="space-y-3">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div>
                    {s.name}
                    {s.lat != null && s.lng != null && (
                      <div className="mt-1 text-xs text-slate-400">
                        {s.lat}, {s.lng}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeStop(s.id)}
                    disabled={!editable || busy}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Usuń
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}