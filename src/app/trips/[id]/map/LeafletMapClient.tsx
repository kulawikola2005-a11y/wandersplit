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
import {
  LocateFixed,
  Plus,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Navigation,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

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

function safeWrite(key: string, value: unknown) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

// Fix domyślnych ikonek Leaflet
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

function FocusStop({
  stop,
}: {
  stop: Stop | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!stop || typeof stop.lat !== "number" || typeof stop.lng !== "number") return;
    map.flyTo([stop.lat, stop.lng], Math.max(map.getZoom(), 11), { animate: true, duration: 0.8 });
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
  const keyStops = useMemo(() => `wandersplit:stops:${tripId}`, [tripId]);

  const [stops, setStops] = useState<Stop[]>([]);
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fitTick, setFitTick] = useState(0);
  const [focusStop, setFocusStop] = useState<Stop | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  useEffect(() => {
    const arr = safeRead<Stop[]>(keyStops, []);
    const normalized = (Array.isArray(arr) ? arr : [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setStops(normalized);
  }, [keyStops]);

  function persist(next: Stop[]) {
    const normalized = next
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((s, i) => ({ ...s, sort_order: i + 1 }));
    setStops(normalized);
    safeWrite(keyStops, normalized);
  }

  function removeStop(id: string) {
    persist(stops.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function moveStop(id: string, dir: -1 | 1) {
    const idx = stops.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= stops.length) return;

    const copy = stops.slice();
    const a = copy[idx];
    const b = copy[j];
    copy[idx] = { ...b };
    copy[j] = { ...a };
    persist(copy);
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
    if (geocodedStops.length) {
      return [geocodedStops[0].lat as number, geocodedStops[0].lng as number];
    }
    return [50.8503, 4.3517]; // Brussels fallback
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
        mapRef.current?.flyTo([latitude, longitude], 13, { animate: true, duration: 0.8 });
      },
      () => {
        // cicho ignorujemy błąd uprawnień
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  return (
    <div className="relative min-h-dvh bg-slate-100 pb-0">
      {/* mapa jako tło ekranu */}
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

            const active = selectedId === s.id;
            return (
              <Marker
                key={s.id}
                position={[s.lat as number, s.lng as number]}
                icon={makeNumberedDivIcon(i + 1, active)}
                eventHandlers={{
                  click: () => setSelectedId(s.id),
                }}
              >
                <Popup>
                  <div className="min-w-[160px]">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-slate-500">
                      {s.countryCode || "—"} • stop #{i + 1}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {points.length > 0 ? <FitBoundsButton points={points} trigger={fitTick} /> : null}
          <FocusStop stop={focusStop} />
        </MapContainer>
      </div>

      {/* gradient dla czytelności top bara */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] h-28 bg-gradient-to-b from-black/25 to-transparent" />

      {/* Top bar (Google Maps-like) */}
      <div className="absolute inset-x-0 top-0 z-[600] px-4 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="rounded-2xl bg-white/95 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/5 backdrop-blur">
          <div className="flex items-center gap-2">
            <Link
              href={`/trips/${tripId}`}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
              aria-label="Wróć do tripa"
              title="Wróć"
            >
              <X size={18} />
            </Link>

            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj przystanku…"
                className="h-10 w-full rounded-xl bg-slate-100 pl-9 pr-9 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:bg-white"
              />
              {query ? (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-200"
                  aria-label="Wyczyść"
                  title="Wyczyść"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <Link
              href={`/trips/${tripId}/stops`}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
              aria-label="Dodaj / edytuj stopy"
              title="Stopy"
            >
              <Plus size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Floating buttons */}
      <div className="absolute right-4 top-24 z-[650] flex flex-col gap-2">
        <button
          onClick={goToMyLocation}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white/95 text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.14)] ring-1 ring-black/5 backdrop-blur hover:bg-white"
          title="Moja lokalizacja"
          aria-label="Moja lokalizacja"
        >
          <LocateFixed size={18} />
        </button>

        <button
          onClick={fitRoute}
          disabled={!points.length}
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl bg-white/95 text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.14)] ring-1 ring-black/5 backdrop-blur hover:bg-white",
            !points.length && "opacity-50"
          )}
          title="Dopasuj trasę"
          aria-label="Dopasuj trasę"
        >
          <Navigation size={18} />
        </button>
      </div>

      {/* Bottom sheet */}
      <div
        className={cx(
          "absolute inset-x-0 bottom-0 z-[700] mx-auto w-full max-w-[430px] transition-transform duration-300",
          sheetOpen ? "translate-y-0" : "translate-y-[calc(100%-56px)]"
        )}
      >
        <div className="rounded-t-[28px] bg-white/96 shadow-[0_-16px_50px_rgba(0,0,0,0.20)] ring-1 ring-black/5 backdrop-blur">
          {/* handle + header */}
          <div className="px-4 pt-3">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Trasa</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {stops.length} stopów • {geocodedStops.length} z lokalizacją
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={fitRoute}
                  disabled={!points.length}
                  className={cx(
                    "rounded-xl px-3 py-2 text-xs font-semibold ring-1",
                    points.length
                      ? "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                      : "bg-slate-100 text-slate-400 ring-slate-200"
                  )}
                >
                  Dopasuj
                </button>

                <button
                  onClick={() => setSheetOpen((v) => !v)}
                  className="grid h-9 w-9 place-items-center rounded-xl text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  aria-label={sheetOpen ? "Zwiń panel" : "Rozwiń panel"}
                  title={sheetOpen ? "Zwiń panel" : "Rozwiń panel"}
                >
                  {sheetOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* quick summary route preview */}
          <div className="mt-3 px-4">
            <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <div className="text-xs text-slate-500">Podgląd trasy</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                {stops.length === 0
                  ? "Dodaj przystanki w zakładce Stops"
                  : stops
                      .slice(0, 3)
                      .map((s) => s.name)
                      .join(" → ") + (stops.length > 3 ? ` +${stops.length - 3}` : "")}
              </div>
            </div>
          </div>

          {/* list */}
          <div className="mt-3 max-h-[46dvh] overflow-y-auto px-4 pb-[max(14px,env(safe-area-inset-bottom))]">
            {filteredStops.length === 0 ? (
              <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-600 ring-1 ring-slate-200">
                {stops.length === 0
                  ? "Brak przystanków. Dodaj je w Stops."
                  : "Brak wyników wyszukiwania."}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStops.map((s) => {
                  const idx = stops.findIndex((x) => x.id === s.id);
                  const active = selectedId === s.id;
                  const hasCoords = typeof s.lat === "number" && typeof s.lng === "number";

                  return (
                    <div
                      key={s.id}
                      className={cx(
                        "rounded-2xl px-3 py-3 ring-1 transition",
                        active
                          ? "bg-indigo-50/70 ring-indigo-200"
                          : "bg-white/90 ring-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => focusOnStop(s)}
                          disabled={!hasCoords}
                          className={cx(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ring-1",
                            active
                              ? "bg-indigo-600 text-white ring-indigo-600"
                              : "bg-slate-900 text-white ring-slate-900",
                            !hasCoords && "opacity-40"
                          )}
                          title={hasCoords ? "Pokaż na mapie" : "Brak współrzędnych"}
                          aria-label={hasCoords ? "Pokaż na mapie" : "Brak współrzędnych"}
                        >
                          {idx + 1}
                        </button>

                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => focusOnStop(s)}
                            disabled={!hasCoords}
                            className="block text-left w-full"
                          >
                            <div className="truncate text-sm font-extrabold text-slate-900">
                              {s.name}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                              {s.countryCode || "—"} {hasCoords ? "• gotowe na mapie" : "• brak geocode"}
                            </div>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveStop(s.id, -1)}
                            className="grid h-8 w-8 place-items-center rounded-xl text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                            title="Przesuń wyżej"
                            aria-label="Przesuń wyżej"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveStop(s.id, 1)}
                            className="grid h-8 w-8 place-items-center rounded-xl text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                            title="Przesuń niżej"
                            aria-label="Przesuń niżej"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            onClick={() => removeStop(s.id)}
                            className="grid h-8 w-8 place-items-center rounded-xl text-slate-600 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200"
                            title="Usuń"
                            aria-label="Usuń"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-1">
                  <Link
                    href={`/trips/${tripId}/stops`}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Plus size={16} />
                    Dodaj / edytuj przystanki
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gdy brak mapy / punktów — mikrohint */}
      {mapReady && stops.length > 0 && geocodedStops.length === 0 ? (
        <div className="absolute inset-x-4 bottom-[calc(56px+env(safe-area-inset-bottom)+14px)] z-[650] mx-auto max-w-[390px] rounded-2xl bg-amber-50/95 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200 backdrop-blur">
          Przystanki są dodane, ale nie mają współrzędnych. Wejdź w Stops i dodaj miejsca z geokodowaniem.
        </div>
      ) : null}
    </div>
  );
}
