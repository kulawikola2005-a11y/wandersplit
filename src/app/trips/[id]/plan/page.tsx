"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, Trash2, X, Pencil, GripVertical } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProButton, ProCard, ProInput, cx } from "@/components/ui/pro";
import { addChecklistItem, listChecklistItems } from "@/lib/trips/sync";
import { getSmartCover } from "@/lib/trips/getSmartCover";

/* eslint-disable react-hooks/set-state-in-effect */

type Status = "todo" | "doing" | "done";
type Tag = "transport" | "stay" | "todo" | "tickets" | "other";

type Item = {
  id: string;
  text: string;
  status: Status;
  tag: Tag;
  day: string;
  createdAt: string;
  stop_id?: string;
};

type StopOption = {
  id: string;
  name: string;
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

function readLocalStops(tripId: string): StopOption[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(`wandersplit:stops:${tripId}`);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];

    return arr
      .map((item: any, index: number) => ({
        id: String(item.id ?? `stop-${index}`),
        name: String(item.name ?? item.city ?? `Przystanek ${index + 1}`),
      }))
      .filter((item) => item.name.trim().length > 0);
  } catch {
    return [];
  }
}

function nextStatus(s: Status): Status {
  if (s === "todo") return "doing";
  if (s === "doing") return "done";
  return "todo";
}

function statusProgress(s: Status) {
  if (s === "todo") return 0;
  if (s === "doing") return 50;
  return 100;
}

function statusLabel(s: Status) {
  if (s === "todo") return "Do zrobienia";
  if (s === "doing") return "W trakcie";
  return "Zrobione";
}


function fakeTravelTime(index: number) {
  const slots = ["08:00", "09:30", "11:00", "13:30", "15:00", "17:30", "20:00"];
  return slots[index % slots.length];
}

function fakeTransport(index: number) {
  const transport = [
    "🚶 12 min spacer",
    "🚆 25 min metro",
    "🚕 10 min taxi",
    "🚌 18 min bus",
    "🚲 14 min ride",
  ];

  return transport[index % transport.length];
}

function ProgressRing({
  value,
  size = 24,
  stroke = 3,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;

  const color =
    clamped >= 100 ? "#10b981" : clamped >= 50 ? "#f59e0b" : "#94a3b8";

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="absolute text-[9px] font-bold text-slate-700">
        {clamped === 0 ? "" : clamped === 50 ? "½" : "✓"}
      </span>

    </div>
  );
}



function normalizeTaskText(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim();
}

function splitPlanIntoDays(planText: string) {
  const text = planText.replace(/\r/g, "").trim();
  const lines = text.split("\n");

  const sections: { dayLabel: string; lines: string[] }[] = [];
  let currentLabel = "Plan";
  let currentLines: string[] = [];

  const isDayHeader = (line: string) => /^\s*day\s*\d+\b/i.test(line.trim());

  for (const raw of lines) {
    const line = raw.trim();

    if (isDayHeader(line)) {
      if (currentLines.length) {
        sections.push({
          dayLabel: currentLabel,
          lines: currentLines,
        });
      }
      currentLabel = line;
      currentLines = [];
    } else if (line) {
      currentLines.push(line);
    }
  }

  if (currentLines.length) {
    sections.push({
      dayLabel: currentLabel,
      lines: currentLines,
    });
  }

  if (!sections.length) {
    return [{ dayLabel: "Plan", lines: lines.filter(Boolean) }];
  }

  return sections;
}

function buildChecklistTasksFromPlan(planText: string) {
  const sections = splitPlanIntoDays(planText);
  const out: string[] = [];
  const seen = new Set<string>();

  function pushTask(task: string) {
    const clean = task.trim();
    if (!clean) return;
    const key = normalizeTaskText(clean);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  }

  for (const section of sections) {
    const joined = section.lines.join(" ").toLowerCase();
    const day = section.dayLabel;

    pushTask(`${day} — sprawdź pogodę`);
    pushTask(`${day} — sprawdź transport i dojazdy`);

    if (/(hotel|hostel|check-in|check in|apartment|stay|accommodation)/i.test(joined)) {
      pushTask(`${day} — potwierdź nocleg / check-in`);
    }

    if (/(train|metro|bus|flight|airport|station|shinkansen|transport)/i.test(joined)) {
      pushTask(`${day} — kup lub sprawdź bilety na transport`);
    }

    if (/(restaurant|food|lunch|dinner|breakfast|cafe|coffee|ramen|sushi)/i.test(joined)) {
      pushTask(`${day} — wybierz miejsce na jedzenie`);
    }

    if (/(museum|temple|park|tower|ticket|tickets|reservation|book|booking)/i.test(joined)) {
      pushTask(`${day} — sprawdź bilety / rezerwacje atrakcji`);
    }

    if (/(shopping|souvenir|market|pharmacy|store)/i.test(joined)) {
      pushTask(`${day} — przygotuj listę zakupów / rzeczy do zabrania`);
    }

    if (section.lines.length) {
      const firstBullet = section.lines
        .map((x) => x.replace(/^[-•]\s*/, "").trim())
        .find(Boolean);

      if (firstBullet) {
        pushTask(`${day} — zapisz: ${firstBullet}`);
      }
    }
  }

  return out;
}

async function addUniqueChecklistTasks(tripId: string, tasks: string[]) {
  const existing = await listChecklistItems(tripId);

  const seen = new Set(
    existing.map((item) => normalizeTaskText(String(item?.text || "")))
  );

  let added = 0;

  for (const task of tasks) {
    const clean = task.trim();
    if (!clean) continue;

    const key = normalizeTaskText(clean);
    if (seen.has(key)) continue;

    try {
      await addChecklistItem(tripId, clean);
      seen.add(key);
      added += 1;
    } catch (e) {
      console.warn("Checklist add error:", clean, e);
    }
  }

  return added;
}




function getTaskEmoji(item: Item) {
  const raw = `${item.tag} ${item.text}`.toLowerCase();

  if (/(train|metro|bus|flight|airport|station|transport|shinkansen)/i.test(raw)) return "✈️";
  if (/(hotel|hostel|stay|check-in|apartment|accommodation|nocleg)/i.test(raw)) return "🏨";
  if (/(food|restaurant|cafe|coffee|ramen|sushi|breakfast|lunch|dinner|jedzenie)/i.test(raw)) return "🍽️";
  if (/(ticket|tickets|reservation|booking|museum|temple|tower|park|bilet)/i.test(raw)) return "🎫";
  if (/(shopping|souvenir|market|pharmacy|store|zakupy)/i.test(raw)) return "🛍️";
  return "📍";
}

function SortablePlanItem({
  item,
  onCycle,
  onEdit,
  onRemove,
  stopName,
}: {
  item: Item;
  onCycle: (id: string) => void;
  onEdit: (item: Item) => void;
  onRemove: (id: string) => void;
  stopName: (stopId?: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const p = statusProgress(item.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        "rounded-[28px] border border-violet-100/70 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-4 py-4 shadow-[0_12px_30px_rgba(139,92,246,0.08)] touch-none",
        isDragging && "scale-[1.02] opacity-90 shadow-[0_24px_50px_rgba(15,23,42,0.16)]",
        "hover:scale-[1.01]"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          className="mt-0.5 shrink-0 rounded-2xl bg-[#f5f7fb] p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: "none" }}
          title="Przeciągnij"
          aria-label="Przeciągnij"
        >
          <GripVertical size={18} />
        </button>

        <button
          onClick={() => onCycle(item.id)}
          className="mt-0.5 shrink-0 rounded-2xl bg-[#f8fafc] p-2 hover:bg-slate-50"
          title={`Zmień status (${statusLabel(item.status)})`}
          aria-label={`Zmień status (${statusLabel(item.status)})`}
        >
          <ProgressRing value={p} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {item.day || "Day 1"} · {statusLabel(item.status)}
          </div>

          <div
            className={cx(
              "text-[15px] font-bold leading-6 text-slate-950 break-words",
              item.status === "done" && "text-slate-400 line-through"
            )}
          >
            {item.text}
          </div>

          <div className="mt-2 text-[12px] font-semibold text-violet-500">
            📍 {stopName(item.stop_id)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(item)}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            title="Edytuj"
            aria-label="Edytuj"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
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

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);
  if (!tripId) return null;
  return <PlanInner key={tripId} tripId={tripId} />;
}

function PlanInner({ tripId }: { tripId: string }) {
  const key = useMemo(() => `wandersplit:plan:${tripId}`, [tripId]);

  const [items, setItems] = useState<Item[]>([]);
  const [stops, setStops] = useState<StopOption[]>([]);
  const [selectedStopId, setSelectedStopId] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [tag, setTag] = useState<Tag>("todo");
  const [day, setDay] = useState("Day 1");
  const [dayFilter, setDayFilter] = useState<string>("Day 1");

  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [aiChecklistAdded, setAiChecklistAdded] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
      },
    })
  );

  useEffect(() => {
    const arr = safeRead<Item[]>(key, []);
    const normalized = (Array.isArray(arr) ? arr : []).map((item) => ({
      ...item,
      day: item?.day || "Day 1",
      stop_id: item?.stop_id || "",
    }));

    setStops(readLocalStops(tripId));
    setItems(normalized);
  }, [key, tripId]);

  function persist(next: Item[]) {
    setItems(next);
    safeWrite(key, next);
  }

  function resetForm() {
    setEditingId(null);
    setText("");
    setTag("todo");
    setDay("Day 1");
    setSelectedStopId("");
  }

  function openAdd() {
    resetForm();
    setOpen(true);
  }

  function openEdit(it: Item) {
    setEditingId(it.id);
    setText(it.text);
    setTag(it.tag);
    setDay(it.day || "Day 1");
    setSelectedStopId(it.stop_id || "");
    setOpen(true);
  }

  function addOrSave() {
    const t = text.trim();
    if (!t) return;

    if (editingId) {
      persist(items.map((it) => (it.id === editingId ? { ...it, text: t, tag, day, stop_id: selectedStopId } : it)));
    } else {
      const next: Item[] = [
        { id: uid(), text: t, status: "todo", tag, day, stop_id: selectedStopId, createdAt: new Date().toISOString() },
        ...items,
      ];
      persist(next);
    }

    setOpen(false);
    resetForm();
  }

  function cycle(id: string) {
    persist(items.map((it) => (it.id === id ? { ...it, status: nextStatus(it.status) } : it)));
  }

  function remove(id: string) {
    persist(items.filter((it) => it.id !== id));
  }

  function clearAll() {
    persist([]);
  }

  function reorderItemsInDay(dayName: string, activeId: string, overId: string) {
    const dayItems = items.filter((item) => (item.day || "Day 1") === dayName);
    const oldIndex = dayItems.findIndex((item) => item.id === activeId);
    const newIndex = dayItems.findIndex((item) => item.id === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reorderedDayItems = arrayMove(dayItems, oldIndex, newIndex);
    const otherItems = items.filter((item) => (item.day || "Day 1") !== dayName);

    persist([...otherItems, ...reorderedDayItems]);
  }

  function handleDragEnd(dayName: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderItemsInDay(dayName, String(active.id), String(over.id));
  }

  function stopName(stopId?: string) {
    if (!stopId) return "Bez miejsca";
    return stops.find((stop) => stop.id === stopId)?.name || "Miejsce";
  }

  async function convertPlanToChecklist() {
    try {
      setAiMsg(null);
      setAiChecklistAdded(null);

      if (!items.length) {
        setAiMsg("Najpierw dodaj coś do planu.");
        return;
      }

      const planText = items.map((i) => i.text).join("\n");
      const tasks = buildChecklistTasksFromPlan(planText);

      const added = await addUniqueChecklistTasks(tripId, tasks);

      setAiChecklistAdded(added);
      setAiMsg(`Zamieniono plan na checklistę (${added} elementów).`);
    } catch (e: any) {
      console.error(e);
      setAiMsg("Nie udało się zamienić planu na checklistę.");
    }
  }

  async function generateAiPlanAndChecklist() {
    try {
      setAiBusy(true);
      setAiMsg(null);
      setAiChecklistAdded(null);

      const stopsKey = `wandersplit:stops:${tripId}`;
      const stopsRaw = safeRead<any[]>(stopsKey, []);
      const stopNames = Array.isArray(stopsRaw)
        ? stopsRaw
            .map((s) => s?.name || s?.title || s?.city || s?.label)
            .filter(Boolean)
        : [];

      if (!stopNames.length) {
        setAiMsg("Najpierw dodaj przystanki do tripa, żeby AI mogło zbudować plan.");
        return;
      }

      const budgetValue =
        (document.getElementById("budget") as HTMLInputElement | null)?.value?.trim() || "";
      const styleValue =
        (document.getElementById("style") as HTMLInputElement | null)?.value?.trim() || "";

      const res = await fetch("/api/ai-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stops: stopNames,
          days: stopNames.length,
          brief: {
            budget: budgetValue || "not provided",
            style: styleValue || "not provided",
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Nie udało się wygenerować planu AI.");
      }

      const planText = String(data?.plan || "").trim();

      if (!planText) {
        throw new Error("AI nie zwróciło planu.");
      }

      const dayTasks = buildChecklistTasksFromPlan(planText);

      const added = await addUniqueChecklistTasks(tripId, dayTasks);

      let currentDay = "Day 1";
      const newPlanItems: Item[] = planText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const cleanLine = line.replace(/^[-•]\s*/, "");
          const lower = cleanLine.toLowerCase();

          if (/^day\s+\d+/i.test(cleanLine)) {
            currentDay = cleanLine;
          }

          let detectedTag: Tag = "other";
          if (/(train|metro|bus|flight|airport|station|transport)/i.test(lower)) detectedTag = "transport";
          else if (/(hotel|hostel|stay|check-in|apartment|accommodation)/i.test(lower)) detectedTag = "stay";
          else if (/(ticket|tickets|reservation|booking|museum|temple|tower|park)/i.test(lower)) detectedTag = "tickets";
          else if (/(todo|walk|visit|see|explore|food|restaurant|cafe|shopping)/i.test(lower)) detectedTag = "todo";

          return {
            id: uid(),
            text: cleanLine,
            status: "todo" as Status,
            tag: detectedTag,
            day: currentDay,
            createdAt: new Date().toISOString(),
          };
        });

      persist(newPlanItems);
      setAiChecklistAdded(added);
      setAiMsg(`AI wygenerowało plan i dodało ${added} elementów do checklisty.`);
    } catch (e: any) {
      console.error(e);
      setAiMsg(e?.message || "Nie udało się wygenerować planu AI.");
    } finally {
      setAiBusy(false);
    }
  }

  const visibleDays = useMemo(() => {
    const days = Array.from(new Set(items.map((i) => i.day || "Day 1")));
    return days.length ? days : ["Day 1"];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const statusOk = filter === "all" ? true : i.status === filter;
      const dayOk = dayFilter === "all" ? true : (i.day || "Day 1") === dayFilter;
      return statusOk && dayOk;
    });
  }, [items, filter, dayFilter]);

  const counts = useMemo(() => {
    const todo = items.filter((i) => i.status === "todo").length;
    const doing = items.filter((i) => i.status === "doing").length;
    const done = items.filter((i) => i.status === "done").length;
    return { todo, doing, done, total: items.length };
  }, [items]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, Item[]>();

    for (const item of filtered) {
      const dayKey = item.day || "Day 1";
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(item);
    }

    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] pb-28">
      <div className="mx-auto max-w-xl px-4 pt-7 space-y-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-black tracking-[-0.04em] text-slate-950">
              Plan podróży
            </h1>
            <p className="mt-2 text-[15px] font-medium leading-6 text-slate-500">
              Zaplanuj każdy dzień swojej podróży
            </p>
          </div>

          <button
            type="button"
            className="grid h-14 w-14 place-items-center rounded-[22px] border border-violet-100 bg-white text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
          >
            ⚙️
          </button>
        </header>

        <section className="-mx-1">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
            {visibleDays.map((d, index) => (
              <button
                key={d}
                type="button"
                onClick={() => setDayFilter(d)}
                className={cx(
                  "relative min-w-[285px] snap-start overflow-hidden rounded-[32px] border p-5 text-left transition active:scale-[0.98]",
                  dayFilter === d
                    ? "border-violet-300 bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] text-white shadow-[0_22px_55px_rgba(124,58,237,0.32)]"
                    : "border-violet-100 bg-white text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
                )}
              >
                <div
                  className="absolute right-4 top-4 h-24 w-24 rounded-[28px] bg-cover bg-center opacity-90"
                  style={{
                    backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.18), rgba(15,23,42,0.02)), url('${getSmartCover(d, `${tripId}-${d}`)}')`,
                  }}
                />

                <div className="relative max-w-[150px]">
                  <div className={dayFilter === d ? "text-[11px] font-bold uppercase tracking-[0.16em] text-white/70" : "text-[11px] font-bold uppercase tracking-[0.16em] text-violet-500"}>
                    Dzień {index + 1}
                  </div>
                  <div className="mt-3 text-[30px] font-black tracking-[-0.03em]">
                    {d}
                  </div>
                  <div className={dayFilter === d ? "mt-2 text-sm font-semibold text-white/75" : "mt-2 text-sm font-semibold text-slate-500"}>
                    {items.filter((item) => (item.day || "Day 1") === d).length} punktów
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-1 flex justify-center gap-2">
            {visibleDays.map((d) => (
              <span
                key={d}
                className={cx(
                  "h-2 w-2 rounded-full",
                  dayFilter === d ? "bg-violet-600" : "bg-slate-300"
                )}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-violet-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div>
            <h2 className="text-[22px] font-black tracking-tight text-slate-950">
              Narzędzia planu
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Dodawaj punkty, porządkuj plan i zamieniaj go w checklistę.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <button
              onClick={openAdd}
              className="rounded-[22px] bg-slate-950 px-4 py-4 text-sm font-bold text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
            >
              ＋ Dodaj punkt
            </button>

            <button
              onClick={convertPlanToChecklist}
              className="rounded-[22px] border border-violet-100 bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm"
            >
              ☷ Do checklisty
            </button>

            <button
              onClick={clearAll}
              className="rounded-[22px] border border-violet-100 bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm"
            >
              🗑 Wyczyść
            </button>
          </div>

          {(aiMsg || aiChecklistAdded !== null) && (
            <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">
              {aiMsg}
            </div>
          )}
        </section>

        <section className="rounded-[32px] border border-violet-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h2 className="text-[22px] font-black tracking-tight text-slate-950">
            Status punktów
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className={cx(
                "rounded-[22px] px-4 py-4 text-sm font-bold",
                filter === "all" ? "bg-slate-950 text-white" : "border border-violet-100 bg-white text-slate-700"
              )}
              onClick={() => setFilter("all")}
            >
              Wszystkie
            </button>

            {(["todo", "doing", "done"] as Status[]).map((s) => (
              <button
                key={s}
                className={cx(
                  "rounded-[22px] px-4 py-4 text-sm font-bold",
                  filter === s ? "bg-slate-950 text-white" : "border border-violet-100 bg-white text-slate-700"
                )}
                onClick={() => setFilter(s)}
              >
                {statusLabel(s)}
              </button>
            ))}
          </div>
        </section>

        {/* Lista */}

        <div className="space-y-5">
          {filtered.length === 0 ? (
            <ProCard className="p-6 text-center rounded-[28px] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="text-3xl">🌍</div>

              <div className="mt-3 text-lg font-semibold text-white">
                Zacznij planować swoją podróż
              </div>

              <div className="mt-2 text-sm text-slate-500 leading-6">
                Dodaj pierwszy punkt i zacznij budować swój plan dzień po dniu.
              </div>

              <div className="mt-5">
                <button
                  onClick={openAdd}
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                >
                  Dodaj pierwszy punkt
                </button>
              </div>
            </ProCard>
          ) : (
            groupedItems.map(([dayName, dayItems]) => (
              <div
  key={dayName}
  className="
    space-y-4
    overflow-hidden
    rounded-[34px]
    border border-violet-100/70
    bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ff_100%)]
    p-4
    shadow-[0_24px_60px_rgba(124,58,237,0.10)]
    backdrop-blur-xl
  "
>
                <div
  className="
    overflow-hidden
    rounded-[30px]
    bg-[linear-gradient(135deg,#2e1065_0%,#4c1d95_45%,#7c3aed_100%)]
    px-5
    py-5
    text-white
    shadow-[0_18px_50px_rgba(124,58,237,0.28)]
  "
>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                    Dzień planu
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[34px] font-black tracking-tight text-white">
                    <span>{dayName}</span>
                    <span className="text-sm font-semibold text-white/70">
                      · {dayItems.length} {dayItems.length === 1 ? "punkt" : "punkty"}
                    </span>
                  </div>
                  <div className="mt-3 max-w-[240px] text-sm leading-6 text-white/75">
                    Ułóż przebieg dnia i zachowaj kolejność najważniejszych punktów.
                  </div>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(dayName, event)}
                >
                  <SortableContext
                    items={dayItems.filter((it) => !/^day\s+\d+/i.test(it.text)).map((it) => it.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="relative mt-5 space-y-4 pl-7">
                      <div className="absolute bottom-4 left-[13px] top-2 w-px bg-gradient-to-b from-violet-300 via-slate-200 to-transparent" />

                      {dayItems.map((it, index) => {
                        const isDayHeader = /^day\s+\d+/i.test(it.text);

                        if (isDayHeader) {
                          return null;
                        }

                        return (
                          <div key={it.id} className="relative">
                            <div className="absolute -left-7 top-5 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-violet-600 text-[11px] font-extrabold text-white shadow-[0_8px_22px_rgba(124,58,237,0.28)]">
                              {index + 1}
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-3 pl-1">
                                <div className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold tracking-wide text-violet-700">
                                  {fakeTravelTime(index)}
                                </div>

                                {index > 0 ? (
                                  <div className="text-[11px] font-semibold text-slate-400">
                                    {fakeTransport(index)}
                                  </div>
                                ) : (
                                  <div className="text-[11px] font-semibold text-violet-400">
                                    Start dnia
                                  </div>
                                )}
                              </div>

                              <SortablePlanItem
                                item={it}
                                onCycle={cycle}
                                onEdit={openEdit}
                                onRemove={remove}
                                stopName={stopName}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-[92px] right-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_40px_rgba(2,6,23,0.35)] active:scale-[0.98]"
        aria-label="Dodaj punkt"
      >
        <Plus size={22} />
      </button>

      {/* Bottom sheet */}
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="max-h-[88vh] overflow-y-auto rounded-t-[34px] bg-[#FCFCFA] p-5 pb-2 shadow-[0_-24px_80px_rgba(15,23,42,0.28)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-extrabold tracking-tight text-slate-900">
                    {editingId ? "Edytuj punkt" : "Dodaj do planu"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Połącz zadanie z miejscem, dniem i typem aktywności.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addOrSave}
                    disabled={!text.trim()}
                    className="rounded-2xl bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_12px_26px_rgba(124,58,237,0.25)] disabled:opacity-40"
                  >
                    Dodaj
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                    title="Zamknij"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
                  Co planujesz?
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="np. Zarezerwować hotel, kupić bilety, sprawdzić dojazd…"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  spellCheck={false}
                  className="min-h-[96px] w-full resize-none rounded-[26px] border border-slate-200 bg-white px-4 py-4 text-[15px] font-semibold leading-6 text-slate-900 outline-none shadow-sm placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                />

                <button
                  type="button"
                  onClick={addOrSave}
                  disabled={!text.trim()}
                  className="mt-3 w-full rounded-[24px] bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] px-5 py-4 text-sm font-extrabold text-white shadow-[0_18px_40px_rgba(124,58,237,0.28)] disabled:opacity-40 active:scale-[0.98]"
                >
                  {editingId ? "Zapisz zmiany" : "Dodaj do planu"}
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Miejsce
                </div>

                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStopId("")}
                    className={selectedStopId === "" ? "shrink-0 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm" : "shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600"}
                  >
                    📍 Bez miejsca
                  </button>

                  {stops.map((stop, index) => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => setSelectedStopId(stop.id)}
                      className={selectedStopId === stop.id ? "shrink-0 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm" : "shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600"}
                    >
                      {index + 1}. {stop.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Dzień
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"].map((value) => (
                    <button
                      key={value}
                      onClick={() => setDay(value)}
                      className={cx(
                        "rounded-2xl border px-3 py-2 text-sm font-semibold",
                        day === value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              {/* tag zostawiamy w formularzu (wewnętrznie), ale bez pokazywania go na liście */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    ["todo", "✅ To-do"],
                    ["transport", "🚆 Transport"],
                    ["stay", "🏨 Nocleg"],
                    ["tickets", "🎟️ Bilety"],
                    ["other", "✨ Inne"],
                  ] as [Tag, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setTag(value)}
                    className={cx(
                      "rounded-2xl border px-3 py-2 text-sm font-semibold",
                      tag === value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="sticky bottom-0 z-20 -mx-5 mt-5 border-t border-slate-100 bg-[#FCFCFA]/95 px-5 pb-2 pt-3 backdrop-blur">
                <button
                  type="button"
                  onClick={addOrSave}
                  disabled={!text.trim()}
                  className="flex w-full items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] px-5 py-4 text-sm font-extrabold text-white shadow-[0_18px_40px_rgba(124,58,237,0.28)] disabled:opacity-40 active:scale-[0.98]"
                >
                  {editingId ? "Zapisz zmiany" : "Dodaj do planu"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
