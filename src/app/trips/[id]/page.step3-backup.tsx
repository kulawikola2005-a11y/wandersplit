"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import PageTransition from "@/components/ui/PageTransition";
import TripHeroCard from "@/components/trip/TripHeroCard";
import TripQuickActions from "@/components/trip/TripQuickActions";
import TripStatsRow from "@/components/trip/TripStatsRow";
import SectionCard from "@/components/trip/SectionCard";

type Trip = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  base_currency?: string | null;
  cover_path?: string | null;
  user_id?: string | null;
};

function pickCover(tripId: string) {
  const covers = [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80",
  ];

  let h = 0;
  for (let i = 0; i < tripId.length; i++) {
    h = (h * 31 + tripId.charCodeAt(i)) >>> 0;
  }
  return covers[h % covers.length];
}

function readTripFromLocalStorage(tripId: string): Trip | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("wandersplit:trips");
    if (!raw) return null;

    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;

    const found = arr.find((t: any) => String(t?.id) === String(tripId));
    if (!found) return null;

    return {
      id: found.id,
      title: found.title || "Trip",
      start_date: found.start_date ?? null,
      end_date: found.end_date ?? null,
      base_currency: found.base_currency ?? "EUR",
      cover_path: found.cover_path ?? null,
      user_id: found.user_id ?? null,
    };
  } catch (error) {
    console.error("readTripFromLocalStorage error:", error);
    return null;
  }
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Brak dat";
  if (start && end) return `${start} → ${end}`;
  return start || end || "Brak dat";
}

export default function TripHomePage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const cover = useMemo(() => pickCover(tripId), [tripId]);

  const days =
    trip?.start_date && trip?.end_date
      ? Math.max(
          1,
          Math.ceil(
            (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : "-";

  const stops =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(`wandersplit:stops:${tripId}`) || "[]").length
      : 0;

  useEffect(() => {
    let cancelled = false;

    async function loadTrip() {
      if (!tripId) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const localTrip = readTripFromLocalStorage(tripId);

        if (localTrip) {
          if (!cancelled) {
            setTrip(localTrip);
            setLoading(false);
          }

          try {
            const { data, error } = await supabase
              .from("trips")
              .select("id, title, start_date, end_date, base_currency, cover_path, user_id")
              .eq("id", tripId)
              .maybeSingle();

            if (!cancelled && !error && data) {
              setTrip(data);
            }
          } catch (error) {
            console.warn("supabase trip fetch warning:", error);
          }

          return;
        }

        try {
          const { data, error } = await supabase
            .from("trips")
            .select("id, title, start_date, end_date, base_currency, cover_path, user_id")
            .eq("id", tripId)
            .maybeSingle();

          if (!cancelled) {
            if (error) {
              console.warn("supabase trip fetch warning:", error);
              setTrip(null);
            } else {
              setTrip(data ?? null);
            }
          }
        } catch (error) {
          console.warn("supabase trip fetch warning:", error);
          if (!cancelled) {
            setTrip(null);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTrip();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (loading) {
    return (
      <div className="w-full px-4 pb-24 pt-4">
        <div className="space-y-4">
          <div className="h-48 w-full animate-pulse rounded-3xl bg-neutral-200/70" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 animate-pulse rounded-3xl bg-neutral-200/60" />
            <div className="h-24 animate-pulse rounded-3xl bg-neutral-200/60" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 animate-pulse rounded-3xl bg-neutral-200/60" />
            <div className="h-20 animate-pulse rounded-3xl bg-neutral-200/60" />
            <div className="h-20 animate-pulse rounded-3xl bg-neutral-200/60" />
          </div>
          <div className="h-40 animate-pulse rounded-3xl bg-neutral-200/60" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="w-full px-4 pb-24 pt-4">
        <div className="rounded-3xl border border-black/5 bg-white px-4 py-10 text-center shadow-sm">
          <div className="text-sm font-semibold text-neutral-900">
            Nie udało się otworzyć tripa
          </div>
          <div className="mt-1 text-sm text-neutral-500">
            Trip nie istnieje albo nie masz do niego dostępu.
          </div>
          <Link
            href="/trips"
            className="mt-4 inline-block rounded-2xl border border-black/5 bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-900"
          >
            Wróć do listy tripów
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-dvh w-full bg-[#F7F7F3] px-4 pb-28 pt-4">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/trips"
              className="rounded-2xl border border-black/5 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm"
            >
              Wróć
            </Link>

            <div className="rounded-2xl border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-neutral-500 shadow-sm">
              Home
            </div>
          </div>

          <div
            className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm"
            style={{
              backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.50), rgba(0,0,0,0.10)), url('${cover}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="px-5 py-20">
              <div className="max-w-sm">
                <p className="text-sm text-white/80">WanderSplit</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {trip.title || "Trip"}
                </h1>
                <p className="mt-2 text-sm text-white/85">
                  {formatDateRange(trip.start_date, trip.end_date)}
                </p>
              </div>
            </div>
          </div>

          <TripHeroCard
            title={trip.title || "Trip"}
            subtitle="Planuj podróż, budżet i przystanki w jednym miejscu"
            dates={formatDateRange(trip.start_date, trip.end_date)}
            travelers="Grupa podróżna"
            budget={trip.base_currency || "EUR"}
          />

          <TripQuickActions tripId={tripId} />

          <TripStatsRow
            items={[
              { label: "Dni", value: String(days) },
              { label: "Stops", value: String(stops) },
              { label: "Waluta", value: trip.base_currency || "EUR" },
              { label: "Status", value: "MVP" },
            ]}
          />

          <SectionCard
            title="Sekcje tripa"
            description="Najważniejsze obszary Twojej podróży"
          >
            <div className="grid grid-cols-1 gap-3">
              <Link
                href={`/trips/${tripId}/plan`}
                className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-4 text-sm font-medium text-neutral-900"
              >
                Plan — zadania, bilety i noclegi
              </Link>

              <Link
                href={`/trips/${tripId}/budget`}
                className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-4 text-sm font-medium text-neutral-900"
              >
                Budżet — wydatki i rozliczenia
              </Link>

              <Link
                href={`/trips/${tripId}/checklist`}
                className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-4 text-sm font-medium text-neutral-900"
              >
                Checklista — pakowanie i lista rzeczy
              </Link>

              <Link
                href={`/trips/${tripId}/stops`}
                className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-4 text-sm font-medium text-neutral-900"
              >
                Przystanki — miasta i kolejność podróży
              </Link>

              <Link
                href={`/trips/${tripId}/cover`}
                className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-4 text-sm font-medium text-neutral-900"
              >
                Okładka — zdjęcie i wygląd tripa
              </Link>

              <Link
                href={`/trips/${tripId}/share`}
                className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-4 text-sm font-medium text-neutral-900"
              >
                Udostępnianie — publiczny link i współdzielenie
              </Link>
            </div>
          </SectionCard>
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-24 right-5 z-50 grid h-14 w-14 place-items-center rounded-2xl bg-neutral-900 text-2xl text-white shadow-[0_18px_40px_rgba(2,6,23,0.35)] active:scale-[0.96]"
        >
          +
        </button>

        {sheetOpen && (
          <div className="fixed inset-0 z-[100]">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSheetOpen(false)}
            />

            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 300 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 120) setSheetOpen(false);
              }}
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-[32px] bg-white p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />

              <div className="space-y-3">
                <Link
                  href={`/trips/${tripId}/budget`}
                  className="block w-full rounded-2xl bg-neutral-900 py-3 text-center font-semibold text-white"
                >
                  ➕ Dodaj wydatek
                </Link>

                <Link
                  href={`/trips/${tripId}/stops`}
                  className="block w-full rounded-2xl border border-slate-200 py-3 text-center font-semibold"
                >
                  📍 Dodaj stop
                </Link>

                <Link
                  href={`/trips/${tripId}/plan`}
                  className="block w-full rounded-2xl border border-slate-200 py-3 text-center font-semibold"
                >
                  ✅ Dodaj zadanie
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
