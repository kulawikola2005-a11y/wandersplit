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
    <div className="rounded-[30px] border border-black/5 bg-white/80 p-4 backdrop-blur shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight text-neutral-900">{value}</div>
    </div>
  );
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random();
}

function checklistKey(tripId: string) {
  return `wandersplit:checklist:${tripId}`;
}

type StopOption = {
  id: string;
  name: string;
};

function readLocalStops(tripId: string): StopOption[] {
  try {
    const raw = localStorage.getItem(`wandersplit:stops:${tripId}`);
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

function readLocalChecklist(tripId: string): ChecklistItem[] {
  try {
    const raw = localStorage.getItem(checklistKey(tripId));
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];

    return arr.map((item: any) => ({
      id: String(item.id ?? uid()),
      trip_id: tripId,
      user_id: String(item.user_id ?? ""),
      text: String(item.text ?? item.title ?? ""),
      done: Boolean(item.done ?? item.checked ?? item.status === "done"),
      created_at: String(item.created_at ?? item.createdAt ?? new Date().toISOString()),
      stop_id: String(item.stop_id ?? item.stopId ?? ""),
      day: String(item.day ?? item.dayLabel ?? "Day 1"),
    } as ChecklistItem & { stop_id?: string; day?: string })).filter((item) => item.text.trim().length > 0);
  } catch {
    return [];
  }
}

function writeLocalChecklist(tripId: string, items: ChecklistItem[]) {
  localStorage.setItem(checklistKey(tripId), JSON.stringify(items));
}

export default function ChecklistPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [stops, setStops] = useState<StopOption[]>([]);
  const [selectedStopId, setSelectedStopId] = useState("");
  const [selectedDay, setSelectedDay] = useState("Day 1");
  const [stopPickerOpen, setStopPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [myRole, setMyRole] = useState<TripRole>("viewer");
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [msg, setMsg] = useState<string | null>(null);

  // MVP / portfolio mode: local Android app should stay editable.
  const editable = true;

  async function load() {
    setLoading(true);
    try {
      setMyRole("owner");
      setStops(readLocalStops(tripId));
      setItems(readLocalChecklist(tripId));
      setMsg(null);
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
    const value = text.trim();
    if (!value) {
      setMsg("Wpisz element checklisty.");
      return;
    }

    try {
      setBusy(true);
      setMsg(null);

      const next: ChecklistItem[] = [
        {
          id: uid(),
          trip_id: tripId,
          user_id: "",
          text: value,
          done: false,
          created_at: new Date().toISOString(),
          stop_id: selectedStopId,
          day: selectedDay,
        } as ChecklistItem & { stop_id?: string; day?: string },
        ...items,
      ];

      setItems(next);
      writeLocalChecklist(tripId, next);
      setText("");
      setFilter("all");
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się dodać elementu.");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }


  async function onToggle(item: ChecklistItem) {
    try {
      setBusy(true);
      setMsg(null);

      const next = items.map((x) =>
        x.id === item.id ? { ...x, done: !x.done } : x
      );

      setItems(next);
      writeLocalChecklist(tripId, next);
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się zmienić statusu.");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }


  async function onDelete(id: string) {
    try {
      setBusy(true);
      setMsg(null);

      const next = items.filter((item) => item.id !== id);
      setItems(next);
      writeLocalChecklist(tripId, next);
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się usunąć elementu.");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }


  async function onClearDone() {
    try {
      setBusy(true);
      setMsg(null);

      const next = items.filter((item) => !item.done);
      setItems(next);
      writeLocalChecklist(tripId, next);
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się wyczyścić ukończonych.");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }


  const filtered = items.filter((item) => {
    const itemDay = String((item as ChecklistItem & { day?: string }).day || "Day 1");
    if (itemDay !== selectedDay) return false;

    if (filter === "all") return true;
    return filter === "done" ? item.done : !item.done;
  });

  function stopName(stopId?: string) {
    if (!stopId) return "Bez przystanku";
    return stops.find((stop) => stop.id === stopId)?.name || "Przystanek";
  }

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ChecklistItem[]>();

    for (const item of filtered) {
      const stopId = String((item as ChecklistItem & { stop_id?: string }).stop_id || "");
      const key = stopId || "none";
      groups.set(key, [...(groups.get(key) || []), item]);
    }

    const ordered = [
      ...stops.map((stop) => stop.id),
      "none",
    ];

    return ordered
      .map((key) => ({
        key,
        title: key === "none" ? "Bez przystanku" : stopName(key),
        items: groups.get(key) || [],
      }))
      .filter((group) => group.items.length > 0);
  }, [filtered, stops]);

  const visibleDays = useMemo(() => {
    const days = Array.from(
      new Set(items.map((item) => String((item as ChecklistItem & { day?: string }).day || "Day 1")))
    );
    return days.length ? days : ["Day 1", "Day 2", "Day 3"];
  }, [items]);

  const doneCount = items.filter((item) => item.done).length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const todoCount = items.length - doneCount;

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f6f4ff_0%,#f8fafc_22%,#ffffff_100%)] pb-40">
      <div className="px-4 pt-6">
        <div className="mx-auto max-w-xl space-y-7">
          <header className="overflow-hidden rounded-[38px] border border-white/60 bg-white/90 backdrop-blur shadow-[0_30px_80px_rgba(124,58,237,0.14)]">
            <div className="bg-[linear-gradient(135deg,#1e1b4b_0%,#312e81_45%,#7c3aed_100%)] px-6 py-8 text-white">
              <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                <ListChecks size={16} />
                Checklist
              </div>

              <h1 className="mt-3 text-[34px] font-black tracking-[-0.04em] leading-[1.05]">
                Lista przygotowań
              </h1>

              <p className="mt-4 max-w-sm text-[15px] leading-7 text-white/72">
                Spakuj rzeczy, odhacz zadania i trzymaj przygotowania pod kontrolą.
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="-mt-2 grid grid-cols-3 gap-3 px-5 pb-5">
              <div className="rounded-[30px] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Wszystko
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {items.length}
                </div>
              </div>

              <div className="rounded-[30px] bg-[linear-gradient(135deg,#ede9fe_0%,#faf5ff_100%)] p-4">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Gotowe
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {doneCount}
                </div>
              </div>

              <div className="rounded-[30px] bg-[linear-gradient(135deg,#f5f3ff_0%,#eef2ff_100%)] p-4">
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
            <div className="hidden" />
          )}

          {msg && (
            <div className="rounded-[30px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {msg}
            </div>
          )}

          <section className="rounded-[40px] border border-violet-100/60 bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-6 backdrop-blur shadow-[0_30px_80px_rgba(124,58,237,0.10)]">
            <div className="mb-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-500">
                Dni przygotowań
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Wybierz dzień, dla którego chcesz zobaczyć zadania
              </div>
            </div>

            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
              {["Day 1", "Day 2", "Day 3", ...visibleDays.filter((d) => !["Day 1", "Day 2", "Day 3"].includes(d))].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={
                    selectedDay === day
                      ? "min-w-[130px] snap-start rounded-[28px] bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] px-4 py-4 text-left text-white shadow-[0_18px_40px_rgba(124,58,237,0.24)]"
                      : "min-w-[130px] snap-start rounded-[28px] border border-violet-100 bg-white px-4 py-4 text-left text-slate-900 shadow-[0_10px_26px_rgba(15,23,42,0.05)]"
                  }
                >
                  <div className={selectedDay === day ? "text-[10px] font-bold uppercase tracking-[0.16em] text-white/65" : "text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400"}>
                    Dzień
                  </div>
                  <div className="mt-2 text-lg font-black tracking-tight">
                    {day}
                  </div>
                  <div className={selectedDay === day ? "mt-1 text-xs font-semibold text-white/70" : "mt-1 text-xs font-semibold text-slate-400"}>
                    {items.filter((item) => String((item as ChecklistItem & { day?: string }).day || "Day 1") === day).length} zadań
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[40px] border border-violet-100/60 bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-6 backdrop-blur shadow-[0_30px_80px_rgba(124,58,237,0.10)]">
            <div>
              <div className="text-[28px] font-black tracking-tight text-slate-950">
                Co chcesz zaplanować?
              </div>

              <div className="mt-2 text-sm leading-6 text-slate-500">
                Dodaj zadanie do przygotowań podróży.
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Dodaj do dnia
              </label>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {["Day 1", "Day 2", "Day 3"].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={
                      selectedDay === day
                        ? "shrink-0 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"
                        : "shrink-0 rounded-full border border-violet-100 bg-white px-4 py-2.5 text-xs font-bold text-slate-600"
                    }
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Dodaj do miejsca
              </label>

              <button
                type="button"
                onClick={() => setStopPickerOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-black/5 bg-[#f8fafc] px-4 py-3 text-left text-sm font-semibold text-neutral-800 shadow-sm active:scale-[0.99]"
              >
                <span className="truncate">
                  📍 {selectedStopId ? stopName(selectedStopId) : "Bez przystanku"}
                </span>
                <span className="text-neutral-400">Zmień</span>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Np. paszport, ładowarka, rezerwacja hotelu..."
                className="w-full rounded-[30px] border border-violet-100/70 bg-white/90 px-5 py-5 text-[16px] font-semibold text-slate-900 outline-none shadow-[0_10px_30px_rgba(124,58,237,0.06)] placeholder:text-slate-400"
                disabled={!editable || busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAdd();
                }}
              />

              <button
                type="button"
                onClick={onAdd}
                disabled={!editable || busy || !text.trim()}
                className="w-full rounded-[28px] bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_55%,#8b5cf6_100%)] px-5 py-5 text-[15px] font-black tracking-tight text-white shadow-[0_22px_50px_rgba(124,58,237,0.28)] transition active:scale-[0.98]"
              >
                {busy ? "Dodawanie..." : "Dodaj zadanie"}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            <section className="rounded-[40px] border border-violet-100/60 bg-[linear-gradient(180deg,#ffffff_0%,#fcfbff_100%)] p-6 backdrop-blur shadow-[0_30px_80px_rgba(124,58,237,0.10)]">
              <div className="text-[15px] font-bold tracking-tight text-slate-900">
                {selectedDay} — lista przygotowań
              </div>

              <div className="mt-4 space-y-5">
                {groupedItems.map((group) => (
                  <div key={group.key} className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <div className="grid h-8 w-8 place-items-center rounded-2xl bg-slate-100 text-sm">
                        📍
                      </div>
                      <div>
                        <div className="text-sm font-bold text-neutral-900">
                          {group.title}
                        </div>
                        <div className="text-[13px] text-slate-500">
                          {group.items.length} {group.items.length === 1 ? "zadanie" : "zadania"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className={
                            item.done
                              ? "group flex items-center justify-between rounded-[32px] border border-emerald-100 bg-emerald-50/45 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition duration-200"
                              : "group flex items-center justify-between rounded-[32px] border border-black/5 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition duration-200 active:scale-[0.99]"
                          }
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] p-1 text-left">
                            <button
                              type="button"
                              onClick={() => onToggle(item)}
                              disabled={!editable || busy}
                              className={
                                item.done
                                  ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-[0_10px_22px_rgba(16,185,129,0.24)] active:scale-[0.96]"
                                  : "grid h-10 w-10 shrink-0 place-items-center rounded-[24px] border border-violet-100 bg-violet-50/40 text-neutral-400 shadow-sm active:scale-[0.96]"
                              }
                            >
                              {item.done ? <CheckCircle2 size={21} /> : <Circle size={21} />}
                            </button>

                            <div className="min-w-0 space-y-1">
                              <div
                                className={
                                  item.done
                                    ? "truncate text-sm font-semibold text-emerald-900/65 line-through decoration-emerald-700/40"
                                    : "truncate text-[15px] font-bold tracking-tight text-slate-900"
                                }
                              >
                                {item.text}
                              </div>
                              <div className={item.done ? "mt-1 text-xs font-medium text-emerald-700/70" : "mt-1 text-[13px] text-slate-500"}>
                                {item.done ? "Gotowe" : "Kliknij kółko, aby odhaczyć"}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            disabled={!editable || busy}
                            className="ml-3 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 transition active:scale-[0.96] disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>


      {stopPickerOpen && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Zamknij wybór miejsca"
            onClick={() => setStopPickerOpen(false)}
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[34px] bg-[#FCFCFA] p-5 shadow-[0_-20px_60px_rgba(15,23,42,0.22)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300" />

            <div className="mb-4">
              <div className="text-lg font-bold tracking-tight text-neutral-900">
                Wybierz miejsce
              </div>
              <div className="mt-1 text-sm text-neutral-500">
                Zadanie zostanie przypisane do wybranego przystanku.
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedStopId("");
                  setStopPickerOpen(false);
                }}
                className={selectedStopId === "" ? "flex w-full items-center justify-between rounded-[22px] bg-neutral-900 px-4 py-4 text-left text-sm font-semibold text-white" : "flex w-full items-center justify-between rounded-[22px] border border-black/5 bg-white px-4 py-4 text-left text-sm font-semibold text-neutral-800"}
              >
                <span>Bez przystanku</span>
                <span>{selectedStopId === "" ? "✓" : ""}</span>
              </button>

              {stops.map((stop, index) => (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => {
                    setSelectedStopId(stop.id);
                    setStopPickerOpen(false);
                  }}
                  className={selectedStopId === stop.id ? "flex w-full items-center justify-between rounded-[22px] bg-neutral-900 px-4 py-4 text-left text-sm font-semibold text-white" : "flex w-full items-center justify-between rounded-[22px] border border-black/5 bg-white px-4 py-4 text-left text-sm font-semibold text-neutral-800"}
                >
                  <span className="truncate">{index + 1}. {stop.name}</span>
                  <span>{selectedStopId === stop.id ? "✓" : ""}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
