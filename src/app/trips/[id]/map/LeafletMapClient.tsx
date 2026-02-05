"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

type Stop = { id: string; name: string; countryCode?: string };

type StopGeo = {
  id: string;
  name: string;
  countryCode?: string;
  label: string;
  lat: number;
  lon: number;
};

const DefaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
  if (!r) throw new Error(`Nie znaleziono: ${stop.name}. Dodaj countryCode (np. IT).`);

  const labelParts = [r.name, r.admin1, r.country].filter(Boolean);
  return {
    label: labelParts.join(", "),
    lat: Number(r.latitude),
    lon: Number(r.longitude),
  };
}

async function routeOSRM(points: { lat: number; lon: number }[]) {
  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${coords}`);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

  const json = await res.json();
  const route = json?.routes?.[0]?.geometry;
  if (!route?.coordinates) throw new Error("Brak geometrii trasy.");

  return route.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
}

export default function LeafletMapClient({ tripId }: { tripId: string }) {
  const keyStops = useMemo(() => `wandersplit:stops:${tripId}`, [tripId]);

  const [stops, setStops] = useState<Stop[]>([]);
  const [geo, setGeo] = useState<StopGeo[]>([]);
  const [line, setLine] = useState<[number, number][]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    const raw = localStorage.getItem(keyStops);
    const arr: Stop[] = raw ? JSON.parse(raw) : [];
    setStops(Array.isArray(arr) ? arr : []);
  }, [tripId, keyStops]);

  const center = useMemo<[number, number]>(() => {
    if (geo.length) return [geo[0].lat, geo[0].lon];
    return [41.9028, 12.4964]; // Rome fallback
  }, [geo]);

  async function geocodeAll() {
    if (!stops.length) {
      setMsg("Najpierw dodaj stops w: Trip → Stops.");
      return;
    }
    setMsg(null);
    setLoadingGeo(true);
    setLine([]);

    try {
      const out: StopGeo[] = [];
      for (const s of stops) {
        const loc = await geocode(s);
        out.push({
          id: s.id,
          name: s.name,
          countryCode: s.countryCode,
          label: loc.label,
          lat: loc.lat,
          lon: loc.lon,
        });
      }
      setGeo(out);
      setMsg("OK ✅ Zgeokodowano stops.");
    } catch (e: any) {
      setMsg(e?.message || "Błąd geocoding.");
    } finally {
      setLoadingGeo(false);
    }
  }

  async function buildRoute() {
    if (geo.length < 2) {
      setMsg("Dodaj min. 2 stopy i kliknij najpierw: Geocode stops.");
      return;
    }
    setMsg(null);
    setLoadingRoute(true);

    try {
      const points = geo.map((g) => ({ lat: g.lat, lon: g.lon }));
      const poly = await routeOSRM(points);
      setLine(poly);
      setMsg("OK ✅ Trasa wyznaczona.");
    } catch (e: any) {
      const poly = geo.map((g) => [g.lat, g.lon] as [number, number]);
      setLine(poly);
      setMsg((e?.message ? `${e.message} ` : "") + "Pokazuję prostą linię (fallback).");
    } finally {
      setLoadingRoute(false);
    }
  }

  const btn = "rounded-xl border px-4 py-2 text-sm";
  const btnBlack = "rounded-xl bg-black px-4 py-2 text-sm text-white";

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mapa</h1>
          <p className="mt-1 text-sm text-gray-600">
            Stops → markery → trasa (OSRM). Trip ID: <span className="font-mono">{tripId || "-"}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a className={btn} href={`/trips/${tripId}`}>← Trip</a>
          <a className={btn} href={`/trips/${tripId}/stops`}>Stops</a>
          <a className={btn} href={`/trips/${tripId}/weather`}>Pogoda</a>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={geocodeAll} className={btnBlack} disabled={loadingGeo}>
          {loadingGeo ? "Geocoding..." : "Geocode stops"}
        </button>
        <button onClick={buildRoute} className={btn} disabled={loadingRoute || geo.length < 2}>
          {loadingRoute ? "Wyznaczam..." : "Directions (route)"}
        </button>
        <button onClick={() => setLine([])} className={btn}>
          Wyczyść trasę
        </button>
      </div>

      {msg ? <p className="mt-3 text-sm text-gray-700">{msg}</p> : null}

      <div className="mt-4 overflow-hidden rounded-2xl border">
        <div style={{ height: 520 }}>
          <MapContainer center={center} zoom={6} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geo.map((g) => (
              <Marker key={g.id} position={[g.lat, g.lon]} icon={DefaultIcon}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-gray-600">{g.label}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {line.length >= 2 ? <Polyline positions={line} /> : null}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
