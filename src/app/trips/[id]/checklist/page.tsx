"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Circle, ListChecks, Plus, Trash2 } from "lucide-react";
import { getMyTripRole, canEditTrip, type TripRole } from "@/lib/trips/roles";
import {
  listChecklistItems,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  clearDoneChecklistItems,
  type ChecklistItem,
} from "@/lib/trips/sync";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/80 p-4 backdrop-blur shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight text-neutral-900">{value}</div>
    </div>
  );
}

export default function ChecklistPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [myRole, setMyRole] = useState<TripRole>("viewer");
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [msg, setMsg] = useState<string | null>(null);

  const editable = canEditTrip(myRole);

  async function load() {
    setLoading(true);
    try {
      const [role, rows] = await Promise.all([
        getMyTripRole(tripId),
        listChecklistItems(tripId),
      ]);
      setMyRole(role);
      setItems(rows);
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się wczytać checklisty.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tripId) return;
    load();
  }, [tripId]);

  async function onAdd() {
    if (!editable) return;
    const value = text.trim();
    if (!value) {
      setMsg("Wpisz element checklisty.");
      return;
    }

    try {
      setBusy(true);
      setMsg(null);
      await addChecklistItem(tripId, value);
      setText("");
      await load();
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się dodać elementu.");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(item: ChecklistItem) {
    if (!editable) return;
    try {
      setBusy(true);
      setMsg(null);
      await updateChecklistItem(item.id, { done: !item.done });
      await load();
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się zmienić statusu.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!editable) return;
    try {
      setBusy(true);
      setMsg(null);
      await deleteChecklistItem(id);
      await load();
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się usunąć elementu.");
    } finally {
      setBusy(false);
    }
  }

  async function onClearDone() {
    if (!editable) return;
    try {
      setBusy(true);
      setMsg(null);
      await clearDoneChecklistItems(tripId);
      await load();
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się wyczyścić ukończonych.");
    } finally {
      setBusy(false);
    }
  }

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    return filter === "done" ? item.done : !item.done;
  });

  const doneCount = items.filter((item) => item.done).length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const todoCount = items.length - doneCount;

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] pb-28">
      <div className="px-4 pt-4">
        <div className="mx-auto max-w-xl space-y-5">
          <header className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="bg-[linear-gradient(135deg,#1f2937_0%,#111827_55%,#2f3a4f_100%)] px-5 py-6 text-white">
              <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                <ListChecks size={16} />
                Checklist
              </div>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Lista przygotowań
              </h1>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/75">
                Spakuj rzeczy, odhacz zadania i trzymaj przygotowania pod kontrolą.
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 px-4 py-4">
              <div className="rounded-[24px] bg-[#F8F8F6] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Wszystko
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {items.length}
                </div>
              </div>

              <div className="rounded-[24px] bg-[#EEF2FF] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Gotowe
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {doneCount}
                </div>
              </div>

              <div className="rounded-[24px] bg-[#F4EEE4] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Todo
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {todoCount}
                </div>
              </div>
            </div>
          </header>

          {!editable && (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Masz dostęp tylko do podglądu. Edycja jest wyłączona dla roli viewer.
            </div>
          )}

          {msg && (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {msg}
            </div>
          )}

          <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Plus size={16} />
              Dodaj element
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Np. paszport, ładowarka, rezerwacja hotelu..."
                className="w-full rounded-2xl border border-black/5 bg-[#f8fafc] px-4 py-3 text-sm outline-none transition focus:bg-white"
                disabled={!editable || busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAdd();
                }}
              />
              <button
                onClick={onAdd}
                disabled={!editable || busy}
                className="shrink-0 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              >
                Dodaj
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  filter === "all"
                    ? "bg-neutral-900 text-white"
                    : "border border-black/5 bg-white text-neutral-700"
                }`}
              >
                Wszystko
              </button>
              <button
                onClick={() => setFilter("todo")}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  filter === "todo"
                    ? "bg-neutral-900 text-white"
                    : "border border-black/5 bg-white text-neutral-700"
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setFilter("done")}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  filter === "done"
                    ? "bg-neutral-900 text-white"
                    : "border border-black/5 bg-white text-neutral-700"
                }`}
              >
                Done
              </button>
              <button
                onClick={onClearDone}
                disabled={!editable || busy}
                className="rounded-2xl border border-black/5 bg-white px-3 py-2 text-sm font-medium text-neutral-700 disabled:opacity-50"
              >
                Wyczyść done
              </button>
            </div>
          </section>

          {loading ? (
            <div className="rounded-[28px] border border-black/5 bg-white px-4 py-6 text-center text-sm text-neutral-500 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              Ładowanie…
            </div>
          ) : filtered.length === 0 ? (
            <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="bg-[linear-gradient(135deg,#f4eee4_0%,#f8f8f6_100%)] px-5 py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-neutral-700 shadow-sm">
                  <ListChecks size={22} />
                </div>
                <div className="mt-4 text-base font-semibold text-neutral-900">
                  Brak elementów checklisty
                </div>
                <div className="mt-2 text-sm leading-6 text-neutral-500">
                  Dodaj pierwszy element powyżej i zacznij przygotowania do podróży.
                </div>
              </div>
            </div>
          ) : (
            <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <div className="text-sm font-semibold text-neutral-900">
                Elementy checklisty
              </div>

              <div className="mt-4 space-y-3">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-[24px] border border-black/5 bg-[#fcfcfd] p-3 shadow-sm"
                  >
                    <button
                      onClick={() => onToggle(item)}
                      disabled={!editable || busy}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"
                    >
                      <div className="shrink-0 text-neutral-700">
                        {item.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </div>

                      <div className="min-w-0">
                        <div
                          className={
                            item.done
                              ? "truncate text-sm text-neutral-500 line-through"
                              : "truncate text-sm font-semibold text-neutral-900"
                          }
                        >
                          {item.text}
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {item.done ? "Gotowe" : "Do zrobienia"}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => onDelete(item.id)}
                      disabled={!editable || busy}
                      className="ml-3 shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

    </main>
  );
}
