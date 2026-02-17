"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Circle, Clock3, Plus, Trash2, X } from "lucide-react";
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

function statusUi(s: Status) {
  if (s === "todo") return { label: "Do zrobienia", chip: "bg-slate-100 text-slate-700", Icon: Circle };
  if (s === "doing") return { label: "W trakcie", chip: "bg-amber-100 text-amber-800", Icon: Clock3 };
  return { label: "Zrobione", chip: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 };
}

function tagUi(t: Tag) {
  switch (t) {
    case "transport":
      return { label: "Transport" };
    case "stay":
      return { label: "Nocleg" };
    case "tickets":
      return { label: "Bilety" };
    case "todo":
      return { label: "To-do" };
    default:
      return { label: "Inne" };
  }
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

  function add() {
    const t = text.trim();
    if (!t) return;
    const next: Item[] = [
      { id: uid(), text: t, status: "todo", tag, createdAt: new Date().toISOString() },
      ...items,
    ];
    persist(next);
    setText("");
    setTag("todo");
    setOpen(false);
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
        <ProCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Plan</div>
              <div className="mt-1 text-xs text-slate-500">
                {counts.total} · {counts.todo} do zrobienia · {counts.doing} w trakcie · {counts.done} zrobione
              </div>
            </div>
            <ProButton variant="ghost" onClick={clearAll}>
              Wyczyść
            </ProButton>
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
                {statusUi(s).label}
              </button>
            ))}
          </div>
        </ProCard>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <ProCard className="p-6 text-center">
              <div className="text-base font-extrabold text-slate-900">Brak punktów</div>
              <div className="mt-2 text-sm text-slate-600">
                Dodaj pierwszy punkt i klikaj status, żeby go zmieniać.
              </div>
              <div className="mt-4">
                <ProButton onClick={() => setOpen(true)}>Dodaj punkt</ProButton>
              </div>
            </ProCard>
          ) : (
            filtered.map((it) => {
              const st = statusUi(it.status);
              const tg = tagUi(it.tag);
              return (
                <ProCard key={it.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 break-words">{it.text}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {tg.label} · {new Date(it.createdAt).toLocaleString("pl-PL")}
                      </div>
                      <button
                        onClick={() => cycle(it.id)}
                        className={cx("mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold", st.chip)}
                        title="Kliknij, żeby zmienić status"
                      >
                        <st.Icon size={16} /> {st.label}
                      </button>
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
              );
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
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
                <div className="text-sm font-extrabold text-slate-900">Dodaj punkt</div>
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

              <div className="mt-3 flex flex-wrap gap-2">
                {(["todo", "tickets", "transport", "stay", "other"] as Tag[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className={cx(
                      "rounded-2xl px-3 py-2 text-xs font-semibold border",
                      tag === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                    )}
                  >
                    {tagUi(t).label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <ProButton className="flex-1" onClick={add}>
                  Dodaj
                </ProButton>
                <ProButton variant="ghost" onClick={() => setText("Bilety / rezerwacje")}>
                  Podpowiedź
                </ProButton>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Tip: klikaj w status na elemencie, żeby go przełączać.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
