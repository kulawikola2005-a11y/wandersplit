"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { calcBalances, type Expense, type Person } from "@/lib/budget/calc";
import { exportTripPdf, downloadPdf } from "@/lib/pdf/exportTripPdf";

function readLS(key: string) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function asExpenses(budget: any, currencyFallback: string, people: Person[]): Expense[] {
  const arr = Array.isArray(budget) ? budget : [];

  return arr.map((x: any, idx: number) => {
    // Twoje budżety miały różne pola w MVP – normalizujemy:
    const amount = Number(x.amount ?? x.value ?? 0);
    const title = String(x.title ?? x.name ?? `Expense ${idx + 1}`);
    const currency = String(x.currency ?? currencyFallback ?? "EUR");

    // paid_by: jeśli masz "you" -> mapujemy na pierwszą osobę
    const paidByRaw = String(x.paid_by ?? x.paidBy ?? "you");
    const paidBy =
      people.find((p) => p.id === paidByRaw)?.id ||
      (paidByRaw === "you" ? people[0]?.id : people[0]?.id) ||
      "you";

    return {
      id: String(x.id ?? idx),
      title,
      amount,
      currency,
      paidBy,
      splits: Array.isArray(x.splits) ? x.splits : undefined,
      createdAt: x.createdAt ? String(x.createdAt) : undefined,
    };
  });
}

export default function ExportTripPdfPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const [status, setStatus] = useState<string>("Przygotowuję dane…");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    (async () => {
      try {
        setErr(null);

        // auth gate (żeby RLS było ok, nawet jeśli teraz czytasz localStorage)
        setStatus("Sprawdzam sesję…");
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user) {
          window.location.href = "/login";
          return;
        }

        // Trip info: próbujemy Supabase trips, a jak nie ma, bierzemy z localStorage listy
        setStatus("Pobieram trip info…");
        let trip: any = null;

        const { data: t, error: tErr } = await supabase
          .from("trips")
          .select("id,title,start_date,end_date,base_currency")
          .eq("id", tripId)
          .single();

        if (!tErr && t) trip = t;
        if (!trip) {
          const localTrips = readLS("wandersplit:trips") || [];
          trip = localTrips.find((x: any) => String(x.id) === tripId) || { id: tripId, title: tripId };
        }

        const currency = String(trip.base_currency ?? "EUR");

        // Dane MVP (na teraz): stops/plan/budget z localStorage
        setStatus("Zbieram Plan/Stops/Budżet…");
        const stops = readLS(`wandersplit:stops:${tripId}`) ?? [];
        const plan = readLS(`wandersplit:plan:${tripId}`) ?? [];
        const budget = readLS(`wandersplit:budget:${tripId}`) ?? [];

        // People: na MVP robimy 1 osobę; jak później dodasz członków, podmienisz to na Supabase trip_members
        const people: Person[] = [
          { id: "you", name: u.user.email ?? "You" },
        ];

        const expenses = asExpenses(budget, currency, people);

        setStatus("Licze balance i kto komu ile…");
        const { summaries, transfers } = calcBalances(people, expenses);

        setStatus("Generuję PDF…");
        const bytes = await exportTripPdf({
          trip,
          stops,
          plan,
          expenses,
          summaries,
          transfers,
        });

        setStatus("Pobieram plik…");
        downloadPdf(bytes, `wandersplit-${tripId}.pdf`);

        setStatus("Gotowe ✅ (możesz wrócić)");
      } catch (e: any) {
        setErr(e?.message ?? "Błąd exportu");
        setStatus("Błąd");
      }
    })();
  }, [tripId]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Export PDF</h1>
      <p className="mt-2 text-sm text-gray-600">
        Trip: <span className="font-mono">{tripId}</span>
      </p>

      <div className="mt-6 rounded-2xl border p-4">
        <div className="text-sm">{status}</div>
        {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

        <div className="mt-4 flex gap-2">
          <a className="rounded-xl border px-4 py-2 text-sm" href={`/trips/${tripId}`}>
            ← Wróć do tripa
          </a>
        </div>
      </div>
    </div>
  );
}