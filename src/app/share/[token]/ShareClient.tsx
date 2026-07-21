"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CloudSun, Map, MapPin } from "lucide-react";

const ShareMapClient = dynamic(() => import("./ShareMapClient"), { ssr: false });

type Stop = {
  id?: string;
  name: string;
  countryCode?: string;
  sort_order?: number;
  lat?: number;
  lng?: number;
};

type Snapshot = {
  tripId: string;
  plan: any[];
  checklist: any[];
  stops: Stop[];
  budget: any[];
};

async function geocode(stop: Stop) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", stop.name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  if (stop.countryCode) url.searchParams.set("countryCode", stop.countryCode);

  const res = await fetch(url.toString());
  const json = await res.json();
  const r = json?.results?.[0];
  if (!r) throw new Error(`Nie znaleziono: ${stop.name} (dodaj countryCode)`);

  const label = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
  return { label, lat: Number(r.latitude), lng: Number(r.longitude) };
}

export default function ShareClient({ token }: { token: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<"plan" | "stops" | "map" | "weather">("plan");
  const [msg, setMsg] = useState<string | null>(null);

  const [points, setPoints] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [line, setLine] = useState<Array<[number, number]>>([]);
  const [summary, setSummary] = useState<{ km: number; h: number } | null>(null);
  const [weather, setWeather] = useState<Record<string, any> | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);

  useEffect(() => {
    if (!token) {
      setMsg("Brak tokenu.");
      setLoadingTrip(false);
      return;
    }

    (async () => {
      setMsg(null);
      setLoadingTrip(true);

      try {
        const r = await fetch(`/api/share/${token}`);
        const j = await r.json().catch(() => null);
        if (!r.ok) {
          setMsg(j?.error || `HTTP ${r.status}`);
          setSnap(null);
          return;
        }
        setSnap(j);
      } finally {
        setLoadingTrip(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!snap) return;
    const stops = (snap.stops || []).slice();
    if (!stops.length) return;

    (async () => {
      try {
        setMsg(null);
        setLoadingMap(true);

        const ordered = stops
          .map((s, i) => ({
            ...s,
            sort_order: Number.isFinite(s.sort_order as any) ? (s.sort_order as number) : i + 1,
          }))
          .sort((a, b) => (a.sort_order! - b.sort_order!));

        const out: Array<{ label: string; lat: number; lng: number }> = [];
        for (const s of ordered) out.push(await geocode(s));
        setPoints(out);

        if (out.length >= 2) {
          try {
            const coords = out.map((p) => [p.lng, p.lat] as [number, number]);
            const rr = await fetch("/api/route", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profile: "driving-car", coordinates: coords }),
            });
            const jj = await rr.json();
            if (!rr.ok) throw new Error(jj?.error || `HTTP ${rr.status}`);

            const feature = jj?.features?.[0];
            const routeCoords: Array<[number, number]> = feature?.geometry?.coordinates ?? [];
            const distM: number = feature?.properties?.summary?.distance ?? 0;
            const durS: number = feature?.properties?.summary?.duration ?? 0;

            setLine(routeCoords.map(([lng, lat]) => [lat, lng]));
            setSummary({
              km: Math.round((distM / 1000) * 10) / 10,
              h: Math.round((durS / 3600) * 10) / 10,
            });
          } catch {
            setLine(out.map((p) => [p.lat, p.lng]));
            setSummary(null);
          }
        } else {
          setLine(out.map((p) => [p.lat, p.lng]));
          setSummary(null);
        }
      } catch (e: any) {
        setMsg(e?.message ?? "Błąd");
      } finally {
        setLoadingMap(false);
      }
    })();
  }, [snap]);

  async function loadWeather() {
    if (!points.length) return;
    setMsg(null);
    setWeather(null);
    setLoadingWeather(true);

    try {
      const all: Record<string, any> = {};
      for (const p of points) {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(p.lat));
        url.searchParams.set("longitude", String(p.lng));
        url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
        url.searchParams.set("timezone", "auto");
        const r = await fetch(url.toString());
        const j = await r.json();
        all[p.label] = j?.daily || null;
      }
      setWeather(all);
    } catch (e: any) {
      setMsg(e?.message ?? "Weather error");
    } finally {
      setLoadingWeather(false);
    }
  }

  const tabs = [
    { key: "plan", label: "Plan", icon: CalendarDays },
    { key: "stops", label: "Stops", icon: MapPin },
    { key: "map", label: "Mapa", icon: Map },
    { key: "weather", label: "Pogoda", icon: CloudSun },
  ] as const;

  const stats = useMemo(() => {
    const stopsCount = snap?.stops?.length ?? 0;
    const planCount = snap?.plan?.length ?? 0;
    return { stopsCount, planCount };
  }, [snap]);

  const tabClass = (t: "plan" | "stops" | "map" | "weather") =>
    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
      tab === t
        ? "border-black bg-black text-white shadow-sm"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    }`;

  if (loadingTrip) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 h-9 w-56 animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
          </div>
          <div className="mt-6 h-72 animate-pulse rounded-[28px] bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!snap) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Public trip</h1>
          <p className="mt-2 text-sm text-slate-600">Nie udało się załadować tripa.</p>
          {msg ? <p className="mt-3 text-sm text-red-600">{msg}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              WanderSplit public share
            </div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Public trip</h1>
            <p className="mt-2 text-sm text-slate-600">
              Podgląd planu, przystanków, mapy i pogody bez logowania.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Token: <span className="font-mono text-slate-900">{token}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Plan items</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{stats.planCount}</div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Stops</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{stats.stopsCount}</div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Route</div>
            <div className="mt-2 text-lg font-bold text-slate-900">
              {summary ? `${summary.km} km` : points.length >= 2 ? "Ready" : "Pending"}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={tabClass(item.key)}
                onClick={() => {
                  setTab(item.key);
                  if (item.key === "weather" && !weather && !loadingWeather) {
                    loadWeather();
                  }
                }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {msg ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {msg}
          </div>
        ) : null}

        {tab === "plan" ? (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Plan podróży</div>
            {snap.plan?.length ? (
              <div className="mt-4 space-y-3">
                {snap.plan.map((x: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    {x?.text || x?.title || JSON.stringify(x)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Brak pozycji planu.</p>
            )}
          </div>
        ) : null}

        {tab === "stops" ? (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Przystanki</div>
            {snap.stops?.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {snap.stops.map((s: any, i: number) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Stop {i + 1}
                    </div>
                    <div className="mt-2 font-semibold text-slate-900">
                      {s?.name}
                      {s?.countryCode ? ` (${s.countryCode})` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Brak przystanków.</p>
            )}
          </div>
        ) : null}

        {tab === "map" ? (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">Mapa trasy</div>
                <div className="mt-1 text-sm text-slate-500">
                  {summary
                    ? `Distance: ${summary.km} km · Time: ${summary.h} h`
                    : points.length >= 2
                    ? "Trasa gotowa do wyświetlenia"
                    : "Dodaj więcej punktów, aby zobaczyć trasę"}
                </div>
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {loadingMap ? "Loading map…" : "Public view"}
              </div>
            </div>

            <div className="mt-4">
              <ShareMapClient points={points} line={line} />
            </div>
          </div>
        ) : null}

        {tab === "weather" ? (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Pogoda</div>

            {loadingWeather ? (
              <div className="mt-4 space-y-3">
                <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
                <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
              </div>
            ) : !weather ? (
              <p className="mt-3 text-sm text-slate-500">Kliknij zakładkę Pogoda, aby załadować prognozę.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {Object.entries(weather).map(([label, d]: any) => (
                  <div key={label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="font-semibold text-slate-900">{label}</div>

                    {!d ? (
                      <p className="mt-2 text-sm text-slate-500">Brak danych.</p>
                    ) : (
                      <div className="mt-3 overflow-auto">
                        <table className="min-w-[520px] text-sm">
                          <thead>
                            <tr className="text-left text-slate-500">
                              <th className="py-2 pr-4">Date</th>
                              <th className="py-2 pr-4">Max</th>
                              <th className="py-2 pr-4">Min</th>
                              <th className="py-2 pr-4">Rain</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(d.time || []).slice(0, 7).map((t: string, i: number) => (
                              <tr key={t} className="border-t border-slate-200">
                                <td className="py-2 pr-4">{t}</td>
                                <td className="py-2 pr-4">{d.temperature_2m_max?.[i]}°</td>
                                <td className="py-2 pr-4">{d.temperature_2m_min?.[i]}°</td>
                                <td className="py-2 pr-4">{d.precipitation_sum?.[i]} mm</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
