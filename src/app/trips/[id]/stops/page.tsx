"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Pencil, Plus, Trash2, GripVertical, Map } from "lucide-react";
import TripHeroPro from "@/components/trip/TripHeroPro";
import { ProButton, ProCard, ProInput, cx } from "@/components/ui/pro";

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

/* eslint-disable react-hooks/set-state-in-effect */

const StopsRouteMiniMap = dynamic(() => import("./StopsRouteMiniMap"), { ssr: false });

type Stop = {
  id: string;
  name: string;
  countryCode?: string;
  sort_order: number;
  lat?: number;
  lng?: number;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

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

export default function StopsPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);
  if (!tripId) return null;
  return <Inner key={tripId} tripId={tripId} />;
}

function Inner({ tripId }: { tripId: string }) {
  const key = useMemo(() => `wandersplit:stops:${tripId}`, [tripId]);

  const [stops, setStops] = useState<Stop[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cc, setCc] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  useEffect(() => {
    const arr = safeRead<Stop[]>(key, []);
    const normalized = Array.isArray(arr) ? arr : [];
    normalized.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setStops(normalized);
  }, [key]);

  function persist(next: Stop[]) {
    const normalized = next
      .slice()
      .map((s, i) => ({ ...s, sort_order: i + 1 }));
    setStops(normalized);
    safeWrite(key, normalized);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setCc("");
    setLat("");
    setLng("");
  }

  function openAdd() {
    resetForm();
    setOpen(true);
  }

  function openEdit(stop: Stop) {
    setEditingId(stop.id);
    setName(stop.name ?? "");
    setCc(stop.countryCode ?? "");
    setLat(typeof stop.lat === "number" ? String(stop.lat) : "");
    setLng(typeof stop.lng === "number" ? String(stop.lng) : "");
    setOpen(true);
  }

  function addOrSave() {
    const t = name.trim();
    if (!t) return;

    const parsedLat = lat.trim() === "" ? undefined : Number(lat.replace(",", "."));
    const parsedLng = lng.trim() === "" ? undefined : Number(lng.replace(",", "."));

    const hasLat = typeof parsedLat === "number" && Number.isFinite(parsedLat);
    const hasLng = typeof parsedLng === "number" && Number.isFinite(parsedLng);

    if ((lat.trim() && !hasLat) || (lng.trim() && !hasLng)) return;
    if ((lat.trim() && !lng.trim()) || (!lat.trim() && lng.trim())) return;

    if (editingId) {
      persist(
        stops.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name: t,
                countryCode: cc.trim().toUpperCase() || undefined,
                lat: hasLat ? parsedLat : undefined,
                lng: hasLng ? parsedLng : undefined,
              }
            : s
        )
      );
    } else {
      persist([
        ...stops,
        {
          id: uid(),
          name: t,
          countryCode: cc.trim().toUpperCase() || undefined,
          sort_order: stops.length + 1,
          lat: hasLat ? parsedLat : undefined,
          lng: hasLng ? parsedLng : undefined,
        },
      ]);
    }

    setOpen(false);
    resetForm();
  }

  function removeStop(id: string) {
    persist(stops.filter((s) => s.id !== id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stops.findIndex((s) => s.id === String(active.id));
    const newIndex = stops.findIndex((s) => s.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    persist(arrayMove(stops, oldIndex, newIndex));
  }

  const geocodedCount = stops.filter(
    (s) => typeof s.lat === "number" && typeof s.lng === "number"
  ).length;

  return (
    <div className="pb-28">
      <TripHeroPro tripId={tripId} section="Stops" />

      <div className="px-4 space-y-5">
        {/* Sekcja: Trasa */}
        <ProCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900">Trasa</div>
              <div className="mt-1 text-sm leading-5 text-slate-600">
                Dodaj miejsca i ustaw kolejność. Mapa poniżej połączy przystanki automatycznie.
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {stops.length} {stops.length === 1 ? "przystanek" : "przystanki"} · kolejność listy = kolejność trasy
              </div>
            </div>

            <ProButton onClick={openAdd} className="shrink-0">
              Dodaj stop
            </ProButton>
          </div>
        </ProCard>

        {/* Lista stopów - KOMPAKTOWE ROWS + DRAG */}
        {stops.length === 0 ? (
          <ProCard className="p-6 text-center">
            <div className="text-base font-extrabold text-slate-900">Brak przystanków</div>
            <div className="mt-2 text-sm text-slate-600">
              Dodaj pierwszy stop, np. Rome / Venice / Florence.
            </div>
            <div className="mt-4">
              <ProButton onClick={openAdd}>Dodaj pierwszy stop</ProButton>
            </div>
          </ProCard>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {stops.map((s) => (
                  <SortableStopRow
                    key={s.id}
                    stop={s}
                    onEdit={() => openEdit(s)}
                    onRemove={() => removeStop(s.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Mapa preview */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xl font-black tracking-tight text-slate-900">Mapa trasy</div>
            <div className="mt-1 text-sm text-slate-600">
              Podgląd połączonych przystanków według aktualnej kolejności.
            </div>
          </div>
          <Link
            href={`/trips/${tripId}/map`}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Otwórz większą mapę
          </Link>
        </div>

        <ProCard className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Map size={16} />
              Mapa trasy
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {geocodedCount} punktów na mapie
            </div>
          </div>

          <div className="h-[260px]">
            <StopsRouteMiniMap tripId={tripId} />
          </div>
        </ProCard>
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-[92px] right-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_40px_rgba(2,6,23,0.35)] active:scale-[0.98]"
        aria-label="Dodaj"
      >
        <Plus size={22} />
      </button>

      {/* Sheet / modal add-edit */}
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="mx-auto w-full max-w-[430px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mt-[18vh] rounded-t-[28px] bg-white p-5 shadow-[0_-20px_80px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">
                  {editingId ? "Edytuj stop" : "Dodaj stop"}
                </div>
                <ProButton variant="ghost" onClick={() => setOpen(false)}>
                  Zamknij
                </ProButton>
              </div>

              <div className="mt-3 space-y-3">
                <ProInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Miasto (np. Rome)"
                  autoFocus
                />
                <ProInput
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Kraj (np. IT) opcjonalnie"
                />

                <div className="grid grid-cols-2 gap-2">
                  <ProInput
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="Lat (opcjonalnie)"
                  />
                  <ProInput
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="Lng (opcjonalnie)"
                  />
                </div>

                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Tip: jeśli wpiszesz lat/lng, punkt od razu pokaże się na mapie.
                </div>
              </div>

              <div className="mt-4">
                <ProButton className="w-full" onClick={addOrSave}>
                  {editingId ? "Zapisz zmiany" : "Dodaj stop"}
                </ProButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SortableStopRow({
  stop,
  onEdit,
  onRemove,
}: {
  stop: Stop;
  onEdit: () => void;
  onRemove: () => void;
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

  const hasCoords = typeof stop.lat === "number" && typeof stop.lng === "number";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        "rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm",
        isDragging && "opacity-80 shadow-lg ring-2 ring-indigo-200"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 active:cursor-grabbing"
          title="Przeciągnij, aby zmienić kolejność"
          aria-label="Przeciągnij, aby zmienić kolejność"
        >
          <GripVertical size={16} />
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-extrabold text-slate-900">{stop.name}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {stop.countryCode || "—"} {hasCoords ? "• mapa" : ""}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            title="Edytuj"
            aria-label="Edytuj"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onRemove}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
            title="Usuń"
            aria-label="Usuń"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
