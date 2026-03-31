"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getTripCoverUrl } from "@/lib/trips/media";
import { getTripCoverDeterministic } from "@/lib/mobile/covers";

import PageHeader from "@/components/app/PageHeader";
import Section from "@/components/app/Section";
import EmptyState from "@/components/app/EmptyState";
import SkeletonBlock from "@/components/app/SkeletonBlock";

type Trip = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  base_currency: string;
  created_at: string;
  cover_path?: string | null;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

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

async function readTripsFromDB(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, start_date, end_date, base_currency, created_at, cover_path")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("readTripsFromDB error:", error);
    return [];
  }

  return data ?? [];
}

function seedEmpty(tripId: string) {
  localStorage.setItem(`wandersplit:stops:${tripId}`, JSON.stringify([]));
  localStorage.setItem(`wandersplit:plan:${tripId}`, JSON.stringify([]));
  localStorage.setItem(`wandersplit:checklist:${tripId}`, JSON.stringify([]));
  localStorage.setItem(`wandersplit:budget:${tripId}`, JSON.stringify([]));
}

function seedDemo(tripId: string) {
  const now = new Date().toISOString();
  localStorage.setItem(
    `wandersplit:stops:${tripId}`,
    JSON.stringify([
      { id: uid(), name: "Rome", countryCode: "IT", sort_order: 1, lat: 41.9028, lng: 12.4964 },
      { id: uid(), name: "Florence", countryCode: "IT", sort_order: 2, lat: 43.7696, lng: 11.2558 },
    ])
  );

  localStorage.setItem(
    `wandersplit:plan:${tripId}`,
    JSON.stringify([
      { id: uid(), text: "Przeloty / bilety", status: "todo", createdAt: now },
      { id: uid(), text: "Rezerwacja noclegu", status: "doing", createdAt: now },
      { id: uid(), text: "Lista miejsc do odwiedzenia", status: "todo", createdAt: now },
    ])
  );

  localStorage.setItem(
    `wandersplit:checklist:${tripId}`,
    JSON.stringify([
      { id: uid(), text: "Paszport / dowód", done: false, createdAt: now },
      { id: uid(), text: "Ubezpieczenie", done: false, createdAt: now },
      { id: uid(), text: "Adapter / ładowarka", done: true, createdAt: now },
    ])
  );

  localStorage.setItem(`wandersplit:currency:${tripId}`, "EUR");
  localStorage.setItem(`wandersplit:people:${tripId}`, JSON.stringify(["Ja", "Osoba 2", "Osoba 3"]));
  localStorage.setItem(`wandersplit:expenses:${tripId}`, JSON.stringify([]));
}

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}


function createDemoTrip() {
  const id = crypto.randomUUID();

  const trip = {
    id,
    title: "Tokio 🇯🇵 Demo",
    start_date: "2026-05-10",
    end_date: "2026-05-20",
    base_currency: "JPY",
  };

  localStorage.setItem("wandersplit:trips", JSON.stringify([trip]));

  localStorage.setItem(`wandersplit:checklist:${id}`, JSON.stringify([
    { id: "1", text: "Paszport", done: true },
    { id: "2", text: "Ładowarka", done: false },
    { id: "3", text: "Rezerwacja hotelu", done: true }
  ]));

  localStorage.setItem(`wandersplit:stops:${id}`, JSON.stringify([
    { id: "1", name: "Tokyo", lat: 35.6762, lng: 139.6503 },
    { id: "2", name: "Kyoto", lat: 35.0116, lng: 135.7681 }
  ]));

  localStorage.setItem(`wandersplit:budget:${id}`, JSON.stringify([
    { id: "1", title: "Hotel", amount: 1200 },
    { id: "2", title: "Jedzenie", amount: 300 }
  ]));

  window.location.href = `/trips/${id}`;
}

export default function TripsPage() {
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
const [coverUrl, setCoverUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("EUR");

  useEffect(() => {
    const t = new Date();
    setTitle("");
    setStartDate(ymd(t));
    setEndDate(ymd(addDays(t, 3)));
  }, []);

  useEffect(() => {
    (async () => {
      setChecking(true);
      setMsg(null);

      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(u.user.email ?? null);

      const loadedTrips = await readTripsFromDB();
      setTrips(loadedTrips);

      const map: Record<string, string> = {};
      for (const t of loadedTrips) {
        if (t.cover_path) {
          try {
            const url = await getTripCoverUrl(t.cover_path);
            if (url) map[t.id] = url;
          } catch (e) {
            console.error(e);
          }
        }
      }
      setCoverUrls(map);

      setChecking(false);
    })();
  }, []);

  async function logout() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setBusy(false);
    }
  }

  async function createTrip(demo = false) {
    setMsg(null);

    const t = (demo ? "Rome (Demo)" : title).trim();
    if (!t) return setMsg("Podaj nazwę tripa.");
    if (!startDate || !endDate) return setMsg("Ustaw daty.");
    if (endDate < startDate) return setMsg("Data końca nie może być wcześniejsza niż start.");

    const id = uid();
    const trip: Trip = {
      id,
      title: t,
      start_date: startDate,
      end_date: endDate,
      base_currency: currency || "EUR",
      created_at: new Date().toISOString(),
    };

    const { data: u } = await supabase.auth.getUser();

    if (!u?.user) {
      setMsg("Brak użytkownika.");
      return;
    }

    const { error } = await supabase.from("trips").insert({
      id,
      user_id: u.user.id,
      title: t,
      start_date: startDate,
      end_date: endDate,
      base_currency: currency || "EUR",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("insert trip error:", error);
      setMsg("Nie udało się zapisać tripa.");
      return;
    }

    const { error: memberError } = await supabase.from("trip_members").insert({
      trip_id: id,
      user_id: u.user.id,
      role: "owner",
    });

    if (memberError) {
      console.error("insert trip_members error:", memberError);
      setMsg("Trip zapisany, ale nie udało się dodać ownera do uczestników.");
      return;
    }

    if (demo) seedDemo(id);
    else seedEmpty(id);

    setTrips(await readTripsFromDB());
    window.location.href = `/trips/${id}`;
  }

  const canSubmit = useMemo(() => {
    return !!title.trim() && !!startDate && !!endDate && !busy;
  }, [title, startDate, endDate, busy]);

  return (
    <>
      <div className="flex gap-2 p-3">
<button 
  onClick={createDemoTrip}
  className="ws-btn px-4 py-2"
>
  Demo Trip
</button>
      </div>
      <div className="px-4 pb-10 pt-6">
      <PageHeader
        eyebrow="WanderSplit"
        title="Twoje podróże"
        description={
          checking
            ? "Sprawdzam sesję…"
            : userEmail
            ? `Zalogowana: ${userEmail}`
            : ""
        }
        right={
          <button
            onClick={logout}
            disabled={busy}
            className={cx(
              "rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50",
              busy && "opacity-60"
            )}
          >
            Wyloguj
          </button>
        }
      />

      <div className="space-y-6">
        <Section
          title="Utwórz nowy trip"
          subtitle="Podaj nazwę, daty i walutę bazową."
        >
          <div className="grid gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="Nazwa tripa"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="EUR"
              />
              <button
                onClick={() => createTrip(false)}
                disabled={!canSubmit || checking}
                className={cx(
                  "rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900 shadow-sm border border-slate-200 hover:bg-slate-50",
                  "disabled:opacity-60 disabled:text-slate-400 disabled:cursor-not-allowed"
                )}
              >
                Utwórz
              </button>
            </div>

            {msg ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {msg}
              </div>
            ) : null}
          </div>
        </Section>

        <Section
          title="Lista tripów"
          subtitle="Tutaj zobaczysz swoje zapisane podróże."
        >
          {checking ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-28 rounded-3xl" />
              <SkeletonBlock className="h-28 rounded-3xl" />
            </div>
          ) : trips.length === 0 ? (
            <EmptyState
              title="Nie masz jeszcze żadnych tripów"
              description="Utwórz swój pierwszy trip powyżej."
            />
          ) : (
            <div className="space-y-4">
              {trips.map((t) => {
                const cover = coverUrls[t.id] || getTripCoverDeterministic(t.id);
                return (
                  <div
                    key={t.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div
                      className="h-28 bg-cover bg-center"
                      style={{ backgroundImage: `url('${cover}')` }}
                    />
                    <div className="p-4">
                      <div className="text-base font-black">{t.title}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {t.start_date} → {t.end_date} · {t.base_currency}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/trips/${t.id}`}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                        >
                          Otwórz
                        </Link>

                        <Link
                          href={`/trips/${t.id}/public`}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Public link
                        </Link>

                        <Link
                          href={`/trips/${t.id}/invite`}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Invite
                        </Link>

                        <Link
                          href={`/trips/${t.id}/export`}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Export PDF
                        </Link>

                        <Link
                          href={`/trips/${t.id}/memories`}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Memories
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
    </>
  );
}