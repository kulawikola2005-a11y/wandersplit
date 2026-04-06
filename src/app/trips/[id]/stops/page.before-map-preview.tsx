"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Plus, Trash2, Route } from "lucide-react";
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

    const value = name.trim();
    if (!value) {
      setMsg("Podaj nazwę przystanku.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const geo = await geocodeCity(value);

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
        name: value,
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
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-800 px-4 py-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                  <Route size={16} />
                  Trasa podróży
                </div>
                <h1 className="mt-1 text-xl font-black">Przystanki</h1>
                <p className="mt-1 text-sm text-white/75">
                  Dodawaj miasta i buduj kolejność wyjazdu.
                </p>
              </div>

              <Link
                href={`/trips/${tripId}`}
                className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
              >
                Powrót
              </Link>
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-500">Liczba przystanków</div>
              <div className="mt-1 text-lg font-black text-slate-900">{items.length}</div>
            </div>
          </div>
        </div>

        {!editable && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            Masz dostęp tylko do podglądu. Edycja jest wyłączona dla roli viewer.
          </div>
        )}

        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Plus size={16} />
            Nowy przystanek
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Np. Rome, Paris, Tokyo..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-300"
              disabled={!editable || busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") addStop();
              }}
            />
            <button
              onClick={addStop}
              disabled={!editable || busy}
              className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Dodaj
            </button>
          </div>

          {msg && (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {msg}
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
            Ładowanie…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <MapPin size={20} />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900">
              Brak przystanków
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Dodaj pierwszy przystanek powyżej.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((s, index) => (
              <div
                key={s.id}
                className="flex items-start justify-between rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{s.name}</div>
                    {s.lat != null && s.lng != null ? (
                      <div className="mt-1 text-xs text-slate-400">
                        {s.lat}, {s.lng}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-400">
                        Brak współrzędnych
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => removeStop(s.id)}
                  disabled={!editable || busy}
                  className="ml-3 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
