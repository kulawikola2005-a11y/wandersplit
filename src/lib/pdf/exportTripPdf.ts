import { PDFDocument, StandardFonts } from "pdf-lib";
import type { Expense, PersonSummary, Transfer } from "@/lib/budget/calc";

type TripInfo = {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  base_currency?: string;
};

type Stop = { name: string; countryCode?: string; sort_order?: number };
type PlanItem = { text: string; status?: string };

function stripPL(s: string) {
  // PDF standard font (WinAnsi) doesn't support many Unicode chars.
  // Normalize to safe ASCII (also removes Polish diacritics).
  const mapped = (s || "")
    // Polish diacritics
    .replaceAll("ą","a").replaceAll("ć","c").replaceAll("ę","e")
    .replaceAll("ł","l").replaceAll("ń","n").replaceAll("ó","o")
    .replaceAll("ś","s").replaceAll("ż","z").replaceAll("ź","z")
    .replaceAll("Ą","A").replaceAll("Ć","C").replaceAll("Ę","E")
    .replaceAll("Ł","L").replaceAll("Ń","N").replaceAll("Ó","O")
    .replaceAll("Ś","S").replaceAll("Ż","Z").replaceAll("Ź","Z")
    // common unicode -> ascii
    .replaceAll("→","->").replaceAll("←","<-")
    .replaceAll("—","-").replaceAll("–","-")
    .replaceAll("…","...")
    .replaceAll("“","\"").replaceAll("”","\"")
    .replaceAll("’","'");

  // keep only printable ASCII + newline
  let out = "";
  for (const ch of mapped) {
    const c = ch.charCodeAt(0);
    if (ch === "\n") out += "\n";
    else if (c >= 32 && c <= 126) out += ch;
    else out += " ";
  }
  return out;

}

function fmt(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export async function exportTripPdf(args: {
  trip: TripInfo;
  stops: Stop[];
  plan: PlanItem[];
  expenses: Expense[];
  summaries: PersonSummary[];
  transfers: Transfer[];
}) {
  const { trip, stops, plan, expenses, summaries, transfers } = args;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const A4 = { w: 595.28, h: 841.89 };
  const margin = 48;

  let page = pdfDoc.addPage([A4.w, A4.h]);
  let y = A4.h - margin;

  const newPage = () => {
    page = pdfDoc.addPage([A4.w, A4.h]);
    y = A4.h - margin;
  };

  const ensure = (need: number) => {
    if (y - need < margin) newPage();
  };

  const line = (text: string, size = 11, bold = false) => {
    ensure(size + 10);
    page.drawText(stripPL(text), {
      x: margin,
      y: y,
      size,
      font: bold ? fontB : font,
    });
    y -= size + 6;
  };

  const hr = () => {
    ensure(20);
    page.drawText("------------------------------------------------------------", {
      x: margin,
      y: y,
      size: 10,
      font,
    });
    y -= 16;
  };

  // Title
  line("WanderSplit — Trip export", 18, true);
  line(`Trip: ${trip.title || trip.id}`, 12, true);
  line(`Dates: ${trip.start_date || "-"} → ${trip.end_date || "-"}`);
  line(`Currency: ${trip.base_currency || "-"}`);
  hr();

  // Stops
  line("Stops", 14, true);
  const orderedStops = (stops || [])
    .slice()
    .sort((a, b) => (Number(a.sort_order ?? 9999) - Number(b.sort_order ?? 9999)));

  if (!orderedStops.length) line("— (no stops)");
  orderedStops.forEach((s, i) => {
    line(`${i + 1}. ${s.name}${s.countryCode ? ` (${s.countryCode})` : ""}`);
  });
  hr();

  // Plan
  line("Plan", 14, true);
  if (!(plan || []).length) line("— (no plan items)");
  (plan || []).forEach((p, i) => {
    const st = p.status ? ` [${p.status}]` : "";
    line(`${i + 1}. ${p.text}${st}`);
  });
  hr();

  // Budget summary
  line("Budget — per person", 14, true);
  if (!(summaries || []).length) line("— (no people / summary)");
  else {
    line("Name | Paid | Owed | Balance", 11, true);
    (summaries || []).forEach((s) => {
      line(`${s.name} | ${fmt(s.paid)} | ${fmt(s.owed)} | ${fmt(s.balance)}`);
    });
  }

  y -= 6;

  // Transfers
  line("Kto komu ile (settlements)", 14, true);
  if (!(transfers || []).length) line("— (nothing to settle)");
  else {
    const nameById: Record<string, string> = {};
    for (const s of summaries) nameById[s.personId] = s.name;

    transfers.forEach((t, i) => {
      const from = nameById[t.from] || t.from;
      const to = nameById[t.to] || t.to;
      line(`${i + 1}. ${from} → ${to}: ${fmt(t.amount)} ${trip.base_currency || ""}`);
    });
  }
  hr();

  // Expenses list
  line("Expenses list", 14, true);
  if (!(expenses || []).length) line("— (no expenses)");
  else {
    expenses.forEach((e, i) => {
      ensure(30);
      line(`${i + 1}. ${e.title} — ${fmt(e.amount)} ${e.currency}`);
      line(`   paid_by: ${e.paidBy}${e.createdAt ? ` · ${e.createdAt}` : ""}`, 10);
    });
  }

  const bytes = await pdfDoc.save();
  return bytes;
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
