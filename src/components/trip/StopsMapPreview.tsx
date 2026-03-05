"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression, LatLngTuple } from "leaflet";
import { useMap } from "react-leaflet";
import { ProCard } from "@/components/ui/pro";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

type Stop = {
  id: string;
  name: string;
  countryCode?: string;
  sort_order: number;
  lat?: number;
  lng?: number;
};

function isNum(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function FitToPoints({ points }: { points: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    if (points.length === 1) {
      map.setView(points[0], 8, { animate: true });
      return;
    }

    map.fitBounds(points, {
      padding: [20, 20],
      animate: true,
    });
  }, [map, points]);

  return null;
}

export default function StopsMapPreview({ stops }: { stops: Stop[] }) {
  const points = useMemo(() => {
    return stops
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .filter((s) => isNum(s.lat) && isNum(s.lng))
      .map((s) => ({
        ...s,
        pos: [s.lat as number, s.lng as number] as LatLngTuple,
      }));
  }, [stops]);

  const center = useMemo<LatLngExpression>(() => {
    if (points.length) return points[0].pos;
    return [52.2297, 21.0122];
  }, [points]);

  const line = useMemo(() => points.map((p) => p.pos), [points]);

  const missingCoords = useMemo(() => {
    return stops.filter((s) => !isNum(s.lat) || !isNum(s.lng)).length;
  }, [stops]);

  return (
    <ProCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-900">Mapa trasy</div>
          <div className="mt-1 text-xs text-slate-500">
            {points.length} punktów na mapie
            {missingCoords > 0 ? ` · ${missingCoords} bez współrzędnych` : ""}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-64 w-full">
          <MapContainer center={center} zoom={points.length ? 5 : 4} scrollWheelZoom className="h-full w-full">
            <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <FitToPoints points={points.map((p) => p.pos)} />

            {line.length >= 2 ? (
              <Polyline positions={line} pathOptions={{ weight: 4, opacity: 0.85 }} />
            ) : null}

            {points.map((p, idx) => (
              <CircleMarker key={p.id} center={p.pos} radius={7} pathOptions={{ weight: 2 }}>
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  {idx + 1}. {p.name}
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {stops.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Dodaj przystanki, a mapa pojawi się automatycznie.
        </div>
      ) : points.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Przystanki istnieją, ale nie mają jeszcze współrzędnych. Spróbuj dodać nowe z krajem (np. Rome + IT), a geocoding uzupełni mapę.
        </div>
      ) : null}
    </ProCard>
  );
}
