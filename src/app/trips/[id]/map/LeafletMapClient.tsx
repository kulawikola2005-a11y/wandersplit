"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
import { LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { readStopsFromDB, deleteStopFromDB, type TripStop } from "@/lib/trips/db";

type Stop = {
  id: string;
  name: string;
  countryCode?: string;
  sort_order: number;
  lat?: number;
  lng?: number;
};

type Props = {
  tripId: string;
};

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function mapDbStopToStop(s: TripStop): Stop {
  return {
    id: s.id,
    name: s.name,
    countryCode: s.country_code ?? undefined,
    sort_order: s.sort_order,
    lat: typeof s.lat === "number" ? s.lat : undefined,
    lng: typeof s.lng === "number" ? s.lng : undefined,
  };
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

function FitBoundsButton({
  points,
  trigger,
}: {
  points: LatLngExpression[];
  trigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points as L.LatLngBoundsLiteral);
    map.fitBounds(bounds.pad(0.18), { animate: true });
  }, [map, trigger, points]);

  return null;
}

function FocusStop({ stop }: { stop: Stop | null }) {
  const map = useMap();

  useEffect(() => {
    if (!stop || typeof stop.lat !== "number" || typeof stop.lng !== "number") return;
    map.flyTo([stop.lat, stop.lng], Math.max(map.getZoom(), 11), {
      animate: true,
      duration: 0.8,
    });
  }, [map, stop]);

  return null;
}

function makeNumberedDivIcon(n: number, active = false) {
  const bg = active ? "#4f46e5" : "#111827";
  const ring = active ? "#c7d2fe" : "#e5e7eb";
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:28px;height:28px;border-radius:999px;
        background:${bg}; color:white;
        display:flex; align-items:center; justify-content:center;
        font-size:12px; font-weight:700;
        border:2px solid ${ring};
        box-shadow:0 6px 16px rgba(0,0,0,.20);
      ">${n}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function LeafletMapClient({ tripId }: Props) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fitTick, setFitTick] = useState(0);
  const [focusStop, setFocusStop] = useState<Stop | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<LeafletMap | null>(null);

  async function refreshStops() {
    setLoading(true);
    const arr = await readStopsFromDB(tripId);
    const normalized = (Array.isArray(arr) ? arr : [])
      .map(mapDbStopToStop)
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setStops(normalized);
    setLoading(false);
  }

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  useEffect(() => {
    refreshStops();
  }, [tripId]);

  async function removeStop(id: string) {
    try {
      await deleteStopFromDB(id);
      setStops((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      console.error(e);
    }
  }

  const geocodedStops = useMemo(
    () => stops.filter((s) => typeof s.lat === "number" && typeof s.lng === "number"),
    [stops]
  );

  const points = useMemo<LatLngExpression[]>(
    () => geocodedStops.map((s) => [s.lat as number, s.lng as number]),
    [geocodedStops]
  );

  const filteredStops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stops;
    return stops.filter((s) =>
      `${s.name} ${s.countryCode ?? ""}`.toLowerCase().includes(q)
    );
  }, [stops, query]);

  const selectedStop = useMemo(
    () => stops.find((s) => s.id === selectedId) ?? null,
    [stops, selectedId]
  );

  const center: LatLngExpression = useMemo(() => {
    if (geocodedStops.length) return [geocodedStops[0].lat as number, geocodedStops[0].lng as number];
    return [50.8503, 4.3517];
  }, [geocodedStops]);

  function focusOnStop(s: Stop) {
    setSelectedId(s.id);
    setFocusStop(s);
  }

  function fitRoute() {
    setFitTick((x) => x + 1);
  }

  function goToMyLocation() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.flyTo([latitude, longitude], 13, {
          animate: true,
          duration: 0.8,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  return (
    <div className="relative min-h-dvh bg-slate-100 pb-0">
      <div className="absolute inset-0">
        <MapContainer
          center={center}
          zoom={6}
          scrollWheelZoom
          className="h-full w-full"
          ref={(m) => {
            if (m) {
              mapRef.current = m;
              if (!mapReady) setMapReady(true);
            }
          }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {points.length >= 2 ? (
            <Polyline positions={points} pathOptions={{ weight: 4, opacity: 0.8 }} />
          ) : null}

          {stops.map((s, i) => {
            const hasCoords = typeof s.lat === "number" && typeof s.lng === "number";
            if (!hasCoords) return null;

            return (
              <Marker
                key={s.id}
                position={[s.lat as number, s.lng as number]}
                icon={makeNumberedDivIcon(i + 1, selectedId === s.id)}
                eventHandlers={{
                  click: () => focusOnStop(s),
                }}
              >
                <Popup>
                  <div className="font-semibold">{s.name}</div>
                </Popup>
              </Marker>
            );
          })}

          {mapReady && points.length ? <FitBoundsButton points={points} trigger={fitTick} /> : null}
          {mapReady ? <FocusStop stop={focusStop} /> : null}
        </MapContainer>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/90 p-3 shadow-lg backdrop-blur">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              WanderSplit
            </div>
            <div className="text-lg font-bold text-slate-900">Mapa tripa</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fitRoute}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Dopasuj trasę
            </button>

            <button
              onClick={goToMyLocation}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              <LocateFixed className="h-4 w-4" />
            </button>

            <Link
              href={`/trips/${tripId}`}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Powrót
            </Link>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] p-4">
        <div
          className={cx(
            "pointer-events-auto mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_-12px_40px_rgba(15,23,42,.16)] backdrop-blur transition-all",
            sheetOpen ? "max-h-[48vh]" : "max-h-16"
          )}
        >
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
            <button
              onClick={() => setSheetOpen((v) => !v)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {sheetOpen ? "Zwiń" : "Rozwiń"}
            </button>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj przystanku"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="max-h-[38vh] overflow-auto p-3">
            {loading ? (
              <div className="p-3 text-sm text-slate-500">Ładowanie…</div>
            ) : filteredStops.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">Brak przystanków.</div>
            ) : (
              <div className="space-y-2">
                {filteredStops.map((s, i) => {
                  const hasCoords = typeof s.lat === "number" && typeof s.lng === "number";
                  return (
                    <div
                      key={s.id}
                      className={cx(
                        "flex items-center justify-between gap-3 rounded-2xl border p-3",
                        selectedId === s.id
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <button
                        onClick={() => focusOnStop(s)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="font-semibold text-slate-900">{i + 1}. {s.name}</div>
                        <div className="text-xs text-slate-500">
                          {hasCoords ? "Ma współrzędne" : "Brak współrzędnych — nie pokaże się na mapie"}
                        </div>
                      </button>

                      <button
                        onClick={() => removeStop(s.id)}
                        className="rounded-xl border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
                      >
                        Usuń
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}