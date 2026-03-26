"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
    if (!value) return;

    try {
      setBusy(true);
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
      await clearDoneChecklistItems(tripId);
      await load();
    } catch (e) {
      console.error(e);
      setMsg("Nie udało się wyczyścić done.");
    } finally {
      setBusy(false);
    }
  }

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    return filter === "done" ? item.done : !item.done;
  });

  return (
    <div className="px-3 pb-10 pt-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Checklist</h1>
          <Link href={`/trips/${tripId}`} className="border px-3 py-2 rounded-xl">
            Powrót
          </Link>
        </div>

        {!editable && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
            Masz dostęp tylko do podglądu. Edycja jest wyłączona dla roli viewer.
          </div>
        )}

        {msg && <div className="text-red-500 text-sm">{msg}</div>}

        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dodaj element checklisty..."
              className="border px-3 py-2 rounded-xl w-full"
              disabled={!editable || busy}
            />
            <button
              onClick={onAdd}
              disabled={!editable || busy}
              className="border px-3 py-2 rounded-xl disabled:opacity-50"
            >
              Dodaj
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setFilter("all")} className="border px-3 py-1 rounded-xl text-sm">Wszystko</button>
            <button onClick={() => setFilter("todo")} className="border px-3 py-1 rounded-xl text-sm">Todo</button>
            <button onClick={() => setFilter("done")} className="border px-3 py-1 rounded-xl text-sm">Done</button>
            <button
              onClick={onClearDone}
              disabled={!editable || busy}
              className="border px-3 py-1 rounded-xl text-sm disabled:opacity-50"
            >
              Wyczyść done
            </button>
          </div>
        </div>

        {loading ? (
          <div>Ładowanie…</div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-500">Brak elementów checklisty.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <div className={item.done ? "line-through text-slate-500" : "font-medium"}>
                    {item.text}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {item.done ? "done" : "todo"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onToggle(item)}
                    disabled={!editable || busy}
                    className="border px-3 py-1 rounded-xl text-sm disabled:opacity-50"
                  >
                    {item.done ? "Cofnij" : "Zaznacz"}
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    disabled={!editable || busy}
                    className="border px-3 py-1 rounded-xl text-sm text-red-600 disabled:opacity-50"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
