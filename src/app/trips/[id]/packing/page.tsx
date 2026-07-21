"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type PackingItem = {
  id: string;
  text: string;
  packed: boolean;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now());
}

export default function PackingPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);
  const key = `wandersplit:packing:${tripId}`;

  const [items, setItems] = useState<PackingItem[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;

      if (Array.isArray(parsed) && parsed.length) {
        setItems(parsed);
      } else {
        setItems([
          { id: "passport", text: "Paszport / dokumenty", packed: false },
          { id: "charger", text: "Ładowarka", packed: false },
          { id: "headphones", text: "Słuchawki", packed: false },
        ]);
      }
    } catch {
      setItems([]);
    }
  }, [key]);

  function save(next: PackingItem[]) {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next));
  }

  function addItem() {
    const value = text.trim();
    if (!value) return;

    save([{ id: uid(), text: value, packed: false }, ...items]);
    setText("");
  }

  function toggleItem(id: string) {
    save(items.map((item) => item.id === id ? { ...item, packed: !item.packed } : item));
  }

  function removeItem(id: string) {
    save(items.filter((item) => item.id !== id));
  }

  const packed = items.filter((item) => item.packed).length;
  const progress = items.length ? Math.round((packed / items.length) * 100) : 0;

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f6f1ff_0%,#fbfaf8_45%,#ffffff_100%)] px-4 pb-28 pt-6">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="rounded-[40px] bg-[linear-gradient(135deg,#1e1b4b_0%,#4c1d95_55%,#7c3aed_100%)] p-6 text-white shadow-[0_30px_80px_rgba(76,29,149,0.32)]">
          <Link href={`/trips/${tripId}`} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
            <ArrowLeft size={16} />
            Wróć
          </Link>

          <div className="mt-7 text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
            Pack before trip
          </div>

          <h1 className="mt-3 text-[38px] font-black tracking-[-0.05em]">
            🎒 Do spakowania
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/72">
            Osobna lista rzeczy do zabrania na wyjazd.
          </p>

          <div className="mt-6 flex items-center justify-between text-sm font-bold">
            <span>{packed}/{items.length} spakowane</span>
            <span>{progress}%</span>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <section className="rounded-[36px] border border-violet-100 bg-white p-5 shadow-[0_20px_60px_rgba(124,58,237,0.10)]">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
              placeholder="Dodaj rzecz do spakowania..."
              className="min-w-0 flex-1 rounded-[24px] border border-violet-100 bg-violet-50/40 px-4 py-4 text-sm font-semibold outline-none"
            />

            <button
              type="button"
              onClick={addItem}
              className="grid h-14 w-14 place-items-center rounded-[24px] bg-slate-950 text-white"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-[28px] border border-violet-100/70 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={
                    item.packed
                      ? "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-sm font-black text-white"
                      : "grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-violet-200 bg-white"
                  }
                >
                  {item.packed ? "✓" : ""}
                </button>

                <div
                  className={
                    item.packed
                      ? "min-w-0 flex-1 truncate text-sm font-bold text-slate-400 line-through"
                      : "min-w-0 flex-1 truncate text-sm font-bold text-slate-800"
                  }
                >
                  {item.text}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-50 text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
