"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getTripCoverDeterministic } from "@/lib/mobile/covers";

type TripMeta = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  base_currency: string;
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function TripHero({ tripId, section }: { tripId: string; section: string }) {
  const cover = useMemo(() => getTripCoverDeterministic(tripId), [tripId]);
  const [meta, setMeta] = useState<TripMeta | null>(null);

  useEffect(() => {
    const trips = safeRead<TripMeta[]>("wandersplit:trips", []);
    const t = Array.isArray(trips) ? trips.find((x) => x.id === tripId) ?? null : null;
    setMeta(t);
  }, [tripId]);

  const title = meta?.title || "Trip";
  const metaLine = meta ? `${meta.start_date} → ${meta.end_date} · ${meta.base_currency}` : " ";

  return (
    <div className="px-4 pt-5">
      <div
        className="relative overflow-hidden rounded-[30px] shadow-[0_26px_90px_rgba(2,6,23,0.28)]"
        style={{ backgroundImage: `url('${cover}')`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/10" />
        <div className="relative p-5 text-white">
          <div className="flex items-center justify-between">
            <Link
              href={`/trips/${tripId}`}
              className="rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20 active:scale-[0.98]"
            >
              ← Wróć
            </Link>
            <div className="rounded-2xl bg-white/15 px-3 py-2 text-xs font-extrabold backdrop-blur">
              {section}
            </div>
          </div>

          <div className="mt-10">
            <div className="text-2xl font-black leading-tight tracking-tight">{title}</div>
            <div className="mt-1 text-sm text-white/80">{metaLine}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
