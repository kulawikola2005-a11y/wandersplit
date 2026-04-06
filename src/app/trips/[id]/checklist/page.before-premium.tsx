"use client";

import Link from "next/link";
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

  return (
    <div className="px-3 pb-10 pt-5">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-4 py-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                  <ListChecks size={16} />
                  Lista rzeczy
                </div>
                <h1 className="mt-1 text-xl font-black">Checklist</h1>
                <p className="mt-1 text-sm text-white/75">
                  Spakuj wszystko i śledź postęp przed wyjazdem.
                </p>
              </div>

              <Link
                href={`/trips/${tripId}`}
                className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
              >
                Powrót
              </Link>
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-500">Postęp</div>
                  <div className="mt-1 text-lg font-black text-slate-900">
                    {doneCount}/{items.length} gotowe
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-900 ring-1 ring-slate-200">
                  {progress}%
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {!editable && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            Masz dostęp tylko do podglądu. Edycja jest wyłączona dla roli viewer.
          </div>
        )}

        {msg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {msg}
          </div>
        )}

        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Plus size={16} />
            Dodaj element
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Np. paszport, ładowarka, rezerwacja hotelu..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-300"
              disabled={!editable || busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd();
              }}
            />
            <button
              onClick={onAdd}
              disabled={!editable || busy}
              className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Dodaj
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              Wszystko
            </button>
            <button
              onClick={() => setFilter("todo")}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              Todo
            </button>
            <button
              onClick={() => setFilter("done")}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              Done
            </button>
            <button
              onClick={onClearDone}
              disabled={!editable || busy}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              Wyczyść done
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
            Ładowanie…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-4 py-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <ListChecks size={20} />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-900">
              Brak elementów checklisty
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Dodaj pierwszy element powyżej.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm"
              >
                <button
                  onClick={() => onToggle(item)}
                  disabled={!editable || busy}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"
                >
                  <div className="shrink-0 text-slate-700">
                    {item.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </div>

                  <div className="min-w-0">
                    <div className={item.done ? "truncate text-sm line-through text-slate-500" : "truncate text-sm font-semibold text-slate-900"}>
                      {item.text}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
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
        )}
      </div>
    </div>
  );
}
