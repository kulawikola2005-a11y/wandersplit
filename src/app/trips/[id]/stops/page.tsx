"use client";

import { motion } from "framer-motion";
import { useScroll, useTransform } from "framer-motion";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, Plus, Trash2, Route, GripVertical, Sparkles } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { geocodeCity } from "@/lib/maps/geocode";
import { getSmartCover } from "@/lib/trips/getSmartCover";

type LocalStop = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  sort_order: number;
};

const StopsPreviewMap = dynamic(
  () => import("@/components/trip/StopsPreviewMap"),
  { ssr: false }
);

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const q =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) *
      Math.cos(toRad(bLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  return R * c;
}

function optimizeStopsNearestNeighbor(stops: LocalStop[]) {
  const withCoords = stops.filter(
    (item) => item.lat != null && item.lng != null
  );
  const withoutCoords = stops.filter(
    (item) => item.lat == null || item.lng == null
  );

  if (withCoords.length <= 2) {
    return stops.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }));
  }

  const remaining = [...withCoords];
  const ordered: LocalStop[] = [];

  const first = remaining.shift();
  if (!first) return stops;

  ordered.push(first);

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const dist = haversineKm(
        current.lat as number,
        current.lng as number,
        candidate.lat as number,
        candidate.lng as number
      );

      if (dist < bestDistance) {
        bestDistance = dist;
        bestIndex = i;
      }
    }

    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }

  return [...ordered, ...withoutCoords].map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }));
}


function stopMood(index: number, total: number) {
  if (index === 0) return "Początek podróży i pierwszy kierunek trasy.";
  if (index === total - 1) return "Ostatni etap wyjazdu i finał podróży.";
  return "Kolejny ważny punkt na Twojej trasie.";
}

function SortableStopItem({
  stop,
  index,
  total,
  busy,
  onRemove,
  onMove,
}: {
  stop: LocalStop;
  index: number;
  total: number;
  busy: boolean;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const image = getSmartCover(stop.name || "travel stop", `${stop.name}-${index}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-[30px] transition-transform duration-300 hover:scale-[1.02] border border-black/5 shadow-[0_25px_60px_rgba(2,6,23,0.12)] ${
        isDragging ? "scale-[1.01] shadow-[0_24px_50px_rgba(2,6,23,0.18)]" : ""
      }`}
    >
      <div
        className="relative min-h-[220px]"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.15)), url('${image}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: isDragging ? "scale(1.02)" : "scale(1.05)",
}}
      >
        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex h-14 w-14 touch-none items-center justify-center rounded-2xl border border-white/20 bg-white/24 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] backdrop-blur cursor-grab active:cursor-grabbing"
            aria-label="Przeciągnij przystanek"
            title="Przeciągnij przystanek"
          >
            <GripVertical size={24} />
          </div>

          <div className="rounded-full bg-white/18 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] backdrop-blur">
            Stop {index + 1}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <div className="rounded-[24px] bg-white/10 p-4 backdrop-blur-2xl border border-white/20 shadow-[0_12px_36px_rgba(0,0,0,0.28)]">
            <div className="text-2xl font-semibold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              {stop.name}
            </div>

            <div className="mt-2 text-sm leading-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]/80">
              {stopMood(index, total)}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0 text-xs text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]/70">
                {stop.lat != null && stop.lng != null
                  ? `${stop.lat}, ${stop.lng}`
                  : "Brak współrzędnych"}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onMove(stop.id, "up")}
                  disabled={busy || index === 0}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/20 text-xs font-black text-white backdrop-blur disabled:opacity-30"
                  aria-label="Przesuń w górę"
                >
                  ↑
                </button>

                <button
                  type="button"
                  onClick={() => onMove(stop.id, "down")}
                  disabled={busy || index === total - 1}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/20 text-xs font-black text-white backdrop-blur disabled:opacity-30"
                  aria-label="Przesuń w dół"
                >
                  ↓
                </button>

                <button
                  onClick={() => onRemove(stop.id)}
                  disabled={busy}
                  className="rounded-full border border-rose-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-rose-500 backdrop-blur-sm transition hover:bg-rose-50 disabled:opacity-50"
                >
                  Usuń
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripStopsPage() {
  const params = useParams();
  const tripId = String(params?.id ?? "");
  const storageKey = useMemo(() => `wandersplit:stops:${tripId}`, [tripId]);

  const [items, setItems] = useState<LocalStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

const [showTitle, setShowTitle] = useState(false);

useEffect(() => {
  const onScroll = () => {
    setShowTitle(window.scrollY > 120);
  };
  window.addEventListener("scroll", onScroll);
  return () => window.removeEventListener("scroll", onScroll);
}, []);


  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 300], [0, 80]);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6,
      },
    })
  );

  const heroImage = getSmartCover(
    items[0]?.name || "travel",
    `${tripId}-hero`
  );

  const stopsWithCoords = useMemo(
    () => items.filter((item) => item.lat != null && item.lng != null).length,
    [items]
  );


  const nextStop = items[0] || null;

  const routeInsights = useMemo(() => {
    const notes: string[] = [];

    if (items.length === 0) {
      notes.push("Dodaj pierwszy przystanek, aby zbudować flow podróży.");
    }

    if (items.length === 1) {
      notes.push("Dodaj kolejny przystanek, żeby zobaczyć przebieg trasy.");
    }

    if (items.length >= 2 && stopsWithCoords < items.length) {
      notes.push("Niektóre miejsca nie mają współrzędnych — mapa może być mniej dokładna.");
    }

    if (items.length >= 3) {
      notes.push("Możesz użyć opcji „Ułóż trasę”, aby poprawić kolejność przystanków.");
    }

    return notes;
  }, [items, stopsWithCoords]);

  function loadLocal() {
    setLoading(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setItems([]);
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((item: any, index: number) => ({
          id: String(item?.id ?? uid()),
          name: String(item?.name ?? "Przystanek"),
          lat: item?.lat == null ? null : Number(item.lat),
          lng: item?.lng == null ? null : Number(item.lng),
          sort_order: Number(item?.sort_order ?? index + 1),
        }));
        setItems(normalized);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się wczytać przystanków.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function saveLocal(next: LocalStop[]) {
    setItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  useEffect(() => {
    if (!tripId) return;
    loadLocal();
  }, [tripId, storageKey]);

  async function addStop() {
    const value = name.trim();
    if (!value) {
      setMsg("Podaj nazwę przystanku.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const geo = await geocodeCity(value).catch(() => null);

      const nextStop: LocalStop = {
        id: uid(),
        name: value,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        sort_order: items.length + 1,
      };

      const next = [...items, nextStop];
      saveLocal(next);
      setName("");
      setSheetOpen(false);
      setMsg("Dodano przystanek.");
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się dodać przystanku.");
    } finally {
      setBusy(false);
    }
  }

  function moveStop(id: string, direction: "up" | "down") {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    saveLocal(next.map((item, i) => ({ ...item, sort_order: i + 1 })));
    setMsg("Zmieniono kolejność przystanków.");
  }

  function removeStop(id: string) {
    setBusy(true);
    setMsg(null);

    try {
      const filtered = items
        .filter((item) => item.id !== id)
        .map((item, index) => ({
          ...item,
          sort_order: index + 1,
        }));

      saveLocal(filtered);
      setMsg("Usunięto przystanek.");
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się usunąć przystanku.");
    } finally {
      setBusy(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }));

    saveLocal(reordered);
    setMsg("Zmieniono kolejność ręcznie.");
  }

  function optimizeRoute() {
    if (items.length < 3) {
      setMsg("Dodaj co najmniej 3 przystanki, aby zoptymalizować trasę.");
      return;
    }

    if (stopsWithCoords < 2) {
      setMsg("Za mało przystanków z mapą, aby policzyć lepszą kolejność.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const optimized = optimizeStopsNearestNeighbor(items);
      saveLocal(optimized);
      setMsg("Ułożono trasę według najbliższych przystanków. Jeśli kolejność się nie zmieniła, obecna trasa była już najlepsza.");
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się zoptymalizować trasy.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.main
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="min-h-dvh bg-[linear-gradient(180deg,#f5f1ff_0%,#f8fafc_35%,#ffffff_100%)] pb-32">
      <div className="px-4 pt-6">
        <div className="mx-auto max-w-xl space-y-7">
          <header className="rounded-[36px] border border-violet-300/20 bg-[linear-gradient(135deg,#6d28d9_0%,#7c3aed_55%,#a855f7_100%)] p-5 text-white shadow-[0_24px_70px_rgba(124,58,237,0.10)] backdrop-blur">
            <div className="text-slate-950">
              <div className="flex items-center gap-2 text-sm font-bold text-white/90">
                <MapPin size={16} />
                Route
              </div>

              <h1 className="mt-3 text-[34px] font-black tracking-[-0.04em] text-white">
                Trasa podróży
              </h1>

              <p className="mt-3 max-w-md text-[15px] font-medium leading-7 text-white/80">
                Dodawaj miejsca, ustawiaj kolejność i sprawdzaj przebieg wyjazdu na mapie.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[24px] bg-white/18 p-4 border border-white/25 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">
                  Przystanki
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {items.length}
                </div>
              </div>

              <div className="rounded-[24px] bg-white/18 p-4 border border-white/25 shadow-sm backdrop-blur">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">
                  Z mapą
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {stopsWithCoords}
                </div>
              </div>
            </div>
          </header>

          <section className="rounded-[32px] border border-violet-100/70 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
              Next stop
            </div>

            <div className="mt-3">
              <div className="min-w-0 w-full">
                <div className="truncate text-[30px] font-black tracking-[-0.04em] text-slate-950">
                  {nextStop ? nextStop.name : "Dodaj miejsce"}
                </div>

                <div className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {items.length > 1
                    ? `${items.length} przystanki w Twojej trasie`
                    : "Zbuduj swoją trasę krok po kroku"}
                </div>
              </div>
            </div>

          </section>

          <section className="relative overflow-hidden rounded-[42px] border border-violet-500/20 bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_55%,#a855f7_100%)] shadow-[0_32px_90px_rgba(124,58,237,0.28)]">
            <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-white/12 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Mapa podróży
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Podgląd przystanków i przebiegu trasy
                </div>
              </div>

              <Link
                href={`/trips/${tripId}/map`}
                className="rounded-full border border-violet-100 bg-white px-4 py-2 text-xs font-black text-violet-700 shadow-[0_12px_28px_rgba(124,58,237,0.16)] active:scale-[0.98]"
              >
                Pełna mapa
              </Link>
            </div>

            <div className="h-[420px] w-full">
              <StopsPreviewMap items={items} />
            </div>
          </section>

          <section className="rounded-[32px] border border-violet-100/70 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Przystanki na trasie
                </div>
              </div>
            </div>

            {msg && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {msg}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Np. Rome, Paris, Tokyo..."
                className="w-full rounded-[26px] border border-violet-100 bg-violet-50/40 px-5 py-4 text-sm font-semibold text-slate-900 outline-none transition focus:bg-white"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addStop();
                }}
              />
              <button
                onClick={addStop}
                disabled={busy}
                className="shrink-0 rounded-[26px] bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] px-5 py-4 text-sm font-black text-white shadow-[0_16px_36px_rgba(124,58,237,0.26)] disabled:opacity-50"
              >
                Dodaj
              </button>
            </div>
          </section>

          {loading ? (
            <div className="rounded-[28px] border border-black/5 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              Ładowanie…
            </div>
          ) : items.length === 0 ? (
            <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="bg-[linear-gradient(135deg,#f4eee4_0%,#f8f8f6_100%)] px-5 py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-neutral-700 shadow-sm">
                  <MapPin size={22} />
                </div>
                <div className="mt-4 text-base font-semibold text-slate-950">
                  Zaplanuj pierwsze miejsce podróży
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-500">
                  Dodaj miasto lub punkt trasy, a ekran zacznie wyglądać jak prawdziwa podróż, a nie tylko lista.
                </div>
              </div>
            </div>
          ) : (
            <section className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {items.map((s, index) => (
                      <SortableStopItem
                        key={s.id}
                        stop={s}
                        index={index}
                        total={items.length}
                        busy={busy}
                        onRemove={removeStop}
                        onMove={moveStop}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}
        </div>
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-28 right-5 z-50 grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white border border-white/20 backdrop-blur shadow-[0_24px_60px_rgba(124,58,237,0.35)] active:scale-[0.96]"
      >
        <Plus size={26} />
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 rounded-t-[32px] bg-[#FCFCFA] p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.16)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300" />

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-950">Dodaj przystanek</h3>
              <p className="mt-1 text-sm text-slate-500">
                Wpisz nazwę miasta lub miejsca
              </p>
            </div>

            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Np. Rome, Paris, Tokyo..."
                className="w-full rounded-[22px] border border-black/5 bg-white px-4 py-4 text-sm outline-none"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addStop();
                }}
              />

              <button
                onClick={addStop}
                disabled={busy}
                className="block w-full rounded-[22px] bg-neutral-900 px-4 py-4 text-center font-semibold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] disabled:opacity-50"
              >
                {busy ? "Dodawanie..." : "📍 Dodaj przystanek"}
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.main>
  );
}
