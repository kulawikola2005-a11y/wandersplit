"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Stop = { id: string; name: string; countryCode?: string };

type DayRow = {
  date: string;
  tMax: number;
  tMin: number;
  precip: number;
};

type StopResult =
  | { status: "idle" | "loading"; error?: never; data?: never }
  | { status: "error"; error: string; data?: never }
  | {
      status: "ok";
      error?: never;
      data: {
        label: string;
        latitude: number;
        longitude: number;
        timezone?: string;
        days: DayRow[];
      };
    };

function fmtNum(v: number) {
  return Number.isFinite(v) ? v.toFixed(1) : "-";
}

async function geocode(stop: Stop) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", stop.name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  if (stop.countryCode) url.searchParams.set("countryCode", stop.countryCode);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geocoding HTTP ${res.status}`);

  const json = await res.json();
  const r = json?.results?.[0];
  if (!r) throw new Error("Nie znaleziono lokalizacji. Spróbuj dopisać countryCode (np. IT).");

  const labelParts = [r.name, r.admin1, r.country].filter(Boolean);
  return {
    label: labelParts.join(", "),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    timezone: r.timezone as string | undefined,
  };
}

async function forecast(latitude: number, longitude: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);

  const json = await res.json();
  const d = json?.daily;

  if (!d?.time || !d?.temperature_2m_max || !d?.temperature_2m_min) {
    throw new Error("Brak danych dziennych z API.");
  }

  const rows: DayRow[] = d.time.map((date: string, i: number) => ({
    date,
    tMax: Number(d.temperature_2m_max[i]),
    tMin: Number(d.temperature_2m_min[i]),
    precip: Number(d.precipitation_sum?.[i] ?? 0),
  }));

  return rows.slice(0, 7);
}

export default function WeatherPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const keyStops = useMemo(() => `wandersplit:stops:${tripId}`, [tripId]);

  const [stops, setStops] = useState<Stop[]>([]);
  const [results, setResults] = useState<Record<string, StopResult>>({});

  function loadStops() {
    if (!tripId) return;
    const raw = localStorage.getItem(keyStops);
    const arr: Stop[] = raw ? JSON.parse(raw) : [];
    setStops(Array.isArray(arr) ? arr : []);
  }

  useEffect(() => {
    loadStops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function refreshAll() {
    if (!stops.length) return;

    // ustaw loading
    const init: Record<string, StopResult> = {};
    stops.forEach((s) => (init[s.id] = { status: "loading" }));
    setResults(init);

    // fetch po kolei (czytelniej + mniej limitów)
    for (const s of stops) {
      try {
        const loc = await geocode(s);
        const days = await forecast(loc.latitude, loc.longitude);
        setResults((prev) => ({
          ...prev,
          [s.id]: {
            status: "ok",
            data: { ...loc, days },
          },
        }));
      } catch (e: any) {
        setResults((prev) => ({
          ...prev,
          [s.id]: { status: "error", error: e?.message || "Błąd" },
        }));
      }
    }
  }

  useEffect(() => {
    if (stops.length) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops.length, tripId]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pogoda</h1>
          <p className="mt-1 text-sm text-gray-600">
            7 dni prognozy dla każdego stopa (Open-Meteo).
          </p>
        </div>

        <div className="flex gap-2">
          <a className="rounded-xl border px-4 py-2 text-sm" href={`/trips/${tripId}`}>
            ← Trip
          </a>
          <a className="rounded-xl border px-4 py-2 text-sm" href={`/trips/${tripId}/stops`}>
            Stops
          </a>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-gray-600">
            Stops: <b>{stops.length}</b>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                loadStops();
                setResults({});
              }}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Wczytaj ponownie
            </button>
            <button
              onClick={refreshAll}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white"
              disabled={!stops.length}
            >
              Odśwież pogodę
            </button>
          </div>
        </div>

        {stops.length === 0 ? (
          <p className="mt-3 text-sm text-gray-700">
            Nie masz stopów. Dodaj je w <a className="underline" href={`/trips/${tripId}/stops`}>Stops</a>.
          </p>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        {stops.map((s) => {
          const r = results[s.id] || { status: "idle" as const };

          return (
            <div key={s.id} className="rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    {s.name} {s.countryCode ? <span className="text-gray-500">({s.countryCode})</span> : null}
                  </div>

                  {r.status === "ok" ? (
                    <div className="mt-1 text-sm text-gray-600">
                      {r.data.label} · {r.data.latitude.toFixed(3)}, {r.data.longitude.toFixed(3)}
                    </div>
                  ) : null}

                  {r.status === "loading" ? (
                    <div className="mt-1 text-sm text-gray-600">Ładuję…</div>
                  ) : null}

                  {r.status === "error" ? (
                    <div className="mt-1 text-sm text-red-600">{r.error}</div>
                  ) : null}
                </div>
              </div>

              {r.status === "ok" ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="border-b p-2">Data</th>
                        <th className="border-b p-2">Min (°C)</th>
                        <th className="border-b p-2">Max (°C)</th>
                        <th className="border-b p-2">Opad (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.data.days.map((d) => (
                        <tr key={d.date}>
                          <td className="border-b p-2">{d.date}</td>
                          <td className="border-b p-2">{fmtNum(d.tMin)}</td>
                          <td className="border-b p-2">{fmtNum(d.tMax)}</td>
                          <td className="border-b p-2">{fmtNum(d.precip)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Open-Meteo: geocoding + forecast (bez API key dla non-commercial). Jeśli będziesz to monetyzować, sprawdź licencję/plan. 
      </p>
    </div>
  );
}
