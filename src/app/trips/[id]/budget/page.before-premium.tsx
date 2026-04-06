"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Trash2, Wallet, Users, Receipt, ArrowRightLeft } from "lucide-react";
import TripHeroPro from "@/components/trip/TripHeroPro";
import { cx } from "@/components/ui/pro";
import { getMyTripRole, canEditTrip, type TripRole } from "@/lib/trips/roles";

type Expense = {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  createdAt: string;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

function toCents(v: number) {
  return Math.round(v * 100);
}
function fromCents(c: number) {
  return c / 100;
}
function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
function splitCents(total: number, n: number) {
  const base = Math.floor(total / n);
  const rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

export default function BudgetPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);
  if (!tripId) return null;
  return <BudgetInner key={tripId} tripId={tripId} />;
}

function BudgetInner({ tripId }: { tripId: string }) {
  const keyPeople = useMemo(() => `wandersplit:people:${tripId}`, [tripId]);
  const keyExpenses = useMemo(() => `wandersplit:expenses:${tripId}`, [tripId]);
  const keyCurrency = useMemo(() => `wandersplit:currency:${tripId}`, [tripId]);

  const [currency, setCurrency] = useState("EUR");
  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<TripRole>("viewer");

  useEffect(() => {
    getMyTripRole(tripId).then(setMyRole).catch(() => setMyRole("viewer"));

    const cur = localStorage.getItem(keyCurrency);
    if (cur) setCurrency(cur);

    const p = localStorage.getItem(keyPeople);
    if (p) {
      try {
        const arr = JSON.parse(p);
        if (Array.isArray(arr) && arr.length) {
          setPeople(arr);
          setPaidBy(arr[0]);
          setSplitAmong(arr);
        }
      } catch {}
    } else {
      const defaults = ["Ja", "Osoba 2", "Osoba 3"];
      setPeople(defaults);
      setPaidBy(defaults[0]);
      setSplitAmong(defaults);
    }

    const e = localStorage.getItem(keyExpenses);
    if (e) {
      try {
        const arr = JSON.parse(e);
        if (Array.isArray(arr)) setExpenses(arr);
      } catch {}
    }
  }, [keyCurrency, keyPeople, keyExpenses, tripId]);

  const editable = canEditTrip(myRole);

  useEffect(() => {
    localStorage.setItem(keyCurrency, currency);
  }, [currency, keyCurrency]);

  useEffect(() => {
    localStorage.setItem(keyPeople, JSON.stringify(people));
  }, [people, keyPeople]);

  useEffect(() => {
    localStorage.setItem(keyExpenses, JSON.stringify(expenses));
  }, [expenses, keyExpenses]);

  function addPerson() {
    if (!editable) return;
    const name = newPerson.trim();
    if (!name) return;
    if (people.includes(name)) {
      setMsg("Ta osoba już istnieje.");
      return;
    }

    const next = [...people, name];
    setPeople(next);
    setNewPerson("");
    if (!paidBy) setPaidBy(name);
    if (splitAmong.length === 0) setSplitAmong(next);
    setMsg(null);
  }

  function removePerson(name: string) {
    if (!editable) return;
    const used = expenses.some((e) => e.paidBy === name || e.splitAmong.includes(name));
    if (used) {
      setMsg("Nie można usunąć osoby użytej w wydatkach.");
      return;
    }
    const next = people.filter((p) => p !== name);
    setPeople(next);
    if (paidBy === name) setPaidBy(next[0] || "");
    setSplitAmong((prev) => prev.filter((p) => p !== name));
    setMsg(null);
  }

  function toggleSplit(name: string) {
    if (!editable) return;
    setSplitAmong((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function addExpense() {
    if (!editable) return;
    setMsg(null);

    const t = title.trim();
    if (!t) return setMsg("Podaj nazwę wydatku.");

    const v = Number(amount.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return setMsg("Podaj poprawną kwotę.");

    if (!paidBy) return setMsg("Wybierz kto zapłacił.");
    if (splitAmong.length === 0) return setMsg("Zaznacz osoby do podziału.");

    const exp: Expense = {
      id: uid(),
      title: t,
      amount: v,
      paidBy,
      splitAmong: [...splitAmong],
      createdAt: new Date().toISOString(),
    };

    setExpenses((prev) => [exp, ...prev]);
    setTitle("");
    setAmount("");
  }

  function removeExpense(id: string) {
    if (!editable) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  const balancesCents = useMemo(() => {
    const b: Record<string, number> = {};
    for (const p of people) b[p] = 0;

    for (const e of expenses) {
      const total = toCents(e.amount);
      if (!(e.paidBy in b)) continue;

      b[e.paidBy] += total;

      const split = e.splitAmong.filter((p) => p in b);
      if (split.length === 0) continue;

      const parts = splitCents(total, split.length);
      split.forEach((p, i) => {
        b[p] -= parts[i];
      });
    }

    return b;
  }, [people, expenses]);

  const transfers = useMemo(() => {
    const creditors = Object.entries(balancesCents)
      .filter(([, c]) => c > 0)
      .map(([name, c]) => ({ name, c }))
      .sort((a, b) => b.c - a.c);

    const debtors = Object.entries(balancesCents)
      .filter(([, c]) => c < 0)
      .map(([name, c]) => ({ name, c: -c }))
      .sort((a, b) => b.c - a.c);

    const out: { from: string; to: string; cents: number }[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const pay = Math.min(d.c, c.c);

      if (pay > 0) out.push({ from: d.name, to: c.name, cents: pay });

      d.c -= pay;
      c.c -= pay;

      if (d.c === 0) i++;
      if (c.c === 0) j++;
    }

    return out;
  }, [balancesCents]);

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const sortedBalances = useMemo(
    () => Object.entries(balancesCents).sort((a, b) => b[1] - a[1]),
    [balancesCents]
  );

  return (
    <main className="min-h-dvh bg-slate-50 pb-16">
      <TripHeroPro tripId={tripId} section="Budżet" />

      <div className="px-3 pt-5">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-800 px-4 py-5 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <Wallet size={16} />
                Finanse wyjazdu
              </div>
              <h1 className="mt-1 text-xl font-black">Budżet podróży</h1>
              <p className="mt-1 text-sm text-white/75">
                Dodawaj wydatki, dziel koszty i sprawdzaj kto komu oddaje.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 py-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Receipt size={14} />
                  Wydatki
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">{expenses.length}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Wallet size={14} />
                  Suma
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {fmt(totalSpent, currency)}
                </div>
              </div>
            </div>
          </div>

          {!editable && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              Masz dostęp tylko do podglądu. Edycja jest wyłączona dla roli viewer.
            </div>
          )}

          {msg && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {msg}
            </div>
          )}

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users size={16} />
              Osoby i waluta
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="w-24 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="EUR"
              />
              <input
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addPerson();
                }}
                placeholder="Dodaj osobę"
              />
              <button
                onClick={addPerson}
                className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm active:scale-[0.98]"
              >
                Dodaj
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {people.map((p) => (
                <div
                  key={p}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-slate-800">{p}</span>
                  <button
                    onClick={() => removePerson(p)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Dodaj wydatek</div>

            <div className="mt-3 space-y-3">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Np. kolacja, bilety, hotel"
              />

              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Kwota"
                />
                <select
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                >
                  <option value="">Kto zapłacił?</option>
                  {people.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold text-slate-500">Podziel między</div>
                <div className="flex flex-wrap gap-2">
                  {people.map((p) => {
                    const active = splitAmong.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => toggleSplit(p)}
                        className={cx(
                          "rounded-2xl border px-3 py-2 text-sm font-semibold",
                          active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-700"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                onClick={addExpense}
              >
                Dodaj wydatek
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Salda osób</div>

            <div className="mt-3 space-y-3">
              {sortedBalances.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                  Brak danych.
                </div>
              ) : (
                sortedBalances.map(([name, cents]) => {
                  const amountValue = fromCents(Math.abs(cents));
                  const positive = cents > 0;
                  const zero = cents === 0;

                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-3"
                    >
                      <div className="text-sm font-semibold text-slate-900">{name}</div>
                      <div
                        className={cx(
                          "rounded-2xl px-3 py-1.5 text-sm font-bold",
                          zero && "bg-slate-100 text-slate-500",
                          positive && "bg-emerald-50 text-emerald-700",
                          cents < 0 && "bg-rose-50 text-rose-700"
                        )}
                      >
                        {zero ? "0" : positive ? "+" : "-"}
                        {fmt(amountValue, currency)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ArrowRightLeft size={16} />
              Kto komu oddaje
            </div>

            <div className="mt-3 space-y-3">
              {transfers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                  Brak rozliczeń.
                </div>
              ) : (
                transfers.map((t, idx) => (
                  <div
                    key={`${t.from}-${t.to}-${idx}`}
                    className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-3"
                  >
                    <div className="min-w-0 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{t.from}</span>
                      <span className="mx-2 text-slate-400">→</span>
                      <span className="font-semibold text-slate-900">{t.to}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-900">
                      {fmt(fromCents(t.cents), currency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-slate-900">Wydatki</div>

            <div className="mt-3 space-y-3">
              {expenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Brak wydatków. Dodaj pierwszy wydatek powyżej.
                </div>
              ) : (
                expenses.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm font-bold text-slate-900">
                          {e.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Zapłacił(a): <span className="font-semibold text-slate-700">{e.paidBy}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Podział: {e.splitAmong.join(", ")}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="rounded-2xl bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-900">
                          {fmt(e.amount, currency)}
                        </div>
                        <button
                          onClick={() => removeExpense(e.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
