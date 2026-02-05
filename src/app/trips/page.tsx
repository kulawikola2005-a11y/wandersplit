"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Trip = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  base_currency: string;
  created_at: string;
};

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

function readTrips(): Trip[] {
  try {
    const raw = localStorage.getItem("wandersplit:trips");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveTrips(trips: Trip[]) {
  localStorage.setItem("wandersplit:trips", JSON.stringify(trips));
}

export default function TripsPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  const today = useMemo(() => new Date(), []);
  const [title, setTitle] = useState("Nowy trip");
  const [startDate, setStartDate] = useState(ymd(today));
  const [endDate, setEndDate] = useState(ymd(addDays(today, 3)));
  const [currency, setCurrency] = useState("EUR");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);

      // gate: jeśli chcesz publiczne /trips bez logowania, usuń ten blok
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        window.location.href = "/login";
        return;
      }
      setUserEmail(u.user.email ?? null);

      setTrips(readTrips());
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function seedEmpty(tripId: string) {
    // nie psuje niczego — tylko zapewnia, że strony Plan/Stops/Budget mają co czytać
    localStorage.setItem(`wandersplit:stops:${tripId}`, JSON.stringify([]));
    localStorage.setItem(`wandersplit:plan:${tripId}`, JSON.stringify([]));
    localStorage.setItem(`wandersplit:checklist:${tripId}`, JSON.stringify([]));
    localStorage.setItem(`wandersplit:budget:${tripId}`, JSON.stringify([]));
  }

  function seedDemo(tripId: string) {
    localStorage.setItem(
      `wandersplit:stops:${tripId}`,
      JSON.stringify([
        { id: uid(), name: "Rome", countryCode: "IT", sort_order: 1 },
        { id: uid(), name: "Florence", countryCode: "IT", sort_order: 2 },
      ])
    );

    localStorage.setItem(
      `wandersplit:plan:${tripId}`,
      JSON.stringify([
        { id: uid(), text: "Przeloty / bilety", status: "todo", createdAt: new Date().toISOString() },
        { id: uid(), text: "Rezerwacja noclegu", status: "doing", createdAt: new Date().toISOString() },
        { id: uid(), text: "Lista miejsc do odwiedzenia", status: "todo", createdAt: new Date().toISOString() },
      ])
    );

    localStorage.setItem(
      `wandersplit:checklist:${tripId}`,
      JSON.stringify([
        { id: uid(), text: "Paszport / dowód", done: false, createdAt: new Date().toISOString() },
        { id: uid(), text: "Ubezpieczenie", done: false, createdAt: new Date().toISOString() },
        { id: uid(), text: "Adapter / ładowarka", done: true, createdAt: new Date().toISOString() },
      ])
    );

    localStorage.setItem(
      `wandersplit:budget:${tripId}`,
      JSON.stringify([
        { id: uid(), title: "Hotel (zaliczka)", amount: 120, currency: "EUR", paid_by: "you", split: "equal", createdAt: new Date().toISOString() },
        { id: uid(), title: "Kolacja", amount: 45, currency: "EUR", paid_by: "you", split: "equal", createdAt: new Date().toISOString() },
      ])
    );
  }

  async function loadRomeDemo() {
    setMsg(null);
    setCreating(true);
    try {
      const id = uid();
      const start = new Date();
      const end = addDays(start, 4);

      const trip: Trip = {
        id,
        title: "Rome (Demo)",
        start_date: ymd(start),
        end_date: ymd(end),
        base_currency: "EUR",
        created_at: new Date().toISOString(),
      };

      seedDemo(id);

      const next = [trip, ...readTrips()].slice(0, 100);
      saveTrips(next);
      setTrips(next);

      window.location.href = `/trips/${id}`;
    } catch (e: any) {
      setMsg(e?.message ?? "Błąd");
      setCreating(false);
    }
  }

  async function createTrip() {
    setMsg(null);
    setCreating(true);
    try {
      const t = title.trim();
      if (!t) throw new Error("Wpisz tytuł tripa.");

      const id = uid();
      const trip: Trip = {
        id,
        title: t,
        start_date: startDate,
        end_date: endDate,
        base_currency: (currency || "EUR").toUpperCase(),
        created_at: new Date().toISOString(),
      };

      seedEmpty(id);

      const next = [trip, ...readTrips()].slice(0, 100);
      saveTrips(next);
      setTrips(next);

      window.location.href = `/trips/${id}`;
    } catch (e: any) {
      setMsg(e?.message ?? "Błąd");
      setCreating(false);
    }
  }

  const btn = "rounded-xl border px-4 py-2 text-sm";
  const btnBlack = "rounded-xl bg-black px-4 py-2 text-sm text-white";

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trips</h1>
          <p className="mt-1 text-sm text-gray-600">
            Zalogowana jako: <span className="font-medium">{userEmail ?? "-"}</span>
          </p>
        </div>
        <button className={btn} onClick={signOut}>Wyloguj</button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btnBlack} onClick={loadRomeDemo} disabled={creating || loading}>
          {creating ? "Tworzę…" : "Load demo trip"}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border p-4">
        <div className="text-sm font-medium">Create new trip</div>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input
            className="rounded-xl border p-2 md:col-span-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tytuł"
          />
          <input className="rounded-xl border p-2" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input className="rounded-xl border p-2" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className="w-24 rounded-xl border p-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder="EUR"
          />
          <button className={btn} onClick={createTrip} disabled={creating || loading}>
            {creating ? "Tworzę…" : "Create trip"}
          </button>
        </div>
      </div>

      {loading ? <p className="mt-6 text-sm text-gray-600">Ładuję…</p> : null}
      {msg ? <p className="mt-3 text-sm text-red-600">{msg}</p> : null}

      <div className="mt-6 space-y-2">
        {trips.length === 0 && !loading ? (
          <p className="text-sm text-gray-600">Brak tripów. Kliknij “Load demo trip” albo “Create trip”.</p>
        ) : (
          trips.map((tr) => (
            <div key={tr.id} className="rounded-2xl border p-4">
              <a href={`/trips/${tr.id}`} className="block">
                <div className="font-medium">{tr.title}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {tr.start_date} → {tr.end_date} · {tr.base_currency}
                </div>
              </a>

              <div className="mt-3 flex flex-wrap gap-2">
                <a className={btn} href={`/trips/${tr.id}`}>Trip</a>
                <a className={btn} href={`/trips/${tr.id}/public`}>Public link</a>
                <a className={btn} href={`/trips/${tr.id}/invite`}>Invite</a>
                <a className={btn} href={`/trips/${tr.id}/export`}>Export PDF</a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
