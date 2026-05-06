"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles, CalendarDays, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getTripCoverUrl } from "@/lib/trips/media";
import { getSmartCover } from "@/lib/trips/getSmartCover";

type Trip = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  base_currency: string;
  created_at: string;
  cover_path?: string | null;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random();
}

async function readTripsFromDB(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return "Brak dat";
  if (start && end) return `${start} → ${end}`;
  return start || end || "Brak dat";
}

function isValidTrip(t: any): t is Trip {
  return Boolean(
    t &&
    typeof t === "object" &&
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    t.title.trim().length > 0 &&
    !t.title.includes("@")
  );
}

export default function TripsPage() {
  const pathname = usePathname();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("EUR");

  useEffect(() => {
    async function loadTrips() {
      let localTrips: Trip[] = [];

      try {
        const raw = localStorage.getItem("wandersplit:trips");
        const parsed = raw ? JSON.parse(raw) : [];
        localTrips = Array.isArray(parsed) ? parsed : [];
      } catch {
        localTrips = [];
      }

      if (localTrips.length === 0) {
        try {
          const lastRaw = localStorage.getItem("wandersplit:lastTrip");
          const lastTrip = lastRaw ? JSON.parse(lastRaw) : null;
          if (isValidTrip(lastTrip)) {
            localTrips = [lastTrip];
            localStorage.setItem("wandersplit:trips", JSON.stringify(localTrips));
          }
        } catch {}
      }

      setTrips(localTrips);

      const dbTrips = await readTripsFromDB();

      const mergedMap = new Map<string, Trip>();

      for (const t of localTrips) {
        if (isValidTrip(t)) mergedMap.set(String(t.id), t);
      }

      for (const t of dbTrips) {
        if (isValidTrip(t)) mergedMap.set(String(t.id), t);
      }

      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      if (merged.length > 0) {
        setTrips(merged);
        try {
          localStorage.setItem("wandersplit:trips", JSON.stringify(merged));
        } catch {}
      }

      const map: Record<string, string> = {};
      for (const t of merged.length > 0 ? merged : localTrips) {
        if (t.cover_path) {
          const url = await getTripCoverUrl(t.cover_path);
          if (url) map[t.id] = url;
        }
      }

      setCoverUrls(map);
    }

    loadTrips();

    const onVisible = () => {
      if (document.visibilityState === "visible") loadTrips();
    };

    window.addEventListener("focus", loadTrips);
    window.addEventListener("pageshow", loadTrips);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", loadTrips);
      window.removeEventListener("pageshow", loadTrips);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  async function createTrip() {
    if (!title.trim()) return;

    const id = uid();

    const trip = {
      id,
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      base_currency: currency,
      created_at: new Date().toISOString(),
    };

    const local = JSON.parse(localStorage.getItem("wandersplit:trips") || "[]");

    const nextTrips = [trip, ...local.filter((t: any) => String(t?.id) !== String(id))];

    localStorage.setItem("wandersplit:trips", JSON.stringify(nextTrips));
    localStorage.setItem("wandersplit:lastTrip", JSON.stringify(trip));

    window.location.href = `/trips/${id}`;
  }

  const featured = trips[0];

  const totalTrips = trips.length;
  const upcomingLabel = useMemo(() => {
    if (!featured) return "Zacznij swój pierwszy plan";
    return featured.start_date || "Gotowe do planowania";
  }, [featured]);

  const canCreate = title.trim().length > 0;

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(224,231,255,0.6)_0%,#f8fafc_40%,#eef2f7_100%)] pb-32">
      <section className="relative overflow-hidden px-4 pb-5 pt-5">
        <div className="mx-auto max-w-[430px]">
          <div className="relative overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.82)_0%,rgba(244,240,255,0.92)_45%,rgba(236,233,255,0.96)_100%)] px-5 pb-5 pt-5 text-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-200/45 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-violet-200/40 blur-3xl" />

            <div className="relative flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-sm">
                  <Sparkles size={14} />
                  Moka
                </div>

                <h1 className="mt-4 max-w-[260px] text-[28px] font-bold leading-[1.05] tracking-tight">
                  Moje podróże pod kontrolą
                </h1>

                <p className="mt-3 max-w-[280px] text-sm leading-6 text-slate-500">
                  Planuj trasy, zapisuj miejsca, ogarniaj budżet i miej cały wyjazd w jednej aplikacji.
                </p>
              </div>

              <button
                onClick={() => setOpen(true)}
                className="shrink-0 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Nowy
              </button>
            </div>

            <div className="relative mt-5 flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-black/5 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
                🌍 {totalTrips} {totalTrips === 1 ? "podróż" : "podróże"}
              </div>

              <div className="max-w-full rounded-full border border-black/5 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
                ✈️ Next: <span className="text-slate-900">{upcomingLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4">
        <div className="mx-auto max-w-[430px] space-y-7">
          {featured ? (
            <section className="ws-card-strong overflow-hidden p-3">
              <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Featured
                  </div>
                  <h2 className="mt-1 text-[28px] font-bold tracking-tight text-slate-900">
                    Ostatnio edytowany
                  </h2>
                </div>

                <Link
                  href={`/trips/${featured.id}`}
                  className="rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white"
                >
                  Otwórz
                </Link>
              </div>

              <Link href={`/trips/${featured.id}`} className="block">
                <div className="relative overflow-hidden rounded-[32px]">
                  <div
                    className="h-[260px] w-full bg-cover bg-center transition-all duration-500 ease-out hover:scale-[1.03] hover:shadow-[0_30px_80px_rgba(0,0,0,0.18)] hover:shadow-[0_30px_80px_rgba(0,0,0,0.18)]"
                    style={{
                      backgroundImage: `linear-gradient(to top, rgba(12,18,28,0.32), rgba(12,18,28,0.02)), url('${coverUrls[featured.id] || getSmartCover(featured.title, featured.id)}')`,
                    }}
                  />

                  <div className="absolute inset-x-0 bottom-0 p-5 rounded-b-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(20,20,30,0.18)_100%)] backdrop-blur-md">
                    <div className="inline-flex rounded-full bg-white/14 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/78 backdrop-blur">
                      Trip overview
                    </div>

                    <h3 className="mt-3 text-[34px] font-bold tracking-tight text-white">
                      {featured.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-white/80">
                      {formatDateRange(featured.start_date, featured.end_date)}
                    </p>

                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                      Otwórz podróż
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </Link>
            </section>
          ) : (
            <section className="ws-card-strong p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Start here
              </div>
              <h2 className="mt-2 text-[28px] font-bold tracking-tight text-slate-900">
                Stwórz swój pierwszy trip
              </h2>
              <p className="mt-3 text-sm leading-7 text-neutral-500">
                Zacznij od nazwy podróży i dat, a potem dodasz plan, miejsca, checklistę i budżet.
              </p>

              <button
                onClick={() => setOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
              >
                <Plus size={18} />
                Stwórz pierwszy trip
              </button>
            </section>
          )}

          <section className="ws-card p-5 mb-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Collection
                </div>
                <h2 className="mt-2 text-[28px] font-bold tracking-tight text-slate-900">
                  Moje podróże
                </h2>
              </div>

              <button
                onClick={() => setOpen(true)}
                className="rounded-full bg-[#eef2f7] px-3.5 py-2 text-sm font-semibold text-slate-900"
              >
                Dodaj
              </button>
            </div>

            {trips.length > 0 ? (
              <div className="-mx-1 mt-5 flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-2">
                {trips.map((t) => {
                  const cover = coverUrls[t.id] || getSmartCover(t.title, t.id);

                  return (
                    <Link
                      key={t.id}
                      href={`/trips/${t.id}`}
                      className="min-w-[255px] max-w-[255px] snap-start"
                    >
                      <div className="overflow-hidden rounded-[32px] border border-white/60 bg-white/75 backdrop-blur-xl shadow-[0_16px_36px_rgba(15,23,42,0.10)]">
                        <div className="relative h-[185px] overflow-hidden">
                          <div
                            className="absolute inset-0 bg-cover bg-center transition duration-300 hover:scale-[1.02] active:scale-[0.97]"
                            style={{
                              backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.52), rgba(0,0,0,0.10)), url('${cover}')`,
                            }}
                          />
                          <div className="absolute left-4 top-6 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-900 backdrop-blur">
                            Trip
                          </div>
                        </div>

                        <div className="p-6">
                          <div className="line-clamp-1 text-lg font-bold tracking-tight text-slate-900">
                            {t.title}
                          </div>

                          <div className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                            <CalendarDays size={15} />
                            {formatDateRange(t.start_date, t.end_date)}
                          </div>

                          <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                            {t.base_currency || "EUR"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[26px] border border-dashed border-black/10 bg-[#fbfcfe] p-5">
                <div className="text-base font-semibold text-slate-900">
                  Jeszcze nie masz żadnych tripów
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-500">
                  Dodaj pierwszy wyjazd i zbuduj swoją własną kolekcję podróży.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#312e81_0%,#5b3b8c_55%,#8b5cf6_100%)] px-5 text-sm font-semibold text-white shadow-[0_25px_70px_rgba(0,0,0,0.40)] transition hover:scale-[1.02] active:scale-[0.97]"
      >
        <Plus size={18} />
        Dodaj
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="absolute bottom-0 left-0 right-0 rounded-t-[34px] border-t border-white/60 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_-18px_60px_rgba(12,18,28,0.02)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300" />

            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              New trip
            </div>
            <h3 className="mt-2 text-[28px] font-bold tracking-tight text-slate-900">
              Nowa podróż
            </h3>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              Zacznij od podstaw, a resztę dopracujesz już wewnątrz tripa.
            </p>

            <div className="mt-5 space-y-3">
              <input
                placeholder="Np. Bali Journey"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-[22px] border border-black/5 bg-white px-4 py-3.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300"
              />

              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-[22px] border border-black/5 bg-white px-4 py-3.5 text-slate-900 shadow-sm outline-none focus:border-slate-300"
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-[22px] border border-black/5 bg-white px-4 py-3.5 text-slate-900 shadow-sm outline-none focus:border-slate-300"
                />
              </div>

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-[22px] border border-black/5 bg-white px-4 py-3.5 text-slate-900 shadow-sm outline-none focus:border-slate-300"
              >
                <option value="EUR">EUR</option>
                <option value="PLN">PLN</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>

              <button
                onClick={createTrip}
                disabled={!canCreate}
                className="w-full rounded-[22px] bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.20)] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stwórz trip
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
