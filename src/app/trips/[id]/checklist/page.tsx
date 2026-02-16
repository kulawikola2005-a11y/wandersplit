"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
import TripHeroPro from "@/components/trip/TripHeroPro";
import { ProButton, ProCard, ProInput, cx } from "@/components/ui/pro";

/* eslint-disable react-hooks/set-state-in-effect */

type Item = { id: string; text: string; done: boolean; createdAt: string };

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

export default function ChecklistPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);
  if (!tripId) return null;
  return <Inner key={tripId} tripId={tripId} />;
}

function Inner({ tripId }: { tripId: string }) {
  const key = useMemo(() => `wandersplit:checklist:${tripId}`, [tripId]);

  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const arr = safeRead<Item[]>(key, []);
    setItems(Array.isArray(arr) ? arr : []);
  }, [key]);

  function persist(next: Item[]) {
    setItems(next);
    safeWrite(key, next);
  }

  function add() {
    const t = text.trim();
    if (!t) return;
    persist([{ id: uid(), text: t, done: false, createdAt: new Date().toISOString() }, ...items]);
    setText("");
    setOpen(false);
  }

  function toggle(id: string) {
    persist(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function remove(id: string) {
    persist(items.filter((i) => i.id !== id));
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="pb-2">
      <TripHeroPro tripId={tripId} section="Checklist" />

      <div className="px-4 space-y-4">
        <ProCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Lista rzeczy</div>
              <div className="mt-1 text-xs text-slate-500">{doneCount}/{items.length} zrobione</div>
            </div>
            <ProButton variant="ghost" onClick={() => setOpen(true)}>
              Dodaj
            </ProButton>
          </div>
        </ProCard>

        <div className="space-y-3">
          {items.length === 0 ? (
            <ProCard className="p-6 text-center">
              <div className="text-base font-extrabold text-slate-900">Brak pozycji</div>
              <div className="mt-2 text-sm text-slate-600">Dodaj pierwszą rzecz do checklisty.</div>
              <div className="mt-4">
                <ProButton onClick={() => setOpen(true)}>Dodaj</ProButton>
              </div>
            </ProCard>
          ) : (
            items.map((it) => (
              <ProCard key={it.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => toggle(it.id)}
                    className={cx(
                      "mt-0.5 grid h-9 w-9 place-items-center rounded-2xl border transition",
                      it.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"
                    )}
                    title="Zmień status"
                  >
                    {it.done ? <Check size={18} /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className={cx("text-sm font-extrabold break-words", it.done ? "text-slate-500 line-through" : "text-slate-900")}>
                      {it.text}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(it.createdAt).toLocaleString("pl-PL")}</div>
                  </div>

                  <button
                    onClick={() => remove(it.id)}
                    className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                    title="Usuń"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </ProCard>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[92px] right-5 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_40px_rgba(2,6,23,0.35)] active:scale-[0.98]"
        aria-label="Dodaj"
      >
        <Plus size={22} />
      </button>

      {/* Sheet */}
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="mx-auto w-full max-w-[430px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mt-[24vh] rounded-t-[28px] bg-white p-5 shadow-[0_-20px_80px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">Dodaj do checklisty</div>
                <ProButton variant="ghost" onClick={() => setOpen(false)}>Zamknij</ProButton>
              </div>
              <div className="mt-3">
                <ProInput value={text} onChange={(e) => setText(e.target.value)} placeholder="np. Paszport, ładowarka…" autoFocus />
              </div>
              <div className="mt-4">
                <ProButton className="w-full" onClick={add}>Dodaj</ProButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
