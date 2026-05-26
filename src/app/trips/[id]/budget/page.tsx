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
  const [hydrated, setHydrated] = useState(false);

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

    setHydrated(true);
  }, [keyCurrency, keyPeople, keyExpenses, tripId]);

  // MVP / portfolio mode: local Android app should stay editable.
  const editable = true;

  useEffect(() => {
    localStorage.setItem(keyCurrency, currency);
  }, [currency, keyCurrency]);

  useEffect(() => {
    localStorage.setItem(keyPeople, JSON.stringify(people));
  }, [people, keyPeople]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(keyExpenses, JSON.stringify(expenses));
  }, [expenses, keyExpenses, hydrated]);

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
    <main className="min-h-dvh bg-[linear-gradient(180deg,#f6f1ff_0%,#fbfaf8_42%,#ffffff_100%)] pb-32">
      <div className="mx-auto max-w-xl px-4 pt-7 space-y-7">
        <header>
          <div className="text-[34px] font-black tracking-[-0.04em] text-slate-950">
            Budget
          </div>
          <p className="mt-2 text-[15px] font-medium leading-6 text-slate-500">
            Track trip spending, split costs and see who paid what.
          </p>
        </header>

        <section className="relative overflow-hidden rounded-[42px] bg-[linear-gradient(135deg,#1e1b4b_0%,#4c1d95_48%,#8b5cf6_100%)] p-7 text-white shadow-[0_32px_90px_rgba(76,29,149,0.36)]">
          <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/12 blur-3xl" />
          <div className="absolute -bottom-10 left-8 h-36 w-36 rounded-full bg-fuchsia-300/20 blur-3xl" />

          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">
              Total spent
            </div>

            <div className="mt-4 text-[52px] font-black leading-none tracking-[-0.06em]">
              {fmt(totalSpent, currency)}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[28px] border border-white/10 bg-white/12 p-4 backdrop-blur-xl">
                <div className="text-xs font-semibold text-white/60">People</div>
                <div className="mt-1 text-2xl font-black">{people.length}</div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/12 p-4 backdrop-blur-xl">
                <div className="text-xs font-semibold text-white/60">Expenses</div>
                <div className="mt-1 text-2xl font-black">{expenses.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-violet-100/70 bg-white/90 p-2 shadow-[0_20px_50px_rgba(124,58,237,0.10)] backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["expenses", "Wydatki"],
              ["balances", "Salda"],
              ["settlements", "Split"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as "expenses" | "balances" | "settlements")}
                className={cx(
                  "rounded-[24px] px-3 py-4 text-sm font-black transition",
                  activeTab === key
                    ? "bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] text-white shadow-[0_14px_34px_rgba(124,58,237,0.24)]"
                    : "text-slate-500"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-[34px] border border-violet-100/60 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <div className="text-2xl">💳</div>
            <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Top payer
            </div>
            <div className="mt-2 truncate text-lg font-black text-slate-950">
              {topSpender?.name || "—"}
            </div>
          </div>

          <div className="rounded-[34px] border border-violet-100/60 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <div className="text-2xl">👥</div>
            <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Owes most
            </div>
            <div className="mt-2 truncate text-lg font-black text-slate-950">
              {biggestDebtor?.[0] || "—"}
            </div>
          </div>
        </section>

        <section className="rounded-[38px] border border-violet-100/70 bg-white p-5 shadow-[0_24px_70px_rgba(124,58,237,0.10)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-black tracking-tight text-slate-950">
                People & currency
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Add travelers and choose currency.
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <input
              className="w-24 rounded-[24px] border border-violet-100 bg-violet-50/40 px-4 py-4 text-sm font-black text-slate-900 outline-none"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="EUR"
            />
            <input
              className="min-w-0 flex-1 rounded-[24px] border border-violet-100 bg-violet-50/40 px-4 py-4 text-sm font-bold text-slate-900 outline-none"
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addPerson();
              }}
              placeholder="Dodaj osobę"
            />
            <button
              onClick={addPerson}
              className="rounded-[24px] bg-slate-950 px-4 py-4 text-sm font-black text-white"
            >
              +
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {people.map((p) => (
              <div
                key={p}
                className="relative shrink-0 rounded-full border border-violet-100 bg-white pl-4 pr-10 py-2 text-sm font-bold text-slate-700 shadow-sm"
              >
                {p}

                <button
                  type="button"
                  onClick={() => removePerson(p)}
                  className="absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-rose-50 text-[11px] font-black text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
                  aria-label={`Usuń ${p}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {activeTab === "expenses" && (
          <>
            <section className="rounded-[40px] border border-violet-100/70 bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] p-6 shadow-[0_28px_80px_rgba(124,58,237,0.12)]">
              <h2 className="text-[28px] font-black tracking-tight text-slate-950">
                Add expense
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Quick add a cost and split it with your group.
              </p>

              <div className="mt-6 space-y-4">
                <input
                  className="w-full rounded-[30px] border border-violet-100 bg-white px-5 py-5 text-[16px] font-bold text-slate-950 outline-none shadow-[0_12px_34px_rgba(124,58,237,0.07)]"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Np. hotel, kolacja, bilety"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="rounded-[30px] border border-violet-100 bg-white px-5 py-5 text-[16px] font-bold text-slate-950 outline-none shadow-[0_12px_34px_rgba(124,58,237,0.07)]"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="Kwota"
                  />
                  <div className="rounded-[30px] border border-violet-100 bg-white px-5 py-5 text-[16px] font-bold text-slate-700 shadow-[0_12px_34px_rgba(124,58,237,0.07)]">
                    {paidBy || "Kto zapłacił?"}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Paid by
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {people.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPaidBy(p)}
                        className={cx(
                          "shrink-0 rounded-full px-4 py-3 text-sm font-black",
                          paidBy === p
                            ? "bg-violet-600 text-white shadow-[0_12px_28px_rgba(124,58,237,0.22)]"
                            : "border border-violet-100 bg-white text-slate-600"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Split with
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {people.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleSplit(p)}
                        className={cx(
                          "shrink-0 rounded-full px-4 py-3 text-sm font-black",
                          splitAmong.includes(p)
                            ? "bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.20)]"
                            : "border border-violet-100 bg-white text-slate-600"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={addExpense}
                  className="w-full rounded-[30px] bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_60%,#8b5cf6_100%)] px-5 py-5 text-[15px] font-black text-white shadow-[0_24px_60px_rgba(124,58,237,0.32)] active:scale-[0.98]"
                >
                  Dodaj wydatek
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-[24px] font-black tracking-tight text-slate-950">
                    Recent expenses
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Latest costs from this trip.
                  </p>
                </div>
              </div>

              {expenses.length === 0 ? (
                <div className="rounded-[34px] border border-dashed border-violet-200 bg-white/80 px-5 py-8 text-center text-sm font-semibold text-slate-500">
                  Brak wydatków.
                </div>
              ) : (
                expenses.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-[34px] border border-violet-100/70 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[17px] font-black tracking-tight text-slate-950">
                          {e.title}
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-500">
                          Paid by <span className="font-bold text-slate-700">{e.paidBy}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Split: {e.splitAmong.join(", ")}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <div className="rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
                          {fmt(e.amount, currency)}
                        </div>
                        <button
                          onClick={() => removeExpense(e.id)}
                          className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-50 text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {activeTab === "balances" && (
          <section className="rounded-[38px] border border-violet-100/70 bg-white p-5 shadow-[0_24px_70px_rgba(124,58,237,0.10)]">
            <h2 className="text-[24px] font-black tracking-tight text-slate-950">
              Group balances
            </h2>

            <div className="mt-5 space-y-3">
              {sortedBalances.map(([name, cents]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-[30px] border border-violet-100/60 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
                >
                  <div className="font-black text-slate-900">{name}</div>
                  <div
                    className={cx(
                      "rounded-full px-4 py-2 text-sm font-black",
                      cents === 0 && "bg-slate-100 text-slate-500",
                      cents > 0 && "bg-emerald-50 text-emerald-700",
                      cents < 0 && "bg-rose-50 text-rose-700"
                    )}
                  >
                    {cents === 0 ? "0" : cents > 0 ? "+" : "-"}
                    {fmt(fromCents(Math.abs(cents)), currency)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "settlements" && (
          <section className="rounded-[38px] border border-violet-100/70 bg-white p-5 shadow-[0_24px_70px_rgba(124,58,237,0.10)]">
            <h2 className="text-[24px] font-black tracking-tight text-slate-950">
              Settlements
            </h2>

            <div className="mt-5 space-y-3">
              {transfers.length === 0 ? (
                <div className="rounded-[30px] border border-dashed border-violet-200 bg-violet-50/40 px-5 py-8 text-center text-sm font-semibold text-slate-500">
                  Brak rozliczeń.
                </div>
              ) : (
                transfers.map((t, idx) => (
                  <div
                    key={`${t.from}-${t.to}-${idx}`}
                    className="flex items-center justify-between rounded-[30px] border border-violet-100/60 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
                  >
                    <div className="min-w-0 text-sm text-slate-600">
                      <span className="font-black text-slate-950">{t.from}</span>
                      <span className="mx-2 text-slate-400">→</span>
                      <span className="font-black text-slate-950">{t.to}</span>
                    </div>
                    <div className="rounded-full bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
                      {fmt(fromCents(t.cents), currency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
