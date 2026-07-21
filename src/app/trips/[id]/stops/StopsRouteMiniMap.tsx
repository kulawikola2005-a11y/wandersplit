"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

type Stop = {
  id: string;
  name: string;
  countryCode?: string;
  sort_order: number;
  lat?: number;
  lng?: number;
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function fixLeafletIcons() {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

function FitToPoints({ points }: { points: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points as L.LatLngBoundsLiteral);
    map.fitBounds(bounds.pad(0.18), { animate: false });
  }, [map, points]);

  return null;
}

function makeNumberedDivIcon(n: number) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:24px;height:24px;border-radius:999px;
        background:#4f46e5;color:#fff;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:700;
        border:2px solid #e0e7ff;
        box-shadow:0 4px 10px rgba(0,0,0,.15);
      ">${n}</div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function StopsRouteMiniMap({ tripId }: { tripId: string }) {
  const key = useMemo(() => `wandersplit:stops:${tripId}`, [tripId]);
  const [stops, setStops] = useState<Stop[]>([]);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  useEffect(() => {
    const load = () => {
      const arr = safeRead<Stop[]>(key, []);
      const normalized = (Array.isArray(arr) ? arr : [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setStops(normalized);
    };

    load();

    // odświeżaj gdy localStorage zmieni się w innej zakładce
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) load();
    };
    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  const geocodedStops = useMemo(
    () => stops.filter((s) => typeof s.lat === "number" && typeof s.lng === "number"),
    [stops]
  );

  const points = useMemo<LatLngExpression[]>(
    () => geocodedStops.map((s) => [s.lat as number, s.lng as number]),
    [geocodedStops]
  );

  const center: LatLngExpression = useMemo(() => {
    if (geocodedStops.length > 0) {
      return [geocodedStops[0].lat as number, geocodedStops[0].lng as number];
    }
    return [50.8503, 4.3517]; // Brussels fallback
  }, [geocodedStops]);

  return (
    <div className="h-full w-full">
      {geocodedStops.length === 0 ? (
        <div className="grid h-full place-items-center bg-slate-50 text-center">
          <div className="px-4">
            <div className="text-sm font-semibold text-slate-900">Brak punktów na mapie</div>
            <div className="mt-1 text-xs text-slate-500">
              Dodaj współrzędne (lat/lng) w stopach, aby zobaczyć trasę.
            </div>
          </div>
        </div>
      ) : (
        <MapContainer
          center={center}
          zoom={6}
          scrollWheelZoom={false}
          dragging={true}
          doubleClickZoom={true}
          className="h-full w-full"
          ref={(m) => {
            if (m) mapRef.current = m;
          }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {points.length >= 2 ? (
            <Polyline positions={points} pathOptions={{ weight: 4, opacity: 0.85 }} />
          ) : null}

          {geocodedStops.map((s, i) => (
            <Marker
              key={s.id}
              position={[s.lat as number, s.lng as number]}
              icon={makeNumberedDivIcon(i + 1)}
            >
              <Popup>
                <div className="min-w-[140px]">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-slate-500">
                    {s.countryCode || "—"} • stop {i + 1}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          <FitToPoints points={points} />
        </MapContainer>
      )}
    </div>
  );
}