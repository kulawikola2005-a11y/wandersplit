"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  Wallet,
  ListTodo,
  MapPin,
  ImageIcon,
  ChevronRight,
  Share2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import PageTransition from "@/components/ui/PageTransition";

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
  } catch {
    return null;
  }
}

function NavRow({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50"
    >
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        <div className="truncate text-xs text-slate-500">{subtitle}</div>
      </div>

      <ChevronRight size={16} className="text-slate-400" />
    </Link>
  );
}

export default function TripHomePage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  const cover = useMemo(() => pickCover(tripId), [tripId]);

  useEffect(() => {
    async function loadTrip() {
      if (!tripId) return;

      setLoading(true);

      const { data } = await supabase
        .from("trips")
        .select("id, title, start_date, end_date, base_currency, cover_path, user_id")
        .eq("id", tripId)
        .maybeSingle();

      if (data) {
        setTrip(data);
        setLoading(false);
        return;
      }

      const localTrip = readTripFromLocalStorage(tripId);
      setTrip(localTrip);
      setLoading(false);
    }

    loadTrip();
  }, [tripId]);

  if (loading) {
    return (
      <div className="px-3 pb-10 pt-5">
        <div className="space-y-4">
          <div className="h-44 w-full animate-pulse rounded-[28px] bg-slate-200" />
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-20 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-20 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-20 animate-pulse rounded-[24px] bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="px-3 pb-10 pt-5">
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-4 py-10 text-center shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            Nie udało się otworzyć tripa
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Trip nie istnieje albo nie masz do niego dostępu.
          </div>
          <Link
            href="/trips"
            className="mt-4 inline-block rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Wróć do listy tripów
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="px-3 pb-10 pt-5">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="relative h-44 w-full">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url('${cover}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                <Link
                  href="/trips"
                  className="rounded-2xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 backdrop-blur"
                >
                  Wróć
                </Link>

                <div className="rounded-2xl bg-white/90 px-3 py-2 text-xs font-extrabold text-slate-900 backdrop-blur">
                  Home
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-xl font-black text-white drop-shadow">
                  {trip.title || "Trip"}
                </div>
                <div className="mt-1 text-sm text-white/80">
                  {trip.start_date || "Brak daty"} {trip.end_date ? `→ ${trip.end_date}` : ""}
                </div>
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="inline-flex rounded-2xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                Waluta: {trip.base_currency || "EUR"}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Sekcje tripa</div>

            <div className="mt-3 space-y-3">
              <NavRow
                href={`/trips/${tripId}/plan`}
                icon={<CalendarDays size={18} />}
                title="Plan"
                subtitle="Zadania, bilety i noclegi"
              />
              <NavRow
                href={`/trips/${tripId}/budget`}
                icon={<Wallet size={18} />}
                title="Budżet"
                subtitle="Wydatki i rozliczenia"
              />
              <NavRow
                href={`/trips/${tripId}/checklist`}
                icon={<ListTodo size={18} />}
                title="Checklist"
                subtitle="Pakowanie i lista rzeczy"
              />
              <NavRow
                href={`/trips/${tripId}/stops`}
                icon={<MapPin size={18} />}
                title="Przystanki"
                subtitle="Miasta i kolejność podróży"
              />
              <NavRow
                href={`/trips/${tripId}/cover`}
                icon={<ImageIcon size={18} />}
                title="Okładka"
                subtitle="Zdjęcie i wygląd tripa"
              />
              <NavRow
                href={`/trips/${tripId}/share`}
                icon={<Share2 size={18} />}
                title="Udostępnianie"
                subtitle="Publiczny link i współdzielenie"
              />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
