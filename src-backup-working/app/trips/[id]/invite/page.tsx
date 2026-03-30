"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function InvitePage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const keyInvite = useMemo(() => `wandersplit:invite:${tripId}`, [tripId]);

  const [code, setCode] = useState<string>("");
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (!tripId) return;

    // teraz jesteśmy w przeglądarce, więc localStorage i window istnieją
    setOrigin(window.location.origin);

    const raw = localStorage.getItem(keyInvite);
    if (raw) {
      try {
        const j = JSON.parse(raw);
        if (j?.code) {
          setCode(String(j.code));
          return;
        }
      } catch {}
    }

    const c = makeCode();
    localStorage.setItem(keyInvite, JSON.stringify({ code: c, createdAt: new Date().toISOString() }));
    setCode(c);
  }, [tripId, keyInvite]);

  const joinLink = useMemo(() => {
    if (!origin || !code || !tripId) return "";
    return `${origin}/join/${code}?trip=${encodeURIComponent(tripId)}`;
  }, [origin, code, tripId]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Skopiowano ✅");
    } catch {
      alert("Nie mogę skopiować — zaznacz i skopiuj ręcznie.");
    }
  }

  const btn = "rounded-xl border px-4 py-2 text-sm";
  const btnBlack = "rounded-xl bg-black px-4 py-2 text-sm text-white";

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invite</h1>
          <p className="mt-1 text-sm text-gray-600">
            Trip ID: <span className="font-mono">{tripId}</span>
          </p>
        </div>

        <a className={btn} href={`/trips/${tripId}`}>← Trip</a>
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="text-sm text-gray-600">Kod zaproszenia</div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="font-mono text-2xl">{code || "…"}</div>
          <button className={btnBlack} onClick={() => copy(code)} disabled={!code}>
            Kopiuj kod
          </button>
        </div>

        <div className="mt-5 text-sm text-gray-600">Link do dołączenia</div>
        <div className="mt-2 flex items-center gap-2">
          <input
            className="w-full rounded-xl border p-3 font-mono text-sm"
            readOnly
            value={joinLink || "…"}
          />
          <button className={btn} onClick={() => copy(joinLink)} disabled={!joinLink}>
            Kopiuj link
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Tip: otwórz link w incognito / innym profilu przeglądarki, żeby zasymulować drugą osobę.
        </p>
      </div>
    </div>
  );
}