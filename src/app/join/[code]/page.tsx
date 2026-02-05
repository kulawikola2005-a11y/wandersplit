"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const sp = useSearchParams();

  const code = useMemo(() => (params?.code ? String(params.code) : ""), [params]);
  const tripId = useMemo(() => sp.get("trip") || "", [sp]);

  const btn = "rounded-xl border px-4 py-2 text-sm";
  const btnBlack = "rounded-xl bg-black px-4 py-2 text-sm text-white";

  function joinLocal() {
    if (!tripId || !code) return;

    // zapisz “członkostwo” lokalnie (na potrzeby demo)
    const key = `wandersplit:joined:${tripId}`;
    localStorage.setItem(key, JSON.stringify({ joined: true, code, joinedAt: new Date().toISOString() }));

    window.location.href = `/trips/${tripId}`;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Join</h1>
      <p className="mt-1 text-sm text-gray-600">Kod: <span className="font-mono">{code}</span></p>
      <p className="mt-1 text-sm text-gray-600">Trip: <span className="font-mono">{tripId || "-"}</span></p>

      <div className="mt-6 rounded-2xl border p-4">
        <p className="text-sm text-gray-700">
          To jest demo-join lokalny. Kliknij, żeby “dołączyć” i przejść do tripa.
        </p>

        <div className="mt-4 flex gap-2">
          <button className={btnBlack} onClick={joinLocal} disabled={!tripId || !code}>
            Dołącz do tripa
          </button>
          <a className={btn} href="/trips">← Trips</a>
        </div>
      </div>
    </div>
  );
}
