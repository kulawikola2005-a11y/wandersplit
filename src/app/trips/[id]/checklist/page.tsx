"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import TripHeroPro from "@/components/trip/TripHeroPro";
import { ProButton, ProCard, ProInput, cx } from "@/components/ui/pro";

/* eslint-disable react-hooks/set-state-in-effect */

type Item = {
  id: string;
  text: string;
  done: boolean;
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

  const color = clamped >= 100 ? "#10b981" : "#94a3b8";

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
        {clamped >= 100 ? "✓" : ""}
      </span>
    </div>
  );
}

export default function ChecklistPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);
  if (!tripId) return null;
  return <ChecklistInner key={tripId} tripId={tripId} />;
}

function ChecklistInner({ tripId }: { tripId: string }) {
  const key = useMemo(() => `wandersplit:checklist:${tripId}`, [tripId]);

  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");

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
  }

  function openAdd() {
    resetForm();
    setOpen(true);
  }

  function openEdit(it: Item) {
    setEditingId(it.id);
    setText(it.text);
    setOpen(true);
  }

  function addOrSave() {
    const t = text.trim();
    if (!t) return;

    if (editingId) {
      persist(items.map((it) => (it.id === editingId ? { ...it, text: t } : it)));
    } else {
      persist([
        { id: uid(), text: t, done: false, createdAt: new Date().toISOString() },
        ...items,
      ]);
    }

    setOpen(false);
    resetForm();
  }

  function toggleDone(id: string) {
    persist(items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }

  function remove(id: string) {
    persist(items.filter((it) => it.id !== id));
  }

  function clearDone() {
    persist(items.filter((it) => !it.done));
  }

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "todo") return items.filter((i) => !i.done);
    return items.filter((i) => i.done);
  }, [items, filter]);

  const counts = useMemo(() => {
    const done = items.filter((i) => i.done).length;
    const todo = items.length - done;
    return { total: items.length, todo, done };
  }, [items]);

  const totalProgress = useMemo(() => {
    if (counts.total === 0) return 0;
    return Math.round((counts.done / counts.total) * 100);
  }, [counts]);

  return (
    <div className="min-h-dvh bg-slate-50 pb-28">
      <TripHeroPro tripId={tripId} section="Checklist" />

      <div className="px-4 space-y-4">
        {/* Header sekcji */}
        <ProCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900">Checklist</div>
              <div className="mt-1 text-sm leading-5 text-slate-600">
                Rzeczy do spakowania i przygotowania przed wyjazdem.
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {counts.total} razem · {counts.todo} do zrobienia · {counts.done} zrobione
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ProButton onClick={openAdd}>Dodaj rzecz</ProButton>
            </div>
          </div>

          {/* progress całej checklisty */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Postęp checklisty</span>
              <span className="text-slate-500">{totalProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className={cx(
                "rounded-2xl px-3 py-2 text-xs font-semibold border",
                filter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
              )}
              onClick={() => setFilter("all")}
            >
              Wszystkie
            </button>
            <button
              className={cx(
                "rounded-2xl px-3 py-2 text-xs font-semibold border",
                filter === "todo" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
              )}
              onClick={() => setFilter("todo")}
            >
              Do zrobienia
            </button>
            <button
              className={cx(
                "rounded-2xl px-3 py-2 text-xs font-semibold border",
                filter === "done" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
              )}
              onClick={() => setFilter("done")}
            >
              Zrobione
            </button>

            {counts.done > 0 ? (
              <button
                onClick={clearDone}
                className="ml-auto text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Wyczyść zrobione
              </button>
            ) : null}
          </div>
        </ProCard>

        {/* Lista */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <ProCard className="p-6 text-center">
              <div className="text-base font-extrabold text-slate-900">
                {filter === "done" ? "Brak zrobionych pozycji" : "Brak pozycji"}
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {filter === "done"
                  ? "Zaznaczone rzeczy pojawią się tutaj."
                  : "Dodaj pierwszą rzecz do checklisty."}
              </div>
              {filter !== "done" ? (
                <div className="mt-4">
                  <ProButton onClick={openAdd}>Dodaj rzecz</ProButton>
                </div>
              ) : null}
            </ProCard>
          ) : (
            filtered.map((it) => (
              <div
                key={it.id}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* toggle done */}
                  <button
                    onClick={() => toggleDone(it.id)}
                    className="mt-0.5 shrink-0 rounded-xl p-1 hover:bg-slate-50"
                    title={it.done ? "Oznacz jako niezrobione" : "Oznacz jako zrobione"}
                    aria-label={it.done ? "Oznacz jako niezrobione" : "Oznacz jako zrobione"}
                  >
                    <ProgressRing value={it.done ? 100 : 0} />
                  </button>

                  {/* tekst */}
                  <div className="min-w-0 flex-1">
                    <div
                      className={cx(
                        "text-base font-extrabold leading-6 text-slate-900 break-words",
                        it.done && "text-slate-500 line-through"
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
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-[92px] right-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_40px_rgba(2,6,23,0.35)] active:scale-[0.98]"
        aria-label="Dodaj rzecz"
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
                  {editingId ? "Edytuj rzecz" : "Dodaj rzecz"}
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
                  placeholder="np. Paszport, ładowarka, ubezpieczenie…"
                  autoFocus
                />
              </div>

              <div className="mt-4">
                <ProButton className="w-full" onClick={addOrSave}>
                  {editingId ? "Zapisz zmiany" : "Dodaj rzecz"}
                </ProButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
