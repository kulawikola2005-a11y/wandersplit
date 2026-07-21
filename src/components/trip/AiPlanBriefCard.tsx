"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { ProButton, ProCard, ProInput, cx } from "@/components/ui/pro";

type Brief = {
  days: string;
  budget: string;
  style: string;
  pace: string;
  interests: string;
  avoid: string;
};

type PlanItem = {
  id: string;
  text: string;
  status: "todo" | "doing" | "done";
  tag: "transport" | "stay" | "todo" | "tickets" | "other";
  createdAt: string;
};

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
}

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

function safeWrite(key: string, value: unknown) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function parsePlanTextToItems(planText: string): PlanItem[] {
  const lines = planText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const clean = line.replace(/^-+\s*/, "").trim();
    return {
      id: uid(),
      text: clean,
      status: "todo" as const,
      tag: /^day\s+\d+/i.test(clean) ? "other" as const : "todo" as const,
      createdAt: new Date().toISOString(),
    };
  });
}

const STYLE_OPTIONS = [
  { value: "city break", label: "City break" },
  { value: "budget", label: "Budget" },
  { value: "luxury", label: "Luxury" },
  { value: "foodie", label: "Foodie" },
  { value: "adventure", label: "Adventure" },
  { value: "chill", label: "Chill" },
] as const;

const PACE_OPTIONS = [
  { value: "spokojne", label: "Spokojne" },
  { value: "umiarkowane", label: "Umiarkowane" },
  { value: "intensywne", label: "Intensywne" },
] as const;

export default function AiPlanBriefCard({ tripId }: { tripId: string }) {
  const briefKey = useMemo(() => `wandersplit:ai-brief:${tripId}`, [tripId]);
  const planKey = useMemo(() => `wandersplit:plan:${tripId}`, [tripId]);
  const stopsKey = useMemo(() => `wandersplit:stops:${tripId}`, [tripId]);

  const [brief, setBrief] = useState<Brief>({
    days: "",
    budget: "",
    style: "city break",
    pace: "umiarkowane",
    interests: "",
    avoid: "",
  });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = safeRead<Brief | null>(briefKey, null);
    if (saved) setBrief(saved);
  }, [briefKey]);

  useEffect(() => {
    safeWrite(briefKey, brief);
  }, [brief, briefKey]);

  async function generateAiPlan() {
    setMsg(null);
    setBusy(true);

    try {
      const stops = safeRead<any[]>(stopsKey, []);
      const stopNames = stops
        .map((s) => String(s?.name ?? "").trim())
        .filter(Boolean);

      if (stopNames.length === 0) {
        setMsg("Najpierw dodaj przystanki.");
        return;
      }

      const res = await fetch("/api/ai-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stops: stopNames,
          days: brief.days ? Number(brief.days) : undefined,
          brief,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.plan) {
        setMsg(data?.error || "Nie udało się wygenerować planu.");
        return;
      }

      const items = parsePlanTextToItems(data.plan);
      safeWrite(planKey, items);
      setMsg("✨ Wygenerowano plan AI.");
      window.location.reload();
    } catch (e) {
      console.error(e);
      setMsg("Błąd AI.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProCard className="overflow-hidden p-0">
      <div className="bg-[linear-gradient(135deg,#111827_0%,#1f2937_55%,#334155_100%)] px-4 py-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-base font-black tracking-tight">
              <Sparkles size={18} />
              AI planner
            </div>
            <div className="mt-1 text-sm text-white/75">
              Uzupełnij brief, a AI przygotuje plan dopasowany do Twojego budżetu i stylu podróży.
            </div>
          </div>

          <div className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85 backdrop-blur">
            Smart trip
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Ile dni?
            </label>
            <ProInput
              value={brief.days}
              onChange={(e) => setBrief((b) => ({ ...b, days: e.target.value }))}
              placeholder="Np. 5"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Budżet
            </label>
            <ProInput
              value={brief.budget}
              onChange={(e) => setBrief((b) => ({ ...b, budget: e.target.value }))}
              placeholder="Np. niski / 3000 PLN / średni"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Styl podróży
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBrief((b) => ({ ...b, style: opt.value }))}
                className={cx(
                  "rounded-full border px-3 py-2 text-sm font-semibold transition",
                  brief.style === opt.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Tempo
          </label>
          <div className="flex flex-wrap gap-2">
            {PACE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBrief((b) => ({ ...b, pace: opt.value }))}
                className={cx(
                  "rounded-full border px-3 py-2 text-sm font-semibold transition",
                  brief.pace === opt.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Co chcesz zobaczyć?
          </label>
          <textarea
            value={brief.interests}
            onChange={(e) => setBrief((b) => ({ ...b, interests: e.target.value }))}
            placeholder="Np. street food, świątynie, muzea, widoki, anime, shopping"
            className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
          />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Czego unikać?
          </label>
          <textarea
            value={brief.avoid}
            onChange={(e) => setBrief((b) => ({ ...b, avoid: e.target.value }))}
            placeholder="Np. drogie restauracje, długie przejazdy, kluby, trekking"
            className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ProButton onClick={generateAiPlan} disabled={busy}>
            <span className="inline-flex items-center gap-2">
              <Wand2 size={16} />
              {busy ? "Generowanie..." : "✨ Generuj plan AI"}
            </span>
          </ProButton>

          <ProButton
            variant="ghost"
            onClick={() =>
              setBrief({
                days: "",
                budget: "",
                style: "city break",
                pace: "umiarkowane",
                interests: "",
                avoid: "",
              })
            }
          >
            Reset briefu
          </ProButton>
        </div>

        {msg ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {msg}
          </div>
        ) : null}
      </div>
    </ProCard>
  );
}
