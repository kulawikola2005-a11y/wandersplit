"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import TripHeroPro from "@/components/trip/TripHeroPro";
import { ProButton, ProCard, ProInput, cx } from "@/components/ui/pro";

/* eslint-disable react-hooks/set-state-in-effect */

type Status = "todo" | "doing" | "done";
type Tag = "transport" | "stay" | "todo" | "tickets" | "other";

type Item = {
  id: string;
  text: string;
  status: Status;
  tag: Tag;
  createdAt: string;
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

export default function PlanPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);
  if (!tripId) return null;
  return <PlanInner key={tripId} tripId={tripId} />;
}

function PlanInner({ tripId }: { tripId: string }) {
  const key = useMemo(() => `wandersplit:plan:${tripId}`, [tripId]);

  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"all" | Status>("all");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [tag, setTag] = useState<Tag>("todo");

  useEffect(() => {
    const arr = safeRead<Item[]>(key, []);
    const normalized = Array.isArray(arr) ? arr : [];
    setItems(normalized);
  }, [key]);

  function persist(next: Item[]) {
    setItems(next);
    safeWrite(key, next);
  }

  function resetForm() {
    setEditingId(null);
    setText("");
    setTag("todo");
  }

  function openAdd() {
    resetForm();
    setOpen(true);
  }

  function openEdit(it: Item) {
    setEditingId(it.id);
    setText(it.text);
    setTag(it.tag);
    setOpen(true);
  }

  function addOrSave() {
    const t = text.trim();
    if (!t) return;

    if (editingId) {
      persist(items.map((it) => (it.id === editingId ? { ...it, text: t, tag } : it)));
    } else {
      const next: Item[] = [
        { id: uid(), text: t, status: "todo", tag, createdAt: new Date().toISOString() },
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

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const todo = items.filter((i) => i.status === "todo").length;
    const doing = items.filter((i) => i.status === "doing").length;
    const done = items.filter((i) => i.status === "done").length;
    return { todo, doing, done, total: items.length };
  }, [items]);

  return (
    <div className="min-h-dvh bg-slate-50 pb-28">
      <TripHeroPro tripId={tripId} section="Plan" />

      <div className="px-4 space-y-4">
        {/* Header sekcji */}
        <ProCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900">Plan</div>
              <div className="mt-1 text-sm leading-5 text-slate-600">
                Zadania, bilety, noclegi i rzeczy do ogarnięcia przed wyjazdem.
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {counts.total} razem · {counts.todo} do zrobienia · {counts.doing} w trakcie · {counts.done} zrobione
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ProButton onClick={openAdd}>Dodaj punkt</ProButton>
              <ProButton variant="ghost" onClick={clearAll}>
                Wyczyść
              </ProButton>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={cx(
                "rounded-2xl px-3 py-2 text-xs font-semibold border",
                filter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
              )}
              onClick={() => setFilter("all")}
            >
              Wszystkie
            </button>
            {(["todo", "doing", "done"] as Status[]).map((s) => (
              <button
                key={s}
                className={cx(
                  "rounded-2xl px-3 py-2 text-xs font-semibold border",
                  filter === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                )}
                onClick={() => setFilter(s)}
              >
                {statusLabel(s)}
              </button>
            ))}
          </div>
        </ProCard>

        {/* Lista */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <ProCard className="p-6 text-center">
              <div className="text-base font-extrabold text-slate-900">Brak punktów</div>
              <div className="mt-2 text-sm text-slate-600">
                Dodaj pierwszy punkt i klikaj kółko, żeby zmieniać postęp.
              </div>
              <div className="mt-4">
                <ProButton onClick={openAdd}>Dodaj punkt</ProButton>
              </div>
            </ProCard>
          ) : (
            filtered.map((it) => {
              const p = statusProgress(it.status);
              return (
                <div
                  key={it.id}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    {/* klikany progress */}
                    <button
                      onClick={() => cycle(it.id)}
                      className="mt-0.5 shrink-0 rounded-xl p-1 hover:bg-slate-50"
                      title={`Zmień status (${statusLabel(it.status)})`}
                      aria-label={`Zmień status (${statusLabel(it.status)})`}
                    >
                      <ProgressRing value={p} />
                    </button>

                    {/* treść */}
                    <div className="min-w-0 flex-1">
                      <div
                        className={cx(
                          "text-base font-extrabold leading-6 text-slate-900 break-words",
                          it.status === "done" && "text-slate-500 line-through"
                        )}
                      >
                        {it.text}
                      </div>
                    </div>

                    {/* akcje */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(it)}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        title="Edytuj"
                        aria-label="Edytuj"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => remove(it.id)}
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
            })
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
          <div className="mx-auto w-full max-w-[430px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mt-[22vh] rounded-t-[28px] bg-white p-5 shadow-[0_-20px_80px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">
                  {editingId ? "Edytuj punkt" : "Dodaj punkt"}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                  title="Zamknij"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-3">
                <ProInput
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="np. Rezerwacja hotelu, bilety do muzeum…"
                  autoFocus
                />
              </div>

              {/* tag zostawiamy w formularzu (wewnętrznie), ale bez pokazywania go na liście */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    ["todo", "To-do"],
                    ["transport", "Transport"],
                    ["stay", "Nocleg"],
                    ["tickets", "Bilety"],
                    ["other", "Inne"],
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

              <div className="mt-4">
                <ProButton className="w-full" onClick={addOrSave}>
                  {editingId ? "Zapisz zmiany" : "Dodaj punkt"}
                </ProButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
