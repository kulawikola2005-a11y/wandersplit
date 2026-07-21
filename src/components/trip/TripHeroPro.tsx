"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getTripCoverUrl } from "@/lib/trips/media";
import { getSmartCover } from "@/lib/trips/getSmartCover";

type TripMeta = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  base_currency: string;
  cover_path?: string | null;
};

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

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return "Brak dat";
  if (start && end) return `${start} → ${end}`;
  return start || end || "Brak dat";
}

export default function TripHeroPro({ tripId, section }: { tripId: string; section: string }) {
  const [mounted, setMounted] = useState(false);
  const [meta, setMeta] = useState<TripMeta | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const fallbackCover = useMemo(
    () => getSmartCover(meta?.title || "travel", tripId),
    [meta?.title, tripId]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setMounted(true);

      const trips = safeReadTrips();
      const localMeta = trips.find((t) => t.id === tripId) ?? null;

      if (!cancelled) setMeta(localMeta);

      const localCoverPath = localMeta?.cover_path ?? null;
      if (localCoverPath) {
        try {
          const url = await getTripCoverUrl(localCoverPath);
          if (!cancelled) setCoverUrl(url);
        } catch {
          if (!cancelled) setCoverUrl(null);
        }
      }

      try {
        const { data, error } = await supabase
          .from("trips")
          .select("id, title, start_date, end_date, base_currency, cover_path")
          .eq("id", tripId)
          .maybeSingle();

        if (!cancelled && !error && data) {
          setMeta(data);

          if (data.cover_path) {
            const url = await getTripCoverUrl(data.cover_path);
            if (!cancelled) setCoverUrl(url);
          }
        }
      } catch {
        // local fallback zostaje
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (!mounted) {
    return (
      <div className="px-4 pt-4">
        <div className="h-[210px] animate-pulse rounded-[34px] bg-slate-200/80" />
      </div>
    );
  }

  const title = meta?.title || "Trip";

  return (
    <div className="px-4 pt-4">
      <div className="relative h-[250px] overflow-hidden rounded-[34px] bg-slate-900 shadow-[0_26px_70px_rgba(15,23,42,0.22)]">
        <div
          className="absolute inset-0 scale-[1.03] bg-cover bg-center"
          style={{
            backgroundImage: `url('${coverUrl || fallbackCover}')`,
          }}
        />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.28)_42%,rgba(0,0,0,0.84)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.25),transparent_34%)]" />

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <Link
            href={`/trips/${tripId}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/88 text-slate-950 shadow-sm backdrop-blur-xl active:scale-95"
            aria-label="Wróć"
          >
            <ChevronLeft size={21} />
          </Link>

          <div className="rounded-full border border-white/25 bg-black/24 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-xl">
            {section}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/14 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/85 backdrop-blur-xl">
            <CalendarDays size={13} />
            Moka trip
          </div>

          <h1 className="max-w-[330px] text-[34px] font-black leading-[0.95] tracking-[-0.04em] text-white">
            {title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/16 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xl">
              {formatDateRange(meta?.start_date, meta?.end_date)}
            </span>
            <span className="rounded-full bg-white/16 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xl">
              {meta?.base_currency || "EUR"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
