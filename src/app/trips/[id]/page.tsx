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

type Trip = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  base_currency?: string | null;
};

function readTripFromLocalStorage(tripId: string): Trip | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("wandersplit:trips");
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return arr.find((t: any) => String(t.id) === String(tripId)) || null;
  } catch {
    return null;
  }
}

function NavRow({ href, icon, title, subtitle }: any) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border p-4 bg-white shadow-sm">
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-bold">{title}</div>
        <div className="text-sm text-slate-500">{subtitle}</div>
      </div>
      <ChevronRight size={16} />
    </Link>
  );
}

export default function Page() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);

  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .maybeSingle();

      if (data) {
        setTrip(data);
        return;
      }

      const local = readTripFromLocalStorage(tripId);
      setTrip(local);
    }

    load();
  }, [tripId]);

  if (!trip) {
    return (
      <div className="px-3 pb-10 pt-5 space-y-4">
        <div className="h-44 w-full animate-pulse rounded-3xl bg-slate-200" />
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-10 pt-5 space-y-4">

      {/* HERO */}
      <div className="relative h-44 w-full rounded-3xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="text-xl font-black">{trip.title}</div>
          <div className="text-sm opacity-80">
            {trip.start_date || "Brak daty"} {trip.end_date ? `→ ${trip.end_date}` : ""}
          </div>
        </div>

        <Link href="/trips" className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-xl text-sm">
          Wróć
        </Link>
      </div>

      {/* SEKCJE */}
      <div className="space-y-3">
        <NavRow href={`/trips/${tripId}/plan`} icon={<CalendarDays size={18} />} title="Plan" subtitle="Zadania i bilety" />
        <NavRow href={`/trips/${tripId}/budget`} icon={<Wallet size={18} />} title="Budżet" subtitle="Wydatki" />
        <NavRow href={`/trips/${tripId}/checklist`} icon={<ListTodo size={18} />} title="Checklist" subtitle="Pakowanie" />
        <NavRow href={`/trips/${tripId}/stops`} icon={<MapPin size={18} />} title="Stops" subtitle="Trasa" />
        <NavRow href={`/trips/${tripId}/cover`} icon={<ImageIcon size={18} />} title="Cover" subtitle="Zdjęcie" />
        <NavRow href={`/trips/${tripId}/share`} icon={<Share2 size={18} />} title="Share" subtitle="Udostępnij" />
      </div>

    </div>
  );
}
