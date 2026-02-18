"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Trash2 } from "lucide-react";
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

// równo + reszta po 1 cent
function splitCents(total: number, n: number) {
  const base = Math.floor(total / n);
  const rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx(
        "rounded-2xl px-3 py-2 text-xs font-semibold border transition",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-900/10",
        className
      )}
    >
      {children}
    </select>
  );
}

export default function BudgetPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const keyPeople = useMemo(() => `wandersplit:people:${tripId}`, [tripId]);
  const keyExpenses = useMemo(() => `wandersplit:expenses:${tripId}`, [tripId]);
  const keyCurrency = useMemo(() => `wandersplit:currency:${tripId}`, [tripId]);

  const [currency, setCurrency] = useState("EUR");

  const [people, setPeople] = useState<string[]>([]);
  const [newPerson, setNewPerson] = useState("");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // LOAD
  useEffect(() => {
    if (!tripId) return;

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
  }, [tripId, keyPeople, keyExpenses, keyCurrency]);

  // SAVE
  useEffect(() => {
    if (!tripId) return;
    localStorage.setItem(keyCurrency, currency);
  }, [currency, tripId, keyCurrency]);

  useEffect(() => {
    if (!tripId) return;
    localStorage.setItem(keyPeople, JSON.stringify(people));
  }, [people, tripId, keyPeople]);

  useEffect(() => {
    if (!tripId) return;
    localStorage.setItem(keyExpenses, JSON.stringify(expenses));
  }, [expenses, tripId, keyExpenses]);

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
      setMsg("Nie można usunąć osoby użytej w wydatkach. Najpierw usuń/zmień te wydatki.");
      return;
    }
    const next = people.filter((p) => p !== name);
    setPeople(next);
    if (paidBy === name) setPaidBy(next[0] || "");
    setSplitAmong((prev) => prev.filter((p) => p !== name));
    setMsg(null);
  }

  function toggleSplit(name: string) {
    setSplitAmong((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  function addExpense() {
    setMsg(null);
    const t = title.trim();
    if (!t) return setMsg("Podaj nazwę wydatku.");
    const v = Number(amount.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return setMsg("Podaj poprawną kwotę (np. 12.34).");
    if (!paidBy) return setMsg("Wybierz kto zapłacił.");
    if (splitAmong.length === 0) return setMsg("Zaznacz kto dzieli koszt.");

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

  // BALANCES in cents
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

  // SETTLEMENT (kto komu)
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
    let i = 0, j = 0;

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

  const totalSpent = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);

  return (
    <div className="pb-28">
      <TripHeroPro tripId={tripId} section="Budżet" />

      <div className="px-4 space-y-4">
        {/* SETTINGS */}
        <ProCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Uczestnicy i waluta</div>
              <div className="mt-1 text-xs text-slate-500">
                {people.length} {people.length === 1 ? "osoba" : people.length < 5 ? "osoby" : "osób"} · łącznie wydano:{" "}
                <span className="font-semibold text-slate-700">{fmt(totalSpent, currency)}</span>
              </div>
            </div>
            <a
              href={`/trips/${tripId}`}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"
            >
              ← Wróć do tripa
            </a>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-[120px_1fr_auto] gap-3">
              <ProInput
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="EUR"
              />
              <ProInput
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                placeholder="Dodaj osobę (np. Bartek)"
              />
              <ProButton onClick={addPerson}>Dodaj</ProButton>
            </div>

            <div className="flex flex-wrap gap-2">
              {people.map((p) => (
                <div
                  key={p}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() => removePerson(p)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    title="Usuń"
                  >
                    usuń
                  </button>
                </div>
              ))}
            </div>
          </div>
        </ProCard>

        {/* ADD EXPENSE */}
        <ProCard className="p-4">
          <div className="text-sm font-extrabold text-slate-900">Dodaj wydatek</div>
          <div className="mt-1 text-xs text-slate-500">Wpisz nazwę i kwotę, wybierz płacącego i osoby dzielące koszt.</div>

          <div className="mt-4 grid gap-3">
            <ProInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. Kolacja" />

            <div className="grid grid-cols-[1fr_1fr_1fr] gap-3">
              <ProInput
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Kwota (np. 12.34)"
              />

              <Select value={paidBy} onChange={setPaidBy}>
                <option value="" disabled>
                  Zapłacił(a)…
                </option>
                {people.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>

              <ProButton onClick={addExpense} className="w-full">
                Dodaj wydatek
              </ProButton>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-700">Dzielone między</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {people.map((p) => (
                  <Chip key={p} active={splitAmong.includes(p)} onClick={() => toggleSplit(p)}>
                    {p}
                  </Chip>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Tip: w MVP dzielimy koszt równo między zaznaczone osoby (z dokładnością do centów).
              </div>
            </div>

            {msg ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {msg}
              </div>
            ) : null}
          </div>
        </ProCard>

        {/* LIST + SETTLEMENT */}
        <ProCard className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Wydatki</div>
              <div className="mt-1 text-xs text-slate-500">{expenses.length} pozycji</div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {expenses.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
                <div className="text-base font-extrabold text-slate-900">Brak wydatków</div>
                <div className="mt-2 text-sm text-slate-600">Dodaj pierwszy wydatek powyżej.</div>
              </div>
            ) : (
              expenses.map((e) => (
                <div key={e.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 break-words">{e.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {fmt(e.amount, currency)} · zapłacił(a): <span className="font-semibold">{e.paidBy}</span> · dzielone:{" "}
                        {e.splitAmong.join(", ")}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(e.createdAt).toLocaleString("pl-PL")}
                      </div>
                    </div>

                    <button
                      onClick={() => removeExpense(e.id)}
                      className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                      title="Usuń"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="text-sm font-extrabold text-slate-900">Rozliczenie</div>
            <div className="mt-1 text-xs text-slate-500">Kto komu powinien oddać, żeby wyrównać saldo.</div>

            <div className="mt-4 space-y-2">
              {transfers.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  Brak przelewów — wygląda na to, że wszystko jest już równo.
                </div>
              ) : (
                transfers.map((t, idx) => (
                  <div
                    key={idx}
                    className="rounded-3xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
                  >
                    <span className="font-semibold">{t.from}</span> →{" "}
                    <span className="font-semibold">{t.to}</span>{" "}
                    <span className="text-slate-500">({fmt(fromCents(t.cents), currency)})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </ProCard>
      </div>
    </div>
  );
}
