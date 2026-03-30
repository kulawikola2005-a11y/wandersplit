"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const ShareMapClient = dynamic(() => import("./ShareMapClient"), { ssr: false });

type Stop = { id?: string; name: string; countryCode?: string; sort_order?: number; lat?: number; lng?: number };
type Snapshot = { tripId: string; plan: any[]; checklist: any[]; stops: Stop[]; budget: any[] };

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

  useEffect(() => {
    if (!token) {
      setMsg("Brak token");
      return;
    }

    (async () => {
      setMsg(null);
      const r = await fetch(`/api/share/${token}`);
      const j = await r.json().catch(() => null);
      if (!r.ok) return setMsg(j?.error || `HTTP ${r.status}`);
      setSnap(j);
    })();
  }, [token]);

  useEffect(() => {
    if (!snap) return;
    const stops = (snap.stops || []).slice();
    if (!stops.length) return;

    (async () => {
      try {
        setMsg(null);

        const ordered = stops
          .map((s, i) => ({ ...s, sort_order: Number.isFinite(s.sort_order as any) ? (s.sort_order as number) : i + 1 }))
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
        }
      } catch (e: any) {
        setMsg(e?.message ?? "Błąd");
      }
    })();
  }, [snap]);

  async function loadWeather() {
    if (!points.length) return;
    setMsg(null);
    setWeather(null);

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
    }
  }

  const btn = (t: any) =>
    `rounded-xl border px-4 py-2 text-sm ${tab === t ? "bg-black text-white border-black" : ""}`;

  if (!snap) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Public trip</h1>
        <p className="mt-2 text-sm text-gray-600">Ładuję…</p>
        {msg ? <p className="mt-3 text-sm text-red-600">{msg}</p> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Public trip</h1>
      <p className="mt-1 text-sm text-gray-600">
        Token: <span className="font-mono">{token}</span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className={btn("plan")} onClick={() => setTab("plan")}>Plan</button>
        <button className={btn("stops")} onClick={() => setTab("stops")}>Stops</button>
        <button className={btn("map")} onClick={() => setTab("map")}>Mapa</button>
        <button className={btn("weather")} onClick={() => { setTab("weather"); loadWeather(); }}>Pogoda</button>
      </div>

      {msg ? <p className="mt-3 text-sm text-red-600">{msg}</p> : null}

      {tab === "plan" ? (
        <div className="mt-6 rounded-2xl border p-4">
          <div className="font-medium">Plan</div>
          <ul className="mt-3 list-disc pl-5 text-sm">
            {(snap.plan || []).map((x: any, i: number) => (
              <li key={i}>{x?.text || x?.title || JSON.stringify(x)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "stops" ? (
        <div className="mt-6 rounded-2xl border p-4">
          <div className="font-medium">Stops</div>
          <ul className="mt-3 list-disc pl-5 text-sm">
            {(snap.stops || []).map((s: any, i: number) => (
              <li key={i}>{s?.name}{s?.countryCode ? ` (${s.countryCode})` : ""}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "map" ? (
        <div className="mt-6">
          {summary ? (
            <div className="mb-3 text-sm">
              Distance: <b>{summary.km} km</b> · Time: <b>{summary.h} h</b>
            </div>
          ) : null}
          <ShareMapClient points={points} line={line} />
        </div>
      ) : null}

      {tab === "weather" ? (
        <div className="mt-6 space-y-4">
          {!weather ? <p className="text-sm text-gray-600">Ładuję pogodę…</p> : null}

          {weather
            ? Object.entries(weather).map(([label, d]: any) => (
                <div key={label} className="rounded-2xl border p-4">
                  <div className="font-medium">{label}</div>
                  {!d ? (
                    <p className="mt-2 text-sm text-gray-600">Brak danych</p>
                  ) : (
                    <div className="mt-3 overflow-auto">
                      <table className="min-w-[520px] text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="py-1 pr-4">Date</th>
                            <th className="py-1 pr-4">Max</th>
                            <th className="py-1 pr-4">Min</th>
                            <th className="py-1 pr-4">Rain</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(d.time || []).slice(0, 7).map((t: string, i: number) => (
                            <tr key={t} className="border-t">
                              <td className="py-1 pr-4">{t}</td>
                              <td className="py-1 pr-4">{d.temperature_2m_max?.[i]}°</td>
                              <td className="py-1 pr-4">{d.temperature_2m_min?.[i]}°</td>
                              <td className="py-1 pr-4">{d.precipitation_sum?.[i]} mm</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}