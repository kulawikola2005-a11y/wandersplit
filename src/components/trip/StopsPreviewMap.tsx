"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

type StopLike = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
};

type RouteMode = "smart" | "direct" | "mixed";

function FitMapToPoints({
  positions,
}: {
  positions: [number, number][];
}) {
  const map = useMap();
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!positions.length) return;

    const prevCount = prevCountRef.current;
    const newCount = positions.length;
    const lastPoint = positions[positions.length - 1];

    if (newCount === 1) {
      map.flyTo(lastPoint, 7, { duration: 1.2 });
      prevCountRef.current = newCount;
      return;
    }

    if (newCount > prevCount && lastPoint) {
      map.flyTo(lastPoint, 7, { duration: 1.1 });

      const timer = window.setTimeout(() => {
        map.flyToBounds(positions, {
          padding: [30, 30],
          duration: 1.2,
        });
      }, 900);

      prevCountRef.current = newCount;
      return () => window.clearTimeout(timer);
    }

    map.flyToBounds(positions, {
      padding: [30, 30],
      duration: 1.2,
    });

    prevCountRef.current = newCount;
  }, [map, positions]);

  return null;
}

function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;

  const lat1 = a[0];
  const lng1 = a[1];
  const lat2 = b[0];
  const lng2 = b[1];

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const q =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  return R * c;
}

export default function StopsPreviewMap({ items }: { items: StopLike[] }) {
  const [mounted, setMounted] = useState(false);
  const [routeLine, setRouteLine] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeReady, setRouteReady] = useState(false);
  const [drawCount, setDrawCount] = useState(0);
  const [routeMode, setRouteMode] = useState<RouteMode>("direct");

  useEffect(() => {
    setMounted(true);
  }, []);

  const points = useMemo(
    () =>
      items
        .filter((item) => item.lat != null && item.lng != null)
        .map((item) => ({
          id: item.id,
          name: item.name,
          position: [Number(item.lat), Number(item.lng)] as [number, number],
          orsCoord: [Number(item.lng), Number(item.lat)] as [number, number],
        })),
    [items]
  );

  const center = useMemo<[number, number]>(() => {
    if (!points.length) return [52.2297, 21.0122];
    if (points.length === 1) return points[0].position;

    const avgLat =
      points.reduce((sum, point) => sum + point.position[0], 0) / points.length;
    const avgLng =
      points.reduce((sum, point) => sum + point.position[1], 0) / points.length;

    return [avgLat, avgLng];
  }, [points]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      if (points.length < 2) {
        setRouteLine([]);
        setRouteReady(false);
        setDrawCount(0);
        setRouteMode("direct");
        return;
      }

      try {
        setRouteLoading(true);
        setRouteReady(false);
        setDrawCount(0);

        const merged: [number, number][] = [];
        let usedSmart = false;
        let usedDirect = false;

        for (let i = 0; i < points.length - 1; i += 1) {
          const start = points[i];
          const end = points[i + 1];
          const distanceKm = haversineKm(start.position, end.position);

          if (distanceKm > 700) {
            const directSegment: [number, number][] = [start.position, end.position];

            if (merged.length === 0) {
              merged.push(...directSegment);
            } else {
              merged.push(...directSegment.slice(1));
            }

            usedDirect = true;
            continue;
          }

          try {
            const res = await fetch("/api/route", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
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

            if (merged.length === 0) {
              merged.push(...latLngs);
            } else {
              merged.push(...latLngs.slice(1));
            }

            usedSmart = true;
          } catch (segmentError) {
            console.warn("Segment fallback:", segmentError);

            const directSegment: [number, number][] = [start.position, end.position];

            if (merged.length === 0) {
              merged.push(...directSegment);
            } else {
              merged.push(...directSegment.slice(1));
            }

            usedDirect = true;
          }
        }

        if (!cancelled) {
          setRouteLine(merged);

          if (usedSmart && usedDirect) {
            setRouteMode("mixed");
          } else if (usedSmart) {
            setRouteMode("smart");
          } else {
            setRouteMode("direct");
          }

          setRouteReady(true);
        }
      } catch (error) {
        console.warn("Route preview global fallback:", error);
        if (!cancelled) {
          setRouteLine(points.map((point) => point.position));
          setRouteMode("direct");
          setRouteReady(true);
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

  useEffect(() => {
    if (!routeReady) return;
    if (routeLine.length < 2) {
      setDrawCount(routeLine.length);
      return;
    }

    setDrawCount(1);

    let frameId = 0;
    let current = 1;
    const total = routeLine.length;
    const step = total > 180 ? 6 : total > 90 ? 4 : total > 40 ? 2 : 1;

    const tick = () => {
      current = Math.min(current + step, total);
      setDrawCount(current);

      if (current < total) {
        frameId = window.setTimeout(tick, 22) as unknown as number;
      }
    };

    frameId = window.setTimeout(tick, 80) as unknown as number;

    return () => {
      window.clearTimeout(frameId);
    };
  }, [routeLine, routeReady]);

  if (!points.length) {
    return (
      <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div className="text-sm font-semibold text-neutral-900">Mapa trasy</div>
        <p className="mt-2 text-sm text-neutral-500">
          Dodaj przystanki z rozpoznanymi współrzędnymi, aby zobaczyć mapę.
        </p>
      </div>
    );
  }

  const fallbackLine = points.map((point) => point.position);
  const fullVisibleLine = routeLine.length >= 2 ? routeLine : fallbackLine;
  const animatedLine =
    fullVisibleLine.length >= 2
      ? fullVisibleLine.slice(0, Math.max(drawCount, 2))
      : fullVisibleLine;

  const routeLabel = routeLoading
    ? "Loading route…"
    : routeMode === "mixed"
    ? "Mixed route"
    : routeMode === "smart"
    ? "Smart route"
    : "Direct line";

  const routeBadgeText =
    routeMode === "mixed"
      ? "Smart + direct"
      : routeMode === "smart"
      ? "Route calculated"
      : "Fallback line";

  return (
    <section className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="px-4 pb-0 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Mapa trasy</div>
            <p className="mt-1 text-sm text-neutral-500">
              Podgląd przystanków na mapie
            </p>
          </div>

          {points.length >= 2 ? (
            <div className="rounded-2xl border border-neutral-200 bg-[#F8F8F6] px-3 py-2 text-xs font-medium text-neutral-600 shadow-sm">
              {routeLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4 h-72 w-full">
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
              className="h-full w-full"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitMapToPoints positions={fullVisibleLine} />

              {animatedLine.length > 1 ? (
                <Polyline
                  positions={animatedLine}
                  pathOptions={{ color: "#111827", weight: 4, opacity: 0.8 }}
                />
              ) : null}

              {points.map((point, index) => (
                <CircleMarker
                  key={point.id}
                  center={point.position}
                  radius={8}
                  pathOptions={{
                    color: "#111827",
                    fillColor: "#111827",
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                >
                  <Popup>
                    {index + 1}. {point.name}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {routeLoading ? (
              <div className="pointer-events-none absolute inset-x-4 top-4 z-[400]">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-700 shadow-lg backdrop-blur">
                  <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-neutral-900" />
                  <span>Loading route…</span>
                </div>
              </div>
            ) : null}

            {routeReady && fullVisibleLine.length >= 2 ? (
              <div className="pointer-events-none absolute bottom-4 right-4 z-[400] rounded-2xl border border-white/70 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-600 shadow-lg backdrop-blur">
                {routeBadgeText}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
