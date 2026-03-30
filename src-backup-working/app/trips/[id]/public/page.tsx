"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

function readLS(key: string) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PublicLinkPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  async function create() {
    setMsg(null);
    setLoading(true);
    try {
      if (!tripId) throw new Error("Brak tripId");

      // Snapshot z localStorage (dopasowane do naszych kluczy z MVP)
      const snapshot = {
        tripId,
        createdAt: new Date().toISOString(),
        plan: readLS(`wandersplit:plan:${tripId}`) ?? [],
        checklist: readLS(`wandersplit:checklist:${tripId}`) ?? [],
        stops: readLS(`wandersplit:stops:${tripId}`) ?? [],
        budget: readLS(`wandersplit:budget:${tripId}`) ?? [],
      };

      const r = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });

      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);

      setToken(String(json.token));
    } catch (e: any) {
      setMsg(e?.message ?? "Błąd");
    } finally {
      setLoading(false);
    }
  }

  const link = token ? `${origin}/share/${token}` : "";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Skopiowano ✅");
    } catch {
      alert("Nie mogę skopiować — skopiuj ręcznie.");
    }
  }

  const btn = "rounded-xl border px-4 py-2 text-sm";
  const btnBlack = "rounded-xl bg-black px-4 py-2 text-sm text-white";

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Public link</h1>
          <p className="mt-1 text-sm text-gray-600">
            Trip ID: <span className="font-mono">{tripId}</span>
          </p>
        </div>
        <a className={btn} href={`/trips/${tripId}`}>← Trip</a>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <button className={btnBlack} onClick={create} disabled={loading}>
          {loading ? "Create…" : "Create"}
        </button>

        {msg ? <p className="mt-3 text-sm text-red-600">{msg}</p> : null}

        {token ? (
          <div className="mt-4">
            <div className="text-sm text-gray-600">Link (otwórz w incognito):</div>
            <div className="mt-2 flex gap-2">
              <input className="w-full rounded-xl border p-3 font-mono text-sm" readOnly value={link} />
              <button className={btn} onClick={() => copy(link)}>Kopiuj</button>
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Tip: otwórz link /share/&lt;token&gt; w incognito — powinno działać bez logowania.
      </p>
    </div>
  );
}