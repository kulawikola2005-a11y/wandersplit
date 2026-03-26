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
    <div className="px-3 pb-10 pt-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Przystanki</h1>

          <Link
            href={`/trips/${tripId}`}
            className="border px-3 py-2 rounded-xl"
          >
            Powrót
          </Link>
        </div>

        {!editable && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            Masz dostęp tylko do podglądu. Edycja jest wyłączona dla roli viewer.
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rome, Paris, Tokyo..."
              className="border px-3 py-2 w-full rounded-xl"
              disabled={!editable || busy}
            />
            <button
              onClick={addStop}
              disabled={!editable || busy}
              className="border px-3 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Dodaj
            </button>
          </div>

          {msg && <div className="text-red-500">{msg}</div>}

          {loading ? (
            <div>Ładowanie…</div>
          ) : items.length === 0 ? (
            <div>Brak przystanków</div>
          ) : (
            <div className="space-y-2">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between border p-3 rounded-xl"
                >
                  <div>
                    {s.name}
                    {s.lat != null && s.lng != null && (
                      <div className="text-xs text-gray-400">
                        {s.lat}, {s.lng}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeStop(s.id)}
                    disabled={!editable || busy}
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
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