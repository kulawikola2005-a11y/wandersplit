"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trash2, Wallet, Users, Receipt, ArrowRightLeft } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "settlements">("expenses");
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

  
  const spendingByPerson = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of people) map[p] = 0;

    for (const e of expenses) {
      if (map[e.paidBy] !== undefined) {
        map[e.paidBy] += e.amount;
      }
    }

    const total = Object.values(map).reduce((sum, value) => sum + value, 0);

    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, people]);

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  
  const topSpender = spendingByPerson[0];

  const biggestDebtor = Object.entries(balancesCents)
    .filter(([, v]) => v < 0)
    .sort((a, b) => a[1] - b[1])[0];

  const sortedBalances = useMemo(
    () => Object.entries(balancesCents).sort((a, b) => b[1] - a[1]),
    [balancesCents]
  );

  return (
    <main className="min-h-dvh bg-[#F7F7F3] pb-28">
      <div className="px-4 pt-4">
        <div className="mx-auto max-w-xl">
          <div className="rounded-[32px] bg-gradient-to-br from-black via-neutral-900 to-neutral-800 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="text-xs uppercase tracking-wide text-white/60">
              Podsumowanie
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {fmt(totalSpent, currency)}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-white/60">Osób</div>
                <div className="mt-1 text-lg font-semibold">{people.length}</div>
              </div>

              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-white/60">Wydatków</div>
                <div className="mt-1 text-lg font-semibold">{expenses.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5">
        <div className="mx-auto max-w-xl space-y-4">

          <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div className="text-sm font-semibold text-neutral-900">
              Kto ile zapłacił
          <section className="rounded-[28px] border border-black/5 bg-[#F4EEE4] p-4">
            <div className="text-sm font-semibold text-neutral-900">
              💡 Insight
            </div>

            <div className="mt-2 text-sm text-neutral-700 space-y-1">
              {topSpender && (
                <div>
                  Najwięcej wydała:{" "}
                  <span className="font-semibold">
                    {topSpender.name}
                  </span>
                </div>
              )}

              {biggestDebtor && (
                <div>
                  Najwięcej do oddania ma:{" "}
                  <span className="font-semibold">
                    {biggestDebtor[0]}
                  </span>
                </div>
              )}
            </div>
          </section>

            </div>

            <div className="mt-4 space-y-3">
              {spendingByPerson.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-800">{p.name}</span>
                    <span className="text-neutral-500">
                      {p.value.toFixed(2)} {currency}
                    </span>
                  </div>

                  <div className="mt-1 h-2 w-full rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-neutral-900 transition-all"
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="bg-[linear-gradient(135deg,#1f2937_0%,#111827_55%,#2f3a4f_100%)] px-5 py-6 text-white">
              <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                <Wallet size={16} />
                Finanse wyjazdu
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Budżet podróży</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/75">
                Dodawaj wydatki, dziel koszty i sprawdzaj kto komu oddaje.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 py-4">
              <div className="rounded-[24px] bg-[#F8F8F6] p-4">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  <Receipt size={14} />
                  Wydatki
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                  {expenses.length}
                </div>
              </div>

              <div className="rounded-[24px] bg-[#F4EEE4] p-4">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  <Wallet size={14} />
                  Suma
                </div>
                <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
                  {fmt(totalSpent, currency)}
                </div>
              </div>
            </div>
          </section>

          {!editable && (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Masz dostęp tylko do podglądu. Edycja jest wyłączona dla roli viewer.
            </div>
          )}

          {msg && (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {msg}
            </div>
          )}

          <div className="rounded-[26px] border border-black/5 bg-white/90 p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setActiveTab("expenses")}
                className={cx(
                  "rounded-[20px] px-3 py-3 text-sm font-semibold transition",
                  activeTab === "expenses"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500"
                )}
              >
                Wydatki
              </button>

              <button
                onClick={() => setActiveTab("balances")}
                className={cx(
                  "rounded-[20px] px-3 py-3 text-sm font-semibold transition",
                  activeTab === "balances"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500"
                )}
              >
                Salda
              </button>

              <button
                onClick={() => setActiveTab("settlements")}
                className={cx(
                  "rounded-[18px] px-3 py-2.5 text-sm font-semibold transition",
                  activeTab === "settlements"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500"
                )}
              >
                Rozliczenia
              </button>
            </div>
          </div>

          <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Users size={16} />
              Osoby i waluta
            </div>
            <div className="mt-1 text-sm text-neutral-500">
              Zarządzaj walutą wyjazdu i uczestnikami wspólnego budżetu.
            </div>

            <div className="mt-4 flex gap-2">
              <input
                className="w-24 rounded-2xl border border-black/5 bg-[#f8fafc] px-3 py-3 text-sm outline-none transition focus:bg-white"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="EUR"
              />
              <input
                className="min-w-0 flex-1 rounded-2xl border border-black/5 bg-[#f8fafc] px-3 py-3 text-sm outline-none transition focus:bg-white"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addPerson();
                }}
                placeholder="Dodaj osobę"
              />
              <button
                onClick={addPerson}
                className="shrink-0 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white active:scale-[0.98]"
              >
                Dodaj
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {people.map((p) => (
                <div
                  key={p}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-[#f8fafc] px-3 py-2 text-sm shadow-sm"
                >
                  <span className="font-semibold text-neutral-800">{p}</span>
                  <button
                    onClick={() => removePerson(p)}
                    className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {activeTab === "expenses" && (
          <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <div className="text-sm font-semibold text-neutral-900">Dodaj wydatek</div>
            <div className="mt-1 text-sm text-neutral-500">
              Dodaj nowy koszt podróży i od razu podziel go między uczestników.
            </div>

            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-2xl border border-black/5 bg-[#f8fafc] px-4 py-3 text-sm outline-none transition focus:bg-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Np. kolacja, bilety, hotel"
              />

              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-2xl border border-black/5 bg-[#f8fafc] px-4 py-3 text-sm outline-none transition focus:bg-white"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Kwota"
                />
                <select
                  className="min-w-0 flex-1 rounded-2xl border border-black/5 bg-[#f8fafc] px-4 py-3 text-sm outline-none transition focus:bg-white"
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
                <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Podziel między
                </div>
                <div className="flex flex-wrap gap-2">
                  {people.map((p) => {
                    const active = splitAmong.includes(p);
                    return (
                      <button
                        key={p}
                        onClick={() => toggleSplit(p)}
                        className={cx(
                          "rounded-2xl border px-3 py-2.5 text-sm font-semibold transition shadow-sm",
                          active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-black/5 bg-white text-neutral-700"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                className="w-full rounded-2xl bg-neutral-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm"
                onClick={addExpense}
              >
                Dodaj wydatek
              </button>
            </div>
          </section>
          )}

          {activeTab === "balances" && (
          <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div className="text-sm font-semibold text-neutral-900">Salda osób</div>

            <div className="mt-4 space-y-3">
              {sortedBalances.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-neutral-300 bg-[#F8F8F6] px-4 py-5 text-center text-sm text-neutral-500">
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
                      className="flex items-center justify-between rounded-[24px] border border-black/5 bg-white p-3"
                    >
                      <div className="text-sm font-semibold text-neutral-900">{name}</div>
                      <div
                        className={cx(
                          "rounded-2xl px-3 py-1.5 text-sm font-semibold",
                          zero && "bg-neutral-100 text-neutral-500",
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
          )}

          {activeTab === "settlements" && (
          <section className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <ArrowRightLeft size={16} />
              Kto komu oddaje
            </div>

            <div className="mt-4 space-y-3">
              {transfers.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-neutral-300 bg-[#F8F8F6] px-4 py-5 text-center text-sm text-neutral-500">
                  Brak rozliczeń.
                </div>
              ) : (
                transfers.map((t, idx) => (
                  <div
                    key={`${t.from}-${t.to}-${idx}`}
                    className="flex items-center justify-between rounded-[24px] border border-black/5 bg-white p-3"
                  >
                    <div className="min-w-0 text-sm text-neutral-700">
                      <span className="font-semibold text-neutral-900">{t.from}</span>
                      <span className="mx-2 text-neutral-400">→</span>
                      <span className="font-semibold text-neutral-900">{t.to}</span>
                    </div>
                    <div className="rounded-2xl bg-[#F4EEE4] px-3 py-1.5 text-sm font-semibold text-neutral-900">
                      {fmt(fromCents(t.cents), currency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          )}

          {activeTab === "expenses" && (
          <section className="rounded-[30px] border border-black/5 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <div className="text-sm font-semibold text-neutral-900">Wydatki</div>
            <div className="mt-1 text-sm text-neutral-500">
              Lista wszystkich dodanych kosztów podróży.
            </div>

            <div className="mt-4 space-y-3">
              {expenses.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-neutral-300 bg-[#F8F8F6] px-4 py-6 text-center text-sm text-neutral-500">
                  Brak wydatków. Dodaj pierwszy wydatek powyżej.
                </div>
              ) : (
                expenses.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-[26px] border border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm font-semibold text-neutral-900">
                          {e.title}
                        </div>
                        <div className="mt-2 text-xs text-neutral-500">
                          Zapłacił(a):{" "}
                          <span className="font-semibold text-neutral-700">{e.paidBy}</span>
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">
                          Podział: {e.splitAmong.join(", ")}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="rounded-2xl bg-[#f5f7fb] px-3 py-1.5 text-sm font-semibold text-neutral-900">
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
          )}
        </div>
      </div>

    </main>
  );
}
