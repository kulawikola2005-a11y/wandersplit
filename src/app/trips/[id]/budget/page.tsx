"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, Wallet, Users, Receipt, ArrowRightLeft } from "lucide-react";
import TripHeroPro from "@/components/trip/TripHeroPro";
import { ProButton, ProCard, ProInput, cx } from "@/components/ui/pro";

type Expense = {
  id: string;
  title: string;
  amount: number; // np. 12.34
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

// równy podział + reszta po 1 cent
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

  // LOAD
  useEffect(() => {
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
  }, [keyCurrency, keyPeople, keyExpenses]);

  // SAVE
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
    const name = newPerson.trim();
    if (!name) return;
    if (people.includes(name)) {
      setMsg("Ta osoba już istnieje.");
      return;
    }

    const next = [name, ...people];
    setPeople(next);
    setNewPerson("");
    if (!paidBy) setPaidBy(name);
    if (splitAmong.length === 0) setSplitAmong(next);
    setMsg(null);
  }

  function removePerson(name: string) {
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
    setSplitAmong((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function addExpense() {
    setMsg(null);

    const t = title.trim();
    if (!t) return setMsg("Podaj nazwę wydatku.");

    const v = Number(amount.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return setMsg("Podaj poprawną kwotę (np. 12.34).");

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
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  // BALANCES w centach
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

  // kto komu
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
    <div className="min-h-dvh bg-slate-50 pb-28">
      <TripHeroPro tripId={tripId} section="Budżet" />

      <div className="px-4 space-y-4">
        {/* Header sekcji */}
        <ProCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-black tracking-tight text-slate-900">Budżet</div>
              <div className="mt-1 text-sm leading-5 text-slate-600">
                Wydatki grupowe i szybkie rozliczenie kto komu oddaje.
              </div>
            </div>
            <a
              href={`/trips/${tripId}`}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Wróć
            </a>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Receipt size={14} /> Wydatki
              </div>
              <div className="mt-1 text-lg font-black text-slate-900">{expenses.length}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Wallet size={14} /> Suma
              </div>
              <div className="mt-1 text-lg font-black text-slate-900">
                {fmt(totalSpent, currency)}
              </div>
            </div>
          </div>
        </ProCard>

        {/* Ustawienia + osoby */}
        <ProCard className="p-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <div className="text-sm font-extrabold text-slate-900">Osoby i waluta</div>
          </div>

          <div className="mt-3 grid grid-cols-[110px_1fr_auto] gap-2">
            <input
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="EUR"
            />
            <input
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addPerson();
              }}
              placeholder="Dodaj osobę"
            />
            <button
              onClick={addPerson}
              className="h-11 rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
              title="Dodaj osobę"
              aria-label="Dodaj osobę"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {people.map((p) => (
              <div
                key={p}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="font-semibold text-slate-800">{p}</span>
                <button
                  onClick={() => removePerson(p)}
                  className="rounded-lg px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  title={`Usuń ${p}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {msg ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {msg}
            </div>
          ) : null}
        </ProCard>

        {/* Dodaj wydatek */}
        <ProCard className="p-4">
          <div className="text-sm font-extrabold text-slate-900">Dodaj wydatek</div>

          <div className="mt-3 space-y-2">
            <ProInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Kolacja, bilety, hotel"
            />

            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Kwota (np. 124.50)"
              />
              <select
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
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
                          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-700"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-1">
              <ProButton className="w-full" onClick={addExpense}>
                Dodaj wydatek
              </ProButton>
            </div>
          </div>
        </ProCard>

        {/* Salda */}
        <ProCard className="p-4">
          <div className="text-sm font-extrabold text-slate-900">Salda osób</div>
          <div className="mt-3 space-y-2">
            {sortedBalances.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
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
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3"
                  >
                    <div className="text-sm font-semibold text-slate-900">{name}</div>
                    <div
                      className={cx(
                        "text-sm font-bold",
                        zero && "text-slate-500",
                        positive && "text-emerald-700",
                        cents < 0 && "text-rose-700"
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
        </ProCard>

        {/* Rozliczenia */}
        <ProCard className="p-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-slate-500" />
            <div className="text-sm font-extrabold text-slate-900">Kto komu oddaje</div>
          </div>

          <div className="mt-3 space-y-2">
            {transfers.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                Brak rozliczeń. Wszystko jest wyrównane albo nie ma wydatków.
              </div>
            ) : (
              transfers.map((t, idx) => (
                <div
                  key={`${t.from}-${t.to}-${idx}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="min-w-0 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{t.from}</span>
                    <span className="mx-2 text-slate-400">→</span>
                    <span className="font-semibold text-slate-900">{t.to}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {fmt(fromCents(t.cents), currency)}
                  </div>
                </div>
              ))
            )}
          </div>
        </ProCard>

        {/* Lista wydatków */}
        <ProCard className="p-4">
          <div className="text-sm font-extrabold text-slate-900">Wydatki</div>

          <div className="mt-3 space-y-2">
            {expenses.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                Brak wydatków. Dodaj pierwszy wydatek powyżej.
              </div>
            ) : (
              expenses.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-slate-900 break-words">
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
                      <div className="text-sm font-black text-slate-900">
                        {fmt(e.amount, currency)}
                      </div>
                      <button
                        onClick={() => removeExpense(e.id)}
                        className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                        title="Usuń wydatek"
                        aria-label="Usuń wydatek"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ProCard>
      </div>
    </div>
  );
}
