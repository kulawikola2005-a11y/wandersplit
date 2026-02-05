"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Item = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

export default function TripChecklistPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);
  const storageKey = useMemo(() => `wandersplit:checklist:${tripId}`, [tripId]);

  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        setItems(JSON.parse(raw));
        return;
      } catch {}
    }

    setItems([
      { id: uid(), title: "Dokumenty / dowód / paszport", done: false, createdAt: new Date().toISOString() },
      { id: uid(), title: "Ładowarka + powerbank", done: true, createdAt: new Date().toISOString() },
      { id: uid(), title: "Ubezpieczenie podróżne", done: false, createdAt: new Date().toISOString() },
    ]);
  }, [tripId, storageKey]);

  useEffect(() => {
    if (!tripId) return;
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, tripId, storageKey]);

  function add() {
    const t = title.trim();
    if (!t) {
      setMsg("Wpisz nazwę rzeczy.");
      return;
    }
    setMsg(null);
    setItems((prev) => [
      { id: uid(), title: t, done: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setTitle("");
  }

  function toggle(id: string) {
    setMsg(null);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }

  function remove(id: string) {
    setMsg(null);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function clearDone() {
    setMsg(null);
    setItems((prev) => prev.filter((it) => !it.done));
  }

  const tabBase = "rounded-xl border px-4 py-2 text-sm";
  const tabActive = "bg-black text-white";

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Checklist</h1>
          <p className="mt-1 text-sm text-gray-600">
            Trip ID: <span className="font-mono">{tripId || "-"}</span> (lokalnie zapisuje się w przeglądarce)
          </p>
        </div>

        <a className="rounded-xl border px-4 py-2 text-sm" href={`/trips/${tripId}`}>
          ← Wróć do tripa
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a className={tabBase} href={`/trips/${tripId}/plan`}>Plan</a>
        <a className={`${tabBase} ${tabActive}`} href={`/trips/${tripId}/checklist`}>Checklist</a>
        <a className={tabBase} href={`/trips/${tripId}/budget`}>Budżet</a>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="flex gap-2">
          <input
            className="w-full rounded-xl border p-3"
            placeholder="Dodaj rzecz (np. 'kurtka przeciwdeszczowa')"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <button onClick={add} className="rounded-xl bg-black px-4 py-3 text-white">
            Dodaj
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">Kliknij checkbox, żeby zaznaczyć.</p>
          <button onClick={clearDone} className="rounded-xl border px-3 py-2 text-xs">
            Usuń zaznaczone
          </button>
        </div>

        {msg ? <p className="mt-3 text-sm text-gray-700">{msg}</p> : null}
      </div>

      <div className="mt-6 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-gray-600">Brak rzeczy. Dodaj pierwszą 🙂</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={it.done}
                    onChange={() => toggle(it.id)}
                    className="h-5 w-5"
                  />
                  <div>
                    <div className={it.done ? "line-through text-gray-500" : "font-medium"}>
                      {it.title}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Dodano: {new Date(it.createdAt).toLocaleString()}
                    </div>
                  </div>
                </label>

                <button onClick={() => remove(it.id)} className="rounded-xl border px-3 py-2 text-sm">
                  Usuń
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
