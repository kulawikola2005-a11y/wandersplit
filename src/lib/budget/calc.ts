export type Person = { id: string; name: string };

export type Split = { personId: string; amount: number }; // ile ta osoba ma zapłacić w tym wydatku

export type Expense = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string; // personId
  splits?: Split[]; // jeśli brak => dzielimy po równo po wszystkich osobach
  createdAt?: string;
};

export type PersonSummary = {
  personId: string;
  name: string;
  paid: number;
  owed: number;
  balance: number; // paid - owed
};

export type Transfer = { from: string; to: string; amount: number };

export function calcBalances(people: Person[], expenses: Expense[]) {
  const paid: Record<string, number> = {};
  const owed: Record<string, number> = {};

  for (const p of people) {
    paid[p.id] = 0;
    owed[p.id] = 0;
  }

  for (const e of expenses) {
    if (!paid[e.paidBy]) paid[e.paidBy] = 0;
    paid[e.paidBy] += e.amount;

    const splits = e.splits && e.splits.length
      ? e.splits
      : people.map((p) => ({ personId: p.id, amount: e.amount / Math.max(1, people.length) }));

    for (const s of splits) {
      if (!owed[s.personId]) owed[s.personId] = 0;
      owed[s.personId] += s.amount;
    }
  }

  const summaries: PersonSummary[] = people.map((p) => {
    const pPaid = round2(paid[p.id] || 0);
    const pOwed = round2(owed[p.id] || 0);
    const bal = round2(pPaid - pOwed);
    return { personId: p.id, name: p.name, paid: pPaid, owed: pOwed, balance: bal };
  });

  const transfers = settle(summaries);

  return { summaries, transfers };
}

function settle(summaries: PersonSummary[]): Transfer[] {
  const creditors = summaries
    .filter((s) => s.balance > 0.005)
    .map((s) => ({ id: s.personId, amt: s.balance }))
    .sort((a, b) => b.amt - a.amt);

  const debtors = summaries
    .filter((s) => s.balance < -0.005)
    .map((s) => ({ id: s.personId, amt: -s.balance }))
    .sort((a, b) => b.amt - a.amt);

  const out: Transfer[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const x = Math.min(d.amt, c.amt);

    out.push({ from: d.id, to: c.id, amount: round2(x) });

    d.amt = round2(d.amt - x);
    c.amt = round2(c.amt - x);

    if (d.amt <= 0.005) i++;
    if (c.amt <= 0.005) j++;
  }

  // usuń mikrootańce
  return out.filter((t) => t.amount > 0.009);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
