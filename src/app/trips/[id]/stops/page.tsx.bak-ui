"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import TripHeroPro from "@/components/trip/TripHeroPro";
import { ProButton, ProCard, ProInput } from "@/components/ui/pro";

/* eslint-disable react-hooks/set-state-in-effect */

type Stop = { id: string; name: string; countryCode?: string; sort_order: number };

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
  const [name, setName] = useState("");
  const [cc, setCc] = useState("");

  useEffect(() => {
    const arr = safeRead<Stop[]>(key, []);
    const normalized = Array.isArray(arr) ? arr : [];
    normalized.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setStops(normalized);
  }, [key]);

  function persist(next: Stop[]) {
    const normalized = next
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s, i) => ({ ...s, sort_order: i + 1 }));
    setStops(normalized);
    safeWrite(key, normalized);
  }

  function add() {
    const t = name.trim();
    if (!t) return;
    const nextOrder = stops.length + 1;
    persist([{ id: uid(), name: t, countryCode: cc.trim().toUpperCase() || undefined, sort_order: nextOrder }, ...stops]);
    setName("");
    setCc("");
    setOpen(false);
  }

  function remove(id: string) {
    persist(stops.filter((s) => s.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const idx = stops.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= stops.length) return;
    const copy = stops.slice();
    const a = copy[idx];
    const b = copy[j];
    copy[idx] = { ...b };
    copy[j] = { ...a };
    persist(copy);
  }

  return (
    <div className="pb-2">
      <TripHeroPro tripId={tripId} section="Stops" />

      <div className="px-4 space-y-4">
        <ProCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Trasa</div>
              <div className="mt-1 text-xs text-slate-500">{stops.length} punktów</div>
            </div>
            <ProButton variant="ghost" onClick={() => setOpen(true)}>Dodaj</ProButton>
          </div>
        </ProCard>

        <div className="space-y-3">
          {stops.length === 0 ? (
            <ProCard className="p-6 text-center">
              <div className="text-base font-extrabold text-slate-900">Brak stopów</div>
              <div className="mt-2 text-sm text-slate-600">Dodaj np. Rome, Florence.</div>
              <div className="mt-4"><ProButton onClick={() => setOpen(true)}>Dodaj stop</ProButton></div>
            </ProCard>
          ) : (
            stops.map((s, i) => (
              <ProCard key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-500">#{i + 1}</div>
                    <div className="text-sm font-extrabold text-slate-900 break-words">{s.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{s.countryCode ? s.countryCode : "—"}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => move(s.id, -1)}
                      className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                      title="W górę"
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      onClick={() => move(s.id, 1)}
                      className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                      title="W dół"
                    >
                      <ArrowDown size={18} />
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                      title="Usuń"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
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
                <div className="text-sm font-extrabold text-slate-900">Dodaj stop</div>
                <ProButton variant="ghost" onClick={() => setOpen(false)}>Zamknij</ProButton>
              </div>

              <div className="mt-3 space-y-2">
                <ProInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Miasto (np. Rome)" autoFocus />
                <ProInput value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Kraj (np. IT) opcjonalnie" />
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
