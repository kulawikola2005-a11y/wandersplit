"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function JoinPage() {
  const sp = useSearchParams();
  const trip = sp.get("trip") || "";
  const code = sp.get("code") || "";

  const keyInvite = useMemo(() => `wandersplit:invite:${trip}`, [trip]);
  const keyMembers = useMemo(() => `wandersplit:members:${trip}`, [trip]);

  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function join() {
    const n = name.trim();
    if (!trip || !code) return setMsg("Brak trip lub code w linku.");
    if (!n) return setMsg("Wpisz swoje imię/nick.");

    const stored = localStorage.getItem(keyInvite);
    if (!stored) return setMsg("Ten trip nie ma jeszcze invite (najpierw Create invite).");
    if (stored !== code) return setMsg("Kod invite nie pasuje.");

    const raw = localStorage.getItem(keyMembers);
    const members: string[] = raw ? JSON.parse(raw) : [];
    if (!members.includes(n)) members.unshift(n);
    localStorage.setItem(keyMembers, JSON.stringify(members));

    setMsg("Dołączono ✅ Możesz wrócić do tripa.");
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Join</h1>
      <p className="mt-1 text-sm text-gray-600">
        Trip: <span className="font-mono">{trip || "-"}</span>
      </p>

      <div className="mt-6 space-y-3 rounded-2xl border p-4">
        <input
          className="w-full rounded-xl border p-3"
          placeholder="Twoje imię / nick"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={join} className="w-full rounded-xl bg-black px-4 py-3 text-white">
          Join trip
        </button>

        {msg ? <p className="text-sm text-gray-700">{msg}</p> : null}

        {trip ? (
          <a className="block rounded-xl border px-4 py-2 text-center text-sm" href={`/trips/${trip}`}>
            ← Wróć do tripa
          </a>
        ) : null}
      </div>
    </div>
  );
}