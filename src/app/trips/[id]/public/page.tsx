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
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  async function create() {
    setMsg(null);
    setLoading(true);

    try {
      if (!tripId) throw new Error("Brak tripId");

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
    <div className="min-h-dvh bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="mx-auto max-w-2xl p-4 pb-24 pt-5">
        <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="bg-[linear-gradient(135deg,#1f2937_0%,#111827_55%,#2f3a4f_100%)] px-5 py-6 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  WanderSplit
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                  Publiczny link
                </h1>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Utwórz prosty link do udostępnienia planu bez logowania.
                </p>
              </div>

              <a
                className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
                href={`/trips/${tripId}`}
              >
                ← Trip
              </a>
            </div>
          </div>

          <div className="p-4">
            <div className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="rounded-[24px] bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Stwórz link do udostępnienia
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  Link pokaże plan podróży w lekkim, publicznym widoku. Idealny do wysłania znajomym.
                </div>

                <div className="mt-4">
                  <button className={btnBlack} onClick={create} disabled={loading}>
                    {loading ? "Tworzenie..." : "Utwórz link"}
                  </button>
                </div>
              </div>

              {msg ? (
                <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {msg}
                </p>
              ) : null}

              {token ? (
                <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    Gotowe do wysłania
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Otwórz w incognito albo wyślij znajomym.
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      className="w-full rounded-2xl border p-3 font-mono text-sm"
                      readOnly
                      value={link}
                    />
                    <button className={btn} onClick={() => copy(link)}>
                      Kopiuj
                    </button>
                  </div>
                </div>
              ) : null}

              <p className="mt-4 text-xs text-slate-500">
                Tip: otwórz link /share/&lt;token&gt; w incognito — powinno działać bez logowania.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
