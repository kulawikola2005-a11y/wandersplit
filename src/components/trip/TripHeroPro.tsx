"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";

type TripMeta = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  base_currency: string;
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
  for (let i = 0; i < tripId.length; i++) h = (h * 31 + tripId.charCodeAt(i)) >>> 0;
  return covers[h % covers.length];
}

function safeReadTrips(): TripMeta[] {
  try {
    const raw = window.localStorage.getItem("wandersplit:trips");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function TripHeroPro({ tripId, section }: { tripId: string; section: string }) {
  const cover = useMemo(() => pickCover(tripId), [tripId]);
  const [mounted, setMounted] = useState(false);
  const [meta, setMeta] = useState<TripMeta | null>(null);

  useEffect(() => {
    setMounted(true);
    const trips = safeReadTrips();
    setMeta(trips.find((t) => t.id === tripId) ?? null);
  }, [tripId]);

  // żeby nie było hydration mismatch: na SSR i pierwszym renderze klienta pokazujemy to samo
  if (!mounted) {
    return (
      <div className="px-4 pt-5">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="h-36 w-full bg-slate-200 animate-pulse" />
          <div className="px-4 pb-4 -mt-10">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
              <div className="mt-2 h-3 w-56 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const title = meta?.title || "Trip";
  const metaLine = meta ? `${meta.start_date} → ${meta.end_date} · ${meta.base_currency}` : "";

  return (
    <div className="px-4 pt-5">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div
          className="h-36 w-full"
          style={{ backgroundImage: `url('${cover}')`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Link
            href={`/trips/${tripId}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-2 text-xs font-semibold text-slate-900 backdrop-blur hover:bg-white"
          >
            <ChevronLeft size={16} /> Wróć
          </Link>
          <div className="rounded-2xl bg-white/85 px-3 py-2 text-xs font-extrabold text-slate-900 backdrop-blur">
            {section}
          </div>
        </div>

        <div className="relative -mt-10 px-4 pb-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-lg font-extrabold text-slate-900">{title}</div>
            <div className="mt-1 text-xs text-slate-500">{metaLine}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
