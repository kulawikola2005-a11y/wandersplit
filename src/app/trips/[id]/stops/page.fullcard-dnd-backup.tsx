"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, Plus, Trash2, Route, GripVertical } from "lucide-react";
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
import BottomNav from "@/components/trip/BottomNav";
import { geocodeCity } from "@/lib/maps/geocode";

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

function SortableStopItem({
  stop,
  index,
  busy,
  onRemove,
}: {
  stop: LocalStop;
  index: number;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start justify-between rounded-[24px] border border-black/5 bg-white p-3 ${
        isDragging ? "shadow-[0_18px_40px_rgba(2,6,23,0.12)]" : ""
      }`}
    >
      <div className="flex min-w-0 gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex h-12 w-12 shrink-0 touch-none items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500 active:scale-[0.98]"
          aria-label={`Przeciągnij ${stop.name}`}
        >
          <GripVertical size={18} />
        </button>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-sm font-semibold text-neutral-700">
          {index + 1}
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-neutral-900">
            {stop.name}
          </div>
          {stop.lat != null && stop.lng != null ? (
            <div className="mt-1 text-xs text-neutral-400">
              {stop.lat}, {stop.lng}
            </div>
          ) : (
            <div className="mt-1 text-xs text-neutral-400">
              Brak współrzędnych
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onRemove(stop.id)}
        disabled={busy}
        className="ml-3 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
      >
        <Trash2 size={15} />
      </button>
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    })
  );

  const stopsWithCoords = useMemo(
    () => items.filter((item) => item.lat != null && item.lng != null).length,
    [items]
  );

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
  }

  return (
    <main className="min-h-dvh bg-[#F7F7F3] pb-28">
      <div className="px-4 pt-5">
        <div className="mx-auto max-w-xl space-y-4">
          <section className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="bg-[linear-gradient(135deg,#1f2937_0%,#111827_55%,#2f3a4f_100%)] px-5 py-6 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <Route size={16} />
                    Trasa podróży
                  </div>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                    Przystanki
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    Dodawaj miasta i buduj kolejność wyjazdu.
                  </p>
                </div>

                <Link
                  href={`/trips/${tripId}`}
                  className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur"
                >
                  Powrót
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 py-4">
              <div className="rounded-[24px] bg-[#F8F8F6] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Przystanki
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {items.length}
                </div>
              </div>

              <div className="rounded-[24px] bg-[#F4EEE4] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Z mapą
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {stopsWithCoords}
                </div>
              </div>
            </div>
          </section>

          <StopsPreviewMap items={items} />

          <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Plus size={16} />
              Nowy przystanek
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Np. Rome, Paris, Tokyo..."
                className="w-full rounded-2xl border border-black/5 bg-white px-3 py-3 text-sm outline-none"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addStop();
                }}
              />
              <button
                onClick={addStop}
                disabled={busy}
                className="shrink-0 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Dodaj
              </button>
            </div>

            {msg && (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {msg}
              </div>
            )}
          </section>

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
                  Dodaj miasto lub punkt trasy, a pokażemy go na mapie i zbudujemy wizualny przebieg podróży.
                </div>
              </div>
            </div>
          ) : (
            <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-neutral-900">
                  Lista przystanków
                </div>
                <div className="text-xs text-neutral-400">
                  Przytrzymaj ikonę i przeciągnij
                </div>
              </div>

              <div className="mt-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {items.map((s, index) => (
                        <SortableStopItem
                          key={s.id}
                          stop={s}
                          index={index}
                          busy={busy}
                          onRemove={removeStop}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </section>
          )}
        </div>
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(2,6,23,0.35)] active:scale-[0.96]"
      >
        <Plus size={18} />
        Dodaj
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
                className="block w-full rounded-[22px] bg-neutral-900 px-4 py-4 text-center font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Dodawanie..." : "📍 Dodaj przystanek"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav tripId={tripId} />
    </main>
  );
}
