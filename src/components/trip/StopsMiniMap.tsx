"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { LatLngExpression } from "leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

type StopLike = {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  sort_order?: number | null;
};

function isNum(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export default function StopsMiniMap({ stops }: { stops: StopLike[] }) {
  const points = useMemo(() => {
    const withCoords = stops
      .filter((s) => isNum(s.lat) && isNum(s.lng))
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    return withCoords.map((s) => ({ ...s, pos: [s.lat as number, s.lng as number] as LatLngExpression }));
  }, [stops]);

  const center = useMemo<LatLngExpression>(() => {
    if (points.length) return points[0].pos;
    return [52.2297, 21.0122]; // fallback: Warsaw
  }, [points]);

  const line = useMemo(() => points.map((p) => p.pos), [points]);

  // prosta “ramka” mapy
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="h-[220px] w-full">
        <MapContainer
          center={center}
          zoom={points.length ? 6 : 4}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {points.length >= 2 ? <Polyline positions={line} pathOptions={{ weight: 4 }} /> : null}

          {points.map((p, idx) => (
            <CircleMarker
              key={p.id}
              center={p.pos}
              radius={8}
              pathOptions={{ weight: 3 }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false}>
                {idx + 1}. {p.name}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* overlay jak brak koordów */}
      {points.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            Brak współrzędnych stopów — dodaj je w zakładce Map.
          </div>
        </div>
      ) : null}
    </div>
  );
}
