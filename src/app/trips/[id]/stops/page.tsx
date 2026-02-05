"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Stop = {
  id: string;
  name: string;
  countryCode?: string;
  sort_order: number;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

export default function StopsPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const keyStops = useMemo(() => `wandersplit:stops:${tripId}`, [tripId]);

  const [stops, setStops] = useState<Stop[]>([]);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const raw = localStorage.getItem(keyStops);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const normalized: Stop[] = arr.map((s: any, i: number) => ({
            id: String(s.id || uid()),
            name: String(s.name || ""),
            countryCode: s.countryCode ? String(s.countryCode) : undefined,
            sort_order: Number.isFinite(s.sort_order) ? Number(s.sort_order) : i + 1,
          }));
          setStops(normalized);
          return;
        }
      } catch {}
    }

    // defaulty do testów
    setStops([
      { id: uid(), name: "Rome", countryCode: "IT", sort_order: 1 },
      { id: uid(), name: "Florence", countryCode: "IT", sort_order: 2 },
    ]);
  }, [tripId, keyStops]);

  useEffect(() => {
    if (!tripId) return;
    localStorage.setItem(keyStops, JSON.stringify(stops));
  }, [stops, tripId, keyStops]);

  function addStop() {
    setMsg(null);
    const n = name.trim();
    if (!n) return setMsg("Wpisz nazwę miasta (np. Rome).");

    const cc = countryCode.trim().toUpperCase();
    const maxOrder = stops.reduce((m, s) => Math.max(m, s.sort_order), 0);

    setStops((prev) => [
      { id: uid(), name: n, countryCode: cc || undefined, sort_order: maxOrder + 1 },
      ...prev,
    ]);

    setName("");
    setCountryCode("");
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const ordered = stops.slice().sort((a, b) => a.sort_order - b.sort_order);
    const idx = ordered.findIndex((s) => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ordered.length) return;

    const a = ordered[idx];
    const b = ordered[j];
    const tmp = a.sort_order;
    a.sort_order = b.sort_order;
    b.sort_order = tmp;

    setStops(ordered);
  }

  const orderedStops = stops.slice().sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stops</h1>
          <p className="mt-1 text-sm text-gray-600">
            Trip ID: <span className="font-mono">{tripId || "-"}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <a className="rounded-xl border px-4 py-2 text-sm" href={`/trips/${tripId}`}>← Trip</a>
          <a className="rounded-xl border px-4 py-2 text-sm" href={`/trips/${tripId}/map`}>Mapa →</a>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border p-3 md:col-span-2"
            placeholder="Miasto (np. Rome)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStop()}
          />
          <input
            className="rounded-xl border p-3"
            placeholder="Kraj (opc.) np. IT"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          />
        </div>

        <button onClick={addStop} className="mt-3 rounded-xl bg-black px-4 py-3 text-white">
          Dodaj stop
        </button>

        {msg ? <p className="mt-3 text-sm text-gray-700">{msg}</p> : null}
      </div>

      <div className="mt-6 space-y-2">
        {orderedStops.length === 0 ? (
          <p className="text-sm text-gray-600">Brak stopów. Dodaj pierwszy 🙂</p>
        ) : (
          orderedStops.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-2xl border p-4">
              <div>
                <div className="font-medium">
                  #{s.sort_order} · {s.name}{" "}
                  {s.countryCode ? <span className="text-gray-500">({s.countryCode})</span> : null}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => move(s.id, -1)} className="rounded-xl border px-3 py-2 text-sm">↑</button>
                <button onClick={() => move(s.id, 1)} className="rounded-xl border px-3 py-2 text-sm">↓</button>
                <button onClick={() => removeStop(s.id)} className="rounded-xl border px-3 py-2 text-sm">Usuń</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
