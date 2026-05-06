"use client";

import { useEffect, useMemo, useState } from "react";
import type { LatLngExpression } from "leaflet";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Polyline,
  useMap,
} from "react-leaflet";

type StopLike = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
};

function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    const timer = window.setTimeout(() => {
      try {
        if (points.length === 1) {
          map.setView(points[0], 7, { animate: true });
          return;
        }

        map.fitBounds(points, {
          padding: [24, 24],
          animate: true,
        });
      } catch (error) {
        console.warn("FitToPoints warning:", error);
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [map, points]);

  return null;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);

  const q =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a[0])) *
      Math.cos(toRad(b[0])) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  return R * c;
}

type RouteMode = "smart" | "direct" | "mixed";

export default function StopsPreviewMap({ items }: { items: StopLike[] }) {
  const [mounted, setMounted] = useState(false);
  const [routeLine, setRouteLine] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeMode, setRouteMode] = useState<RouteMode>("direct");

  useEffect(() => {
    setMounted(true);
  }, []);

  const points = useMemo(() => {
    return items
      .filter((item) => item.lat != null && item.lng != null)
      .map((item) => ({
        id: item.id,
        name: item.name,
        position: [Number(item.lat), Number(item.lng)] as [number, number],
        orsCoord: [Number(item.lng), Number(item.lat)] as [number, number],
      }));
  }, [items]);

  const center = useMemo<LatLngExpression>(() => {
    if (!points.length) return [52.2297, 21.0122];
    return points[0].position;
  }, [points]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      if (points.length < 2) {
        setRouteLine(points.map((point) => [point.position[0], point.position[1]] as [number, number]));
        setRouteMode("direct");
        return;
      }

      try {
        setRouteLoading(true);

        const merged: [number, number][] = [];
        let usedSmart = false;
        let usedDirect = false;

        for (let i = 0; i < points.length - 1; i += 1) {
          const start = points[i];
          const end = points[i + 1];
          const distanceKm = haversineKm(start.position, end.position);

          if (distanceKm > 700) {
            const directSegment: [number, number][] = [start.position, end.position];

            if (merged.length === 0) merged.push(...directSegment);
            else merged.push(...directSegment.slice(1));

            usedDirect = true;
            continue;
          }

          try {
            const res = await fetch("/api/route", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                profile: "driving-car",
                coordinates: [start.orsCoord, end.orsCoord],
              }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok || !data) {
              throw new Error("Nie udało się pobrać segmentu");
            }

            const coords = data?.features?.[0]?.geometry?.coordinates;

            if (!Array.isArray(coords)) {
              throw new Error("Brak geometrii segmentu");
            }

            const latLngs = coords
              .filter(
                (coord: unknown) =>
                  Array.isArray(coord) &&
                  coord.length === 2 &&
                  Number.isFinite(coord[0]) &&
                  Number.isFinite(coord[1])
              )
              .map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

            if (!latLngs.length) {
              throw new Error("Pusty segment");
            }

            if (merged.length === 0) merged.push(...latLngs);
            else merged.push(...latLngs.slice(1));

            usedSmart = true;
          } catch (segmentError) {
            console.warn("Segment fallback:", segmentError);

            const directSegment: [number, number][] = [start.position, end.position];

            if (merged.length === 0) merged.push(...directSegment);
            else merged.push(...directSegment.slice(1));

            usedDirect = true;
          }
        }

        if (!cancelled) {
          setRouteLine(merged);

          if (usedSmart && usedDirect) setRouteMode("mixed");
          else if (usedSmart) setRouteMode("smart");
          else setRouteMode("direct");
        }
      } catch (error) {
        console.warn("Route preview global fallback:", error);
        if (!cancelled) {
          setRouteLine(points.map((point) => [point.position[0], point.position[1]] as [number, number]));
          setRouteMode("direct");
        }
      } finally {
        if (!cancelled) {
          setRouteLoading(false);
        }
      }
    }

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [points]);

  if (!points.length) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-neutral-500">
        Dodaj przystanki z współrzędnymi, aby zobaczyć mapę.
      </div>
    );
  }

  const line = routeLine.length >= 2 ? routeLine : points.map((point) => point.position);

  const routeLabel =
    routeLoading
      ? "Loading route…"
      : routeMode === "mixed"
      ? "Smart + direct"
      : routeMode === "smart"
      ? "Route calculated"
      : "Direct line";

  return (
    <div className="relative h-full w-full">
      {!mounted ? (
        <div className="flex h-full items-center justify-center text-sm text-neutral-500">
          Ładowanie mapy…
        </div>
      ) : (
        <>
          <MapContainer
            key={points.map((p) => p.id).join("-")}
            center={center}
            zoom={5}
            scrollWheelZoom={false}
            attributionControl={false}
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains={["a", "b", "c", "d"]}
            />

            <FitToPoints points={points.map((p) => p.position)} />

            {line.length >= 2 ? (
              <Polyline positions={line} pathOptions={{ weight: 4, opacity: 0.85 }} />
            ) : null}

            {points.map((point, index) => (
              <CircleMarker key={point.id} center={point.position} radius={7} pathOptions={{ weight: 2 }}>
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  {index + 1}. {point.name}
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>

          <div className="pointer-events-none absolute bottom-4 right-4 z-[400] rounded-full border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-600 shadow-lg backdrop-blur">
            {routeLabel}
          </div>
        </>
      )}
    </div>
  );
}
