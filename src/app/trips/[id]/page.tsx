"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Wallet,
  ListTodo,
  MapPin,
  ImageIcon,
  Share2,
  Plus,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getSmartCover } from "@/lib/trips/getSmartCover";
import PageTransition from "@/components/ui/PageTransition";
import SectionCard from "@/components/trip/SectionCard";

type Trip = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  base_currency?: string | null;
  cover_path?: string | null;
  user_id?: string | null;
};

type Expense = {
  amount?: number | string;
};

type Stop = {
  name?: string;
  city?: string;
};

type ChecklistItem = {
  title?: string;
  checked?: boolean;
  done?: boolean;
  status?: string;
};

function readTripFromLocalStorage(tripId: string): Trip | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("wandersplit:trips");
    if (!raw) return null;

    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;

    const found = arr.find((t: any) => String(t?.id) === String(tripId));
    if (!found) return null;

    return {
      id: found.id,
      title: found.title || "Trip",
      start_date: found.start_date ?? null,
      end_date: found.end_date ?? null,
      base_currency: found.base_currency ?? "EUR",
      cover_path: found.cover_path ?? null,
      user_id: found.user_id ?? null,
    };
  } catch (error) {
    console.error("readTripFromLocalStorage error:", error);
    return null;
  }
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Brak dat";
  if (start && end) return `${start} → ${end}`;
  return start || end || "Brak dat";
}

function readArrayFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`readArrayFromStorage error for ${key}:`, error);
    return [];
  }
}

function upsertTripToLocalList(trip: Trip) {
  if (typeof window === "undefined" || !trip?.id) return;

  try {
    const raw = localStorage.getItem("wandersplit:trips");
    const arr = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(arr) ? arr : [];

    const normalized = {
      id: trip.id,
      title: trip.title || "Trip",
      start_date: trip.start_date || "",
      end_date: trip.end_date || "",
      base_currency: trip.base_currency || "EUR",
      cover_path: trip.cover_path || null,
      user_id: trip.user_id || null,
      created_at: (trip as any).created_at || new Date().toISOString(),
    };

    const next = [
      normalized,
      ...list.filter((item: any) => String(item?.id) !== String(trip.id)),
    ];

    localStorage.setItem("wandersplit:trips", JSON.stringify(next));
    localStorage.setItem("wandersplit:lastTrip", JSON.stringify(normalized));
  } catch (error) {
    console.warn("upsertTripToLocalList error:", error);
  }
}

function StatCard({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle?: string;
}) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/85 p-4 backdrop-blur shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold tracking-tight text-neutral-900">{value}</div>
      {subtle ? <div className="mt-1 text-xs text-neutral-500">{subtle}</div> : null}
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const tripSections = [
  {
    key: "plan",
    title: "Plan",
    subtitle: "Dni, zadania i aktywności",
    icon: CalendarDays,
    href: (tripId: string) => `/trips/${tripId}/plan`,
  },
  {
    key: "budget",
    title: "Budżet",
    subtitle: "Wydatki i rozliczenia",
    icon: Wallet,
    href: (tripId: string) => `/trips/${tripId}/budget`,
  },
  {
    key: "checklist",
    title: "Checklista",
    subtitle: "Rzeczy do zrobienia i spakowania",
    icon: ListTodo,
    href: (tripId: string) => `/trips/${tripId}/checklist`,
  },
  {
    key: "stops",
    title: "Przystanki",
    subtitle: "Miejsca i kolejność trasy",
    icon: MapPin,
    href: (tripId: string) => `/trips/${tripId}/stops`,
  },
  {
    key: "cover",
    title: "Okładka",
    subtitle: "Zdjęcie tripa",
    icon: ImageIcon,
    href: (tripId: string) => `/trips/${tripId}/cover`,
  },
  {
    key: "share",
    title: "Udostępnianie",
    subtitle: "Link i współdzielenie",
    icon: Share2,
    href: (tripId: string) => `/trips/${tripId}/share`,
  },
];

export default function TripHomePage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const stopsData = readArrayFromStorage<Stop>(`wandersplit:stops:${tripId}`);
  const expensesData = readArrayFromStorage<Expense>(`wandersplit:expenses:${tripId}`);
  const checklistData = readArrayFromStorage<ChecklistItem>(`wandersplit:checklist:${tripId}`);

  const stops = stopsData.length;

  const totalBudgetSpent = expensesData.reduce((sum, item) => {
    const value =
      typeof item?.amount === "number"
        ? item.amount
        : Number(String(item?.amount ?? 0).replace(",", "."));
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const completedChecklist = checklistData.filter(
    (item) => item?.checked === true || item?.done === true || item?.status === "done"
  ).length;

  const checklistProgress =
    checklistData.length > 0
      ? Math.round((completedChecklist / checklistData.length) * 100)
      : 0;

  useEffect(() => {
    let cancelled = false;

    async function loadTrip() {
      if (!tripId) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const localTrip = readTripFromLocalStorage(tripId);

        if (localTrip) {
          if (!cancelled) {
            setTrip(localTrip);
            upsertTripToLocalList(localTrip);
            setLoading(false);
          }

          try {
            const { data, error } = await supabase
              .from("trips")
              .select("id, title, start_date, end_date, base_currency, cover_path, user_id")
              .eq("id", tripId)
              .maybeSingle();

            if (!cancelled && !error && data) {
              setTrip(data);
              upsertTripToLocalList(data);
            }
          } catch (error) {
            console.warn("supabase trip fetch warning:", error);
          }

          return;
        }

        try {
          const { data, error } = await supabase
            .from("trips")
            .select("id, title, start_date, end_date, base_currency, cover_path, user_id")
            .eq("id", tripId)
            .maybeSingle();

          if (!cancelled) {
            if (error) {
              console.warn("supabase trip fetch warning:", error);
              setTrip(null);
            } else {
              setTrip(data ?? null);
              if (data) upsertTripToLocalList(data);
            }
          }
        } catch (error) {
          console.warn("supabase trip fetch warning:", error);
          if (!cancelled) {
            setTrip(null);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTrip();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const cover = useMemo(() => {
    if (!trip) return getSmartCover("travel", tripId);
    return getSmartCover(trip.title || "travel", trip.id || tripId);
  }, [trip, tripId]);

  const days =
    trip?.start_date && trip?.end_date
      ? Math.max(
          1,
          Math.ceil(
            (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : "-";

  useEffect(() => {
    if (trip) upsertTripToLocalList(trip);
  }, [trip]);

  if (loading) {
    return (
      <div className="w-full px-4 pb-24 pt-4">
        <div className="space-y-4">
          <div className="h-64 w-full animate-pulse rounded-[32px] bg-neutral-200/70" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 animate-pulse rounded-[24px] bg-neutral-200/60" />
            <div className="h-24 animate-pulse rounded-[24px] bg-neutral-200/60" />
            <div className="h-24 animate-pulse rounded-[24px] bg-neutral-200/60" />
            <div className="h-24 animate-pulse rounded-[24px] bg-neutral-200/60" />
          </div>
          <div className="h-40 animate-pulse rounded-[28px] bg-neutral-200/60" />
          <div className="h-48 animate-pulse rounded-[28px] bg-neutral-200/60" />
          <div className="h-48 animate-pulse rounded-[28px] bg-neutral-200/60" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="w-full px-4 pb-24 pt-4">
        <div className="rounded-[28px] border border-black/5 bg-white px-4 py-10 text-center shadow-sm">
          <div className="text-sm font-semibold text-neutral-900">
            Nie udało się otworzyć tripa
          </div>
          <div className="mt-1 text-sm text-neutral-500">
            Trip nie istnieje albo nie masz do niego dostępu.
          </div>
          <Link
            href="/trips"
            className="mt-4 inline-block rounded-2xl border border-black/5 bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
          >
            Wróć do listy tripów
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-dvh w-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] pb-28">
        <div className="px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto max-w-xl space-y-7"
          >
            <div className="relative -mx-4 -mt-4 mb-3 h-[500px] overflow-hidden">
              <div
                className="absolute inset-0 scale-[1.03]"
                style={{
                  backgroundImage: `url('${cover}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

              <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                <Link
                  href="/trips"
                  className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-black backdrop-blur"
                >
                  Wróć
                </Link>

                <div className="rounded-full bg-black/30 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                  Moka
                </div>
              </div>

              <div className="absolute bottom-7 left-4 right-4">
                <div className="rounded-[32px] bg-white/10 backdrop-blur-2xl border border-white/20 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                  <div className="max-w-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Trip overview
                  </div>

                  <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
                    {trip.title || "Trip"}
                  </h1>

                  <p className="mt-3 text-sm leading-6 text-white/80">
                    {formatDateRange(trip.start_date, trip.end_date)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="ws-chip text-white">
                      {days} dni
                    </span>
                    <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs text-white backdrop-blur">
                      {stops} miejsc
                    </span>
                    <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs text-white backdrop-blur">
                      {trip.base_currency || "EUR"}
                    </span>
                  </div>
                  </div>
                </div>
              </div>
            </div>

            <section className="ws-card-strong relative -mt-16 p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Overview
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
                Wszystko, czego potrzebujesz do tej podróży
              </h2>

              <p className="mt-2 text-sm leading-7 text-neutral-500">
                Zobacz trasę, plan dnia, checklistę i budżet bez przechodzenia przez sztywny panel.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <StatCard label="Dni" value={String(days)} subtle="Czas wyjazdu" />
                <StatCard label="Przystanki" value={String(stops)} subtle="Etapy trasy" />
                <StatCard
                  label="Checklista"
                  value={`${checklistProgress}%`}
                  subtle={`${completedChecklist}/${checklistData.length || 0} gotowe`}
                />
                <StatCard
                  label="Budżet"
                  value={`${totalBudgetSpent.toFixed(0)} ${trip.base_currency || "EUR"}`}
                  subtle={`${expensesData.length} wydatków`}
                />
              </div>
            </section>

            <section className="ws-card p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Szybki dostęp
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
                Najważniejsze sekcje podróży
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-4">
                {tripSections.slice(0, 4).map((section) => {
                  const Icon = section.icon;

                  return (
                    <Link
                      key={section.key}
                      href={section.href(tripId)}
className="ws-card ws-lift block overflow-hidden rounded-[28px] p-5 transition active:scale-[0.97]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f5f7fb] text-neutral-700">
                          <Icon size={18} />
                        </div>

                        <div className="rounded-full bg-[#f5f7fb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          Otwórz
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="text-base font-semibold text-neutral-900">
                          {section.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-neutral-500">
                          {section.subtitle}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <motion.div
  variants={fadeUp}
  initial="hidden"
  animate="show"
  transition={{ duration: 0.4 }}
>
<SectionCard
              title="Twoja trasa"
              description="Zobacz klimat podróży i kolejne miejsca na trasie"
              href={`/trips/${tripId}/stops`}
              ctaLabel="Otwórz mapę"
            >
              {stopsData.length > 0 ? (
                <div className="space-y-4">
                  <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
                    {stopsData.map((stop, index) => {
                      const label = stop.name || stop.city || `Przystanek ${index + 1}`;
                      const image = getSmartCover(label, `${tripId}-${index}`);

                      return (
                        <div
                          key={`${label}-${index}`}
                          className="min-w-[285px] max-w-[285px] snap-start overflow-hidden rounded-[34px] border border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#f5f3ff_100%)] p-3 shadow-[0_20px_50px_rgba(139,92,246,0.14)] transition duration-300 active:scale-[0.98]"
                        >
                          <div
                            className="relative h-[190px] overflow-hidden rounded-[28px] bg-cover bg-center"
                            style={{
                              backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.38), rgba(15,23,42,0.02)), url('${image}')`,
                            }}
                          >
                            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-violet-700 shadow-sm backdrop-blur">
                              Stop {index + 1}
                            </div>
                          </div>

                          <div className="px-2 pb-2 pt-4">
                            <p className="text-[24px] font-extrabold leading-tight tracking-tight text-slate-950">
                              {label}
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {index === 0
                                ? "Początek Twojej podróży."
                                : index === stopsData.length - 1
                                ? "Finał trasy i ostatni etap wyjazdu."
                                : "Kolejny punkt na trasie i część planu podróży."}
                            </p>

                            <div className="mt-4 flex items-center justify-between">
                              <div className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
                                📍 Przystanek
                              </div>

                              <div className="rounded-full bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm">
                                Otwórz
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4 rounded-[28px] border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#f6f3ff_100%)] px-5 py-4 shadow-[0_14px_34px_rgba(139,92,246,0.10)]">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 shadow-inner">
                        ✨
                      </div>

                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400">
                          Route overview
                        </div>

                        <div className="mt-1 text-[15px] font-semibold tracking-tight text-slate-900">
                          Łącznie zapisanych przystanków: {stops}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/trips/${tripId}/stops`}
                      className="shrink-0 rounded-full bg-[linear-gradient(135deg,#111827_0%,#312e81_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(49,46,129,0.28)] transition hover:scale-[1.03] active:scale-[0.98]"
                    >
                      Zobacz →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-black/5 bg-white p-4">
                  <p className="text-sm font-medium text-neutral-900">
                    Jeszcze nie masz przystanków
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Dodaj miejsca, aby Twoja podróż zaczęła wyglądać bardziej wizualnie.
                  </p>
                </div>
              )}
            </SectionCard>
</motion.div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <motion.div
  variants={fadeUp}
  initial="hidden"
  animate="show"
  transition={{ duration: 0.4 }}
>
<SectionCard
                title="Budżet"
                description="Szybki podgląd wydatków grupy"
                href={`/trips/${tripId}/budget`}
                ctaLabel="Otwórz"
              >
                <div className="ws-card rounded-[24px] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                    Wydano łącznie
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                    {totalBudgetSpent.toFixed(2)} {trip.base_currency || "EUR"}
                  </p>
                  <p className="mt-2 text-sm text-neutral-500">
                    Liczba wydatków: {expensesData.length}
                  </p>
                </div>
              </SectionCard>
</motion.div>

              <motion.div
  variants={fadeUp}
  initial="hidden"
  animate="show"
  transition={{ duration: 0.4 }}
>
<SectionCard
                title="Checklista"
                description="Postęp przygotowań"
                href={`/trips/${tripId}/checklist`}
                ctaLabel="Otwórz listę"
              >
                <div className="rounded-[24px] border border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700">
                      Ukończono
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {completedChecklist}/{checklistData.length}
                    </span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-neutral-900 transition-all duration-500"
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>

                  <p className="mt-3 text-sm text-neutral-500">
                    Postęp: {checklistProgress}%
                  </p>
                </div>
              </SectionCard>
</motion.div>
            </div>

            <section className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Więcej
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
                  Więcej opcji podróży
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {tripSections.slice(4).map((section, index) => {
                  const Icon = section.icon;
                  const dark = index % 2 === 0;

                  return (
                    <Link
                      key={section.key}
                      href={section.href(tripId)}
                      className={
                        dark
                          ? "relative overflow-hidden rounded-[30px] border border-black/5 bg-[linear-gradient(135deg,#111827_0%,#1f2937_100%)] px-5 py-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.16)] active:scale-[0.98]"
                          : "relative overflow-hidden rounded-[30px] border border-black/5 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] px-5 py-5 text-neutral-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(0,0,0,0.10)] active:scale-[0.98]"
                      }
                    >
                      <div className={dark ? "absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" : "absolute -right-6 -top-6 h-24 w-24 rounded-full bg-slate-200/50 blur-2xl"} />

                      <div className="relative flex items-start justify-between gap-4">
                        <div className="max-w-[75%]">
                          <div
                            className={
                              dark
                                ? "inline-flex rounded-full bg-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 backdrop-blur"
                                : "inline-flex rounded-full bg-[#eef2f7] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500"
                            }
                          >
                            opcja
                          </div>

                          <div className="mt-4 text-2xl font-bold tracking-tight">
                            {section.title}
                          </div>

                          <div className={dark ? "mt-2 text-sm leading-6 text-white/75" : "mt-2 text-sm leading-6 text-neutral-500"}>
                            {section.subtitle}
                          </div>
                        </div>

                        <div
                          className={
                            dark
                              ? "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/12 text-white backdrop-blur"
                              : "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-neutral-700 shadow-sm"
                          }
                        >
                          <Icon size={18} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </motion.div>

          <button
            onClick={() => setSheetOpen(true)}
            className="fixed bottom-28 right-5 z-50 flex h-14 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-[0_25px_70px_rgba(0,0,0,0.5)] transition ws-lift active:scale-[0.96]"
            style={{ background: "linear-gradient(135deg,#111827,#1f2937,#374151)" }}
          >
            <Plus size={18} />
            Dodaj
          </button>

          {sheetOpen && (
            <div className="fixed inset-0 z-[100]">
              <div
                className="absolute inset-0 bg-black/45 backdrop-blur-md"
                onClick={() => setSheetOpen(false)}
              />

              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 300 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120) setSheetOpen(false);
                }}
                initial={{ y: 300, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 300, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 25 }}
                className="absolute bottom-0 left-0 right-0 rounded-t-[36px] border-t border-white/40 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_-18px_60px_rgba(0,0,0,0.22)]"
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-300" />

                <div className="mb-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Quick add
                  </div>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
                    Szybkie dodawanie
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Dodaj najważniejsze elementy podróży bez przechodzenia przez cały ekran.
                  </p>
                </div>

                <div className="space-y-3">
                  <Link
                    href={`/trips/${tripId}/budget`}
                    className="block overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#111827_0%,#1f2937_100%)] px-5 py-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                      finance
                    </div>
                    <div className="mt-2 text-lg font-semibold">➕ Dodaj wydatek</div>
                    <div className="mt-1 text-sm text-white/75">
                      Zapisz nowy koszt podróży i rozlicz grupę.
                    </div>
                  </Link>

                  <Link
                    href={`/trips/${tripId}/stops`}
                    className="block overflow-hidden rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-sm"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      route
                    </div>
                    <div className="mt-2 text-lg font-semibold text-neutral-900">📍 Dodaj przystanek</div>
                    <div className="mt-1 text-sm text-neutral-500">
                      Rozbuduj trasę i kolejne etapy podróży.
                    </div>
                  </Link>

                  <Link
                    href={`/trips/${tripId}/plan`}
                    className="block overflow-hidden rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-sm"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                      itinerary
                    </div>
                    <div className="mt-2 text-lg font-semibold text-neutral-900">✅ Dodaj zadanie</div>
                    <div className="mt-1 text-sm text-neutral-500">
                      Uzupełnij plan dnia i najważniejsze punkty wyjazdu.
                    </div>
                  </Link>
                </div>
              </motion.div>
            </div>
          )}
        </div>

      </main>
    </PageTransition>
  );
}
