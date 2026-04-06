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
import { isMobile } from "@/lib/mobile/isMobile";

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
    : String(Date.now()) + Math.random();
}

async function readTripsFromDB(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, start_date, end_date, base_currency, created_at, cover_path")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("readTripsFromDB warning:", error);
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

function createDemoTrip() {
  const id = uid();

  const trip = {
    id,
    title: "Tokio 🇯🇵 Demo",
    start_date: "2026-05-10",
    end_date: "2026-05-20",
    base_currency: "JPY",
    created_at: new Date().toISOString(),
  };

  localStorage.setItem("wandersplit:trips", JSON.stringify([trip]));

  localStorage.setItem(
    `wandersplit:checklist:${id}`,
    JSON.stringify([
      { id: "1", text: "Paszport", done: true },
      { id: "2", text: "Ładowarka", done: false },
      { id: "3", text: "Rezerwacja hotelu", done: true },
    ])
  );

  localStorage.setItem(
    `wandersplit:stops:${id}`,
    JSON.stringify([
      { id: "1", name: "Tokyo", lat: 35.6762, lng: 139.6503 },
      { id: "2", name: "Kyoto", lat: 35.0116, lng: 135.7681 },
    ])
  );

  localStorage.setItem(
    `wandersplit:budget:${id}`,
    JSON.stringify([
      { id: "1", title: "Hotel", amount: 1200 },
      { id: "2", title: "Jedzenie", amount: 300 },
    ])
  );

  window.location.href = `/trips/${id}`;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/55 px-3 py-2 backdrop-blur">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function TripsPage() {
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [mode, setMode] = useState("...");

  useEffect(() => {
    setMode(isMobile ? "Mobile" : "Web");

    let localTrips = JSON.parse(localStorage.getItem("wandersplit:trips") || "[]");

    if (!localTrips.length) {
      const id = uid();

      localTrips = [
        {
          id,
          title: "Tokio 🇯🇵 Demo",
          start_date: "2026-05-10",
          end_date: "2026-05-20",
          base_currency: "JPY",
          created_at: new Date().toISOString(),
        },
      ];

      localStorage.setItem("wandersplit:trips", JSON.stringify(localTrips));

      localStorage.setItem(
        `wandersplit:checklist:${id}`,
        JSON.stringify([
          { id: "1", text: "Paszport", done: true },
          { id: "2", text: "Ładowarka", done: false },
          { id: "3", text: "Rezerwacja hotelu", done: true },
        ])
      );

      localStorage.setItem(
        `wandersplit:stops:${id}`,
        JSON.stringify([
          { id: "1", name: "Tokyo", lat: 35.6762, lng: 139.6503 },
          { id: "2", name: "Kyoto", lat: 35.0116, lng: 135.7681 },
        ])
      );

      localStorage.setItem(
        `wandersplit:budget:${id}`,
        JSON.stringify([
          { id: "1", title: "Hotel", amount: 1200 },
          { id: "2", title: "Jedzenie", amount: 300 },
        ])
      );
    }
  }, []);

  useEffect(() => {
    (async () => {
      setChecking(true);
      setMsg(null);

      if (isMobile) {
        const stored = localStorage.getItem("wandersplit:trips");
        if (stored) setTrips(JSON.parse(stored));
        setUserEmail(null);
        setChecking(false);
        return;
      }

      try {
        const dbTrips = await readTripsFromDB();
        if (dbTrips.length > 0) {
          setTrips(dbTrips);

          const map: Record<string, string> = {};
          for (const t of dbTrips) {
            if (t.cover_path) {
              try {
                const url = await getTripCoverUrl(t.cover_path);
                if (url) map[t.id] = url;
              } catch {}
            }
          }

          setCoverUrls(map);

          const { data: u } = await supabase.auth.getUser();
          setUserEmail(u?.user?.email ?? null);

          setChecking(false);
          return;
        }
      } catch (e) {
        console.warn("mobile fallback auth/db warning:", e);
      }

      const localTrips = JSON.parse(localStorage.getItem("wandersplit:trips") || "[]");
      setTrips(localTrips);
      setUserEmail(null);
      setChecking(false);
    })();
  }, []);

  async function logout() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      setUserEmail(null);
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

    try {
      const { data: u } = await supabase.auth.getUser();

      if (!u?.user) throw new Error("NO_USER");

      const { error } = await supabase.from("trips").insert({
        id,
        user_id: u.user.id,
        title: t,
        start_date: startDate,
        end_date: endDate,
        base_currency: currency || "EUR",
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      const { error: memberError } = await supabase.from("trip_members").insert({
        trip_id: id,
        user_id: u.user.id,
        role: "owner",
      });

      if (memberError) throw memberError;

      if (demo) seedDemo(id);
      else seedEmpty(id);

      const refreshed = await readTripsFromDB();
      setTrips(refreshed);
      window.location.href = `/trips/${id}`;
      return;
    } catch (e: any) {
      if (e?.message !== "NO_USER") {
        console.warn("DB save failed, fallback to local:", e);
      }
    }

    const localTrips = JSON.parse(localStorage.getItem("wandersplit:trips") || "[]");
    const localTrip = {
      id,
      title: t,
      start_date: startDate,
      end_date: endDate,
      base_currency: currency || "EUR",
      created_at: new Date().toISOString(),
    };

    localStorage.setItem("wandersplit:trips", JSON.stringify([localTrip, ...localTrips]));

    if (demo) seedDemo(id);
    else seedEmpty(id);

    setTrips(JSON.parse(localStorage.getItem("wandersplit:trips") || "[]"));
    window.location.href = `/trips/${id}`;
  }

  const canSubmit = useMemo(() => {
    return !!title.trim() && !!startDate && !!endDate && !busy;
  }, [title, startDate, endDate, busy]);

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f3f0ff_0%,#efe6ff_100%)] px-4 pb-14 pt-6">
      <div className="w-full">
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/30 bg-white/60 px-3 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 bg-white" />
            <div>
              <div className="text-[13px] font-semibold text-slate-900">WanderSplit</div>
              <div className="text-[11px] text-slate-500">Travel · Budget · Route</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
            >
              Open app
            </Link>
            <button
              onClick={createDemoTrip}
              className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              try demo
            </button>
          </div>
        </div>

        <PageHeader
          eyebrow="WanderSplit"
          title="Twoje podróże"
          description={
            checking
              ? "Sprawdzam sesję…"
              : userEmail
              ? `Zalogowana: ${userEmail}`
              : "Tryb lokalny — brak logowania"
          }
          right={
            userEmail ? (
              <button
                onClick={logout}
                disabled={busy}
                className={cx(
                  "shrink-0 rounded-2xl border border-white/40 bg-white/80 px-4 py-2 text-sm font-bold text-slate-900 shadow-sm backdrop-blur active:scale-[0.98]",
                  busy && "opacity-60"
                )}
              >
                Wyloguj
              </button>
            ) : (
              <Link
                href="/login"
                className="shrink-0 rounded-2xl border border-white/40 bg-white/80 px-4 py-2 text-sm font-bold text-slate-900 shadow-sm backdrop-blur active:scale-[0.98]"
              >
                Zaloguj
              </Link>
            )
          }
        />

        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatChip label="Tryb" value={mode} />
          <StatChip label="Tripy" value={String(trips.length)} />
          <StatChip label="Status" value={userEmail ? "Cloud" : "Local"} />
        </div>

        {userEmail ? null : (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Nie jesteś zalogowana do Supabase. Możesz działać lokalnie albo kliknąć „Zaloguj”.
          </div>
        )}

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
    </div>
  );
}
