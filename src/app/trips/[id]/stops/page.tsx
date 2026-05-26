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
}: {
  stop: LocalStop;
  index: number;
  total: number;
  busy: boolean;
  onRemove: (id: string) => void;
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

              <button
                onClick={() => onRemove(stop.id)}
                disabled={busy}
                className="shrink-0 rounded-2xl border border-white/20 bg-rose-400/15 px-3 py-2 text-sm font-medium text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
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
      setMsg("✨ Zoptymalizowano kolejność przystanków.");
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
          <header className="rounded-[36px] border border-violet-100/60 bg-white/90 p-5 shadow-[0_24px_70px_rgba(124,58,237,0.10)] backdrop-blur">
            <div className="text-slate-950">
              <div className="flex items-center gap-2 text-sm font-bold text-violet-600">
                <MapPin size={16} />
                Route
              </div>

              <h1 className="mt-3 text-[34px] font-black tracking-[-0.04em]">
                Trasa podróży
              </h1>

              <p className="mt-3 max-w-md text-[15px] font-medium leading-7 text-slate-500">
                Dodawaj miejsca, ustawiaj kolejność i sprawdzaj przebieg wyjazdu na mapie.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[24px] bg-[#F8F8F6] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Przystanki
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {items.length}
                </div>
              </div>

              <div className="rounded-[24px] bg-[#EEF2FF] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Z mapą
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {stopsWithCoords}
                </div>
              </div>
            </div>
          </header>

          <section className="rounded-[38px] border border-violet-100/70 bg-white/95 p-5 shadow-[0_24px_70px_rgba(124,58,237,0.12)] backdrop-blur">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
              Next stop
            </div>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-[32px] font-black tracking-[-0.04em] text-slate-950">
                  {nextStop ? nextStop.name : "Dodaj miejsce"}
                </div>

                <div className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {items.length > 1
                    ? `${items.length} przystanków w Twojej trasie`
                    : "Zbuduj swoją trasę krok po kroku"}
                </div>
              </div>

              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[22px] bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] text-white shadow-[0_16px_38px_rgba(124,58,237,0.28)]">
                <Route size={24} />
              </div>
            </div>

            {routeInsights.length > 0 && (
              <div className="mt-5 space-y-2">
                {routeInsights.slice(0, 2).map((note) => (
                  <div
                    key={note}
                    className="rounded-[24px] bg-violet-50 px-4 py-3 text-sm font-semibold leading-6 text-violet-800"
                  >
                    ✨ {note}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="relative overflow-hidden rounded-[42px] border border-white/70 bg-white shadow-[0_32px_90px_rgba(124,58,237,0.16)]">
            <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-white/85 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div>
                <div className="text-sm font-semibold text-neutral-900">
                  Mapa podróży
                </div>
                <div className="mt-1 text-sm text-neutral-500">
                  Podgląd przystanków i przebiegu trasy
                </div>
              </div>

              <div className="rounded-full bg-violet-600 px-4 py-2 text-xs font-black text-white shadow-[0_12px_28px_rgba(124,58,237,0.24)]">
                Pełna mapa
              </div>
            </div>

            <div className="h-[420px] w-full">
              <StopsPreviewMap items={items} />
            </div>
          </section>

          <section className="rounded-[38px] border border-violet-100/70 bg-white/95 p-5 shadow-[0_24px_70px_rgba(124,58,237,0.10)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-neutral-900">
                  Przystanki na trasie
                </div>
                <div className="text-xs text-neutral-400">
                  Przytrzymaj ikonę i przeciągnij, aby zmienić kolejność
                </div>
              </div>

              <button
                onClick={optimizeRoute}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] shadow-sm disabled:opacity-50"
              >
                <Sparkles size={14} />
                Ułóż trasę
              </button>
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

          {items.length >= 2 && (
            <section className="rounded-[38px] border border-violet-100/70 bg-white/95 p-5 shadow-[0_24px_70px_rgba(124,58,237,0.10)]">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-500">
                    Journey flow
                  </div>
                  <h2 className="mt-2 text-[24px] font-black tracking-tight text-slate-950">
                    Kolejność podróży
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={optimizeRoute}
                  disabled={busy}
                  className="rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
                >
                  Ułóż
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {items.map((stop, index) => (
                  <div key={stop.id} className="relative pl-10">
                    {index < items.length - 1 && (
                      <div className="absolute left-[15px] top-9 h-[calc(100%+16px)] w-[2px] bg-gradient-to-b from-violet-300 to-transparent" />
                    )}

                    <div className="absolute left-0 top-1 grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,#4c1d95_0%,#8b5cf6_100%)] text-xs font-black text-white shadow-[0_12px_28px_rgba(124,58,237,0.28)]">
                      {index + 1}
                    </div>

                    <div className="rounded-[28px] border border-violet-100/70 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                      <div className="text-[16px] font-black tracking-tight text-slate-950">
                        {stop.name}
                      </div>

                      <div className="mt-2 text-sm font-medium text-slate-500">
                        {index === 0
                          ? "Start podróży"
                          : index === items.length - 1
                          ? "Finał trasy"
                          : "Kolejny etap wyjazdu"}
                      </div>

                      {index < items.length - 1 && (
                        <div className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                          Dalej: {items[index + 1].name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {loading ? (
            <div className="rounded-[28px] border border-black/5 bg-white px-4 py-6 text-center text-sm text-neutral-500 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              Ładowanie…
            </div>
          ) : items.length === 0 ? (
            <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="bg-[linear-gradient(135deg,#f4eee4_0%,#f8f8f6_100%)] px-5 py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-neutral-700 shadow-sm">
                  <MapPin size={22} />
                </div>
                <div className="mt-4 text-base font-semibold text-neutral-900">
                  Zaplanuj pierwsze miejsce podróży
                </div>
                <div className="mt-2 text-sm leading-6 text-neutral-500">
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
        className="fixed bottom-28 right-5 z-50 grid h-16 w-16 place-items-center rounded-full bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] text-white shadow-[0_24px_60px_rgba(124,58,237,0.35)] active:scale-[0.96]"
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
              <h3 className="text-lg font-semibold text-neutral-900">Dodaj przystanek</h3>
              <p className="mt-1 text-sm text-neutral-500">
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
