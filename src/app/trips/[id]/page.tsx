"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, Wallet, ListTodo, Map, CloudSun, Share2, UserPlus, Globe, ChevronRight } from "lucide-react";
import TripHeroPro from "@/components/trip/TripHeroPro";

type Trip = {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  base_currency?: string;
};

type Stop = {
  id: string;
  name: string;
  countryCode?: string;
  sort_order: number;
  lat?: number;
  lng?: number;
};

type PlanItem = {
  id: string;
  text: string;
  status: "todo" | "doing" | "done";
};

type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

type Expense = {
  id: string;
  title: string;
  amount: number;
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-black tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function NavRow({
  href,
  icon,
  title,
  subtitle,
  badge,
  strong = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  strong?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group flex items-center gap-3 rounded-2xl px-3 py-3 ring-1 ring-slate-200/90 hover:bg-white transition",
        strong ? "bg-white/95" : "bg-white/75"
      )}
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-extrabold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</div> : null}
      </div>

      {badge ? (
        <div className="rounded-xl bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          {badge}
        </div>
      ) : null}

      <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600" />
    </Link>
  );
}

function metricLabel(count: number, one: string, few: string, many: string) {
  if (count === 1) return `${count} ${one}`;
  if (count >= 2 && count <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
}

export default function TripHomePage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState("EUR");

  useEffect(() => {
    if (!tripId) return;

    const trips = safeRead<Trip[]>("wandersplit:trips", []);
    const found = trips.find((t) => t.id === tripId) ?? null;
    setTrip(found);

    const readStops = safeRead<Stop[]>(`wandersplit:stops:${tripId}`, []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const readPlan = safeRead<PlanItem[]>(`wandersplit:plan:${tripId}`, []);
    const readChecklist = safeRead<ChecklistItem[]>(`wandersplit:checklist:${tripId}`, []);
    const readExpenses = safeRead<Expense[]>(`wandersplit:expenses:${tripId}`, []);
    const cur = localStorage.getItem(`wandersplit:currency:${tripId}`) || found?.base_currency || "EUR";

    setStops(Array.isArray(readStops) ? readStops : []);
    setPlan(Array.isArray(readPlan) ? readPlan : []);
    setChecklist(Array.isArray(readChecklist) ? readChecklist : []);
    setExpenses(Array.isArray(readExpenses) ? readExpenses : []);
    setCurrency(cur);
  }, [tripId]);

  const planTodo = plan.filter((p) => p.status !== "done").length;
  const checklistLeft = checklist.filter((c) => !c.done).length;
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const firstStops = stops.slice(0, 3).map((s) => s.name).filter(Boolean);
  const routePreview =
    firstStops.length === 0
      ? "Dodaj pierwszy przystanek"
      : firstStops.join(" → ") + (stops.length > 3 ? ` +${stops.length - 3}` : "");

  return (
    <div className="relative pb-28">
        <a
          href="/trips"
          className="fixed-4 top-[max(12px,env(safe-area-inset-top))] z-[9999] inline-flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/5 backdrop-blur"
        >
          ← Wszystkie wycieczki
        </a>

      <TripHeroPro tripId={tripId} section="Trip" />

        <div className="px-4 pt-3">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Wszystkie wycieczki
          </Link>
        </div>

        <div className="px-4 pt-3">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Wszystkie wycieczki
          </Link>
        </div>

      <div className="px-4 pt-4 space-y-6">
        {/* Intro / quick context (jedna lekka karta) */}
        <section className="rounded-2xl bg-white/80 px-4 py-4 ring-1 ring-slate-200/90">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-black text-slate-900">
                {trip?.title || "Twój trip"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {trip?.start_date && trip?.end_date
                  ? `${trip.start_date} → ${trip.end_date}`
                  : "Uzupełnij trasę, plan i budżet przed wyjazdem."}
              </div>
            </div>
            <div className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
              {currency}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <div className="text-xs text-slate-500">Trasa</div>
              <div className="mt-0.5 text-sm font-bold text-slate-900">
                {metricLabel(stops.length, "stop", "stopy", "stopów")}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <div className="text-xs text-slate-500">Plan</div>
              <div className="mt-0.5 text-sm font-bold text-slate-900">
                {metricLabel(planTodo, "zadanie", "zadania", "zadań")}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <div className="text-xs text-slate-500">Checklist</div>
              <div className="mt-0.5 text-sm font-bold text-slate-900">
                {metricLabel(checklistLeft, "rzecz", "rzeczy", "rzeczy")}
              </div>
            </div>
          </div>
        </section>

        {/* Przygotowanie */}
        <section className="space-y-3">
          <SectionHeader
            title="Przygotowanie"
            description="Najważniejsze rzeczy przed wyjazdem — trasa, plan, pakowanie i budżet."
          />

          <div className="space-y-2">
            <NavRow
              href={`/trips/${tripId}/stops`}
              icon={<Map size={18} />}
              title="Trasa i przystanki"
              subtitle={routePreview}
              badge={stops.length ? String(stops.length) : undefined}
              strong
            />
            <NavRow
              href={`/trips/${tripId}/plan`}
              icon={<ListTodo size={18} />}
              title="Plan"
              subtitle={
                plan.length
                  ? `${planTodo} do zrobienia • ${plan.length - planTodo} zamknięte`
                  : "Dodaj zadania, bilety, noclegi, transport"
              }
              badge={plan.length ? String(planTodo) : undefined}
            />
            <NavRow
              href={`/trips/${tripId}/checklist`}
              icon={<CalendarDays size={18} />}
              title="Checklist"
              subtitle={
                checklist.length
                  ? `${checklistLeft} rzeczy do spakowania`
                  : "Dokumenty, ładowarka, ubezpieczenie…"
              }
              badge={checklist.length ? String(checklistLeft) : undefined}
            />
            <NavRow
              href={`/trips/${tripId}/budget`}
              icon={<Wallet size={18} />}
              title="Budżet"
              subtitle={
                expenses.length
                  ? `${expenses.length} wydatków • ${totalExpenses.toFixed(2)} ${currency}`
                  : "Dodaj osoby i pierwszy wydatek"
              }
            />
          </div>
        </section>

        {/* W podróży */}
        <section className="space-y-3">
          <SectionHeader
            title="W podróży"
            description="Szybki dostęp do mapy i pogody podczas wyjazdu."
          />

          <div className="space-y-2">
            <NavRow
              href={`/trips/${tripId}/map`}
              icon={<Map size={18} />}
              title="Mapa"
              subtitle="Duży widok trasy i punktów"
            />
            <NavRow
              href={`/trips/${tripId}/weather`}
              icon={<CloudSun size={18} />}
              title="Pogoda"
              subtitle="Prognoza dla trasy / przystanków"
            />
          </div>
        </section>

        {/* Współdzielenie */}
        <section className="space-y-3">
          <SectionHeader
            title="Współdzielenie"
            description="Zaproś ekipę i udostępnij plan podróży."
          />

          <div className="space-y-2">
            <NavRow
              href={`/trips/${tripId}/invite`}
              icon={<UserPlus size={18} />}
              title="Invite"
              subtitle="Zaproś osoby do wspólnego tripa"
            />
            <NavRow
              href={`/trips/${tripId}/share`}
              icon={<Share2 size={18} />}
              title="Share"
              subtitle="Link współdzielony do tripa"
            />
            <NavRow
              href={`/trips/${tripId}/public`}
              icon={<Globe size={18} />}
              title="Public link"
              subtitle="Publiczny podgląd trasy"
            />
          </div>
        </section>

        {/* Dodatkowe akcje jako linki tekstowe (bez kafli) */}
        <section className="space-y-2 pt-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Dodatkowe akcje
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href={`/trips/${tripId}/export`} className="font-semibold text-indigo-700 hover:text-indigo-800">
              Eksport PDF
            </Link>
            <Link href={`/trips/${tripId}/map`} className="font-semibold text-slate-700 hover:text-slate-900">
              Otwórz mapę
            </Link>
            <Link href={`/trips/${tripId}/budget`} className="font-semibold text-slate-700 hover:text-slate-900">
              Dodaj wydatek
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
