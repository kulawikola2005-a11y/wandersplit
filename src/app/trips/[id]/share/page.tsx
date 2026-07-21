"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, Eye, EyeOff, Link2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Share = {
  id: string;
  token: string;
  is_enabled: boolean;
  expires_at: string | null;
  created_at: string;
};

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const [userId, setUserId] = useState<string | null>("demo-user");
  const [shares, setShares] = useState<Share[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expiresDays, setExpiresDays] = useState("30");

  const origin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  );

  const linkOf = (token: string) => `${origin}/share/${encodeURIComponent(token)}`;

  async function load() {
    setMsg(null);

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? "demo-user";
    setUserId(uid);

    if (!uid || !tripId) return;

    const raw = localStorage.getItem(`wandersplit:shares:${tripId}`);
    const localShares = raw ? JSON.parse(raw) : [];
    setShares(Array.isArray(localShares) ? localShares : []);
  }

  useEffect(() => {
    if (!tripId) return;
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function createShare() {
    if (!userId) {
      localStorage.setItem("wandersplit:demoUserId", "demo-user");
      setUserId("demo-user");
      setMsg("Tryb demo: jesteś zalogowana lokalnie.");
      return;
    }

    if (!tripId) {
      setMsg("Brak tripId.");
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      const days = expiresDays.trim() ? Number(expiresDays) : null;
      const expiresAt =
        days && Number.isFinite(days) && days > 0
          ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
          : null;

      const raw = localStorage.getItem(`wandersplit:shares:${tripId}`);
      const current = raw ? JSON.parse(raw) : [];

      const nextShare = {
        id: Date.now().toString(),
        token: `${tripId}-${Date.now()}`,
        is_enabled: true,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      };

      const next = [nextShare, ...(Array.isArray(current) ? current : [])];
      localStorage.setItem(`wandersplit:shares:${tripId}`, JSON.stringify(next));

      setShares(next);
      setMsg("Public link został utworzony lokalnie.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(id: string, current: boolean) {
    setBusy(true);
    setMsg(null);

    try {
      const next = shares.map((share) =>
        share.id === id ? { ...share, is_enabled: !current } : share
      );
      localStorage.setItem(`wandersplit:shares:${tripId}`, JSON.stringify(next));
      setShares(next);
      setMsg(current ? "Link wyłączony." : "Link włączony.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setMsg(null);

    try {
      const next = shares.filter((share) => share.id !== id);
      localStorage.setItem(`wandersplit:shares:${tripId}`, JSON.stringify(next));
      setShares(next);
      setMsg("Link usunięty.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Skopiowano link.");
      setTimeout(() => setMsg(null), 1500);
    } catch {
      setMsg("Nie udało się skopiować — skopiuj ręcznie.");
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "Bez daty wygaśnięcia";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  const primaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60";
  const secondaryBtn =
    "inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60";

  if (!userId) {
    setUserId("demo-user");
    return null;
  }

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="mx-auto max-w-4xl p-4 pb-24 pt-5">
      <Link
        href={`/trips/${tripId}`}
        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
      >
        ← Wróć do tripa
      </Link>

      <div className="mt-4 overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="bg-[linear-gradient(135deg,#1f2937_0%,#111827_55%,#2f3a4f_100%)] px-5 py-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                WanderSplit
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Udostępnij trip</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Stwórz elegancki link read-only, który pokaże plan, przystanki, mapę i pogodę bez logowania.
              </p>
            </div>

            <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm text-white/85 backdrop-blur">
              Aktywnych linków: <span className="font-semibold text-white">{shares.filter((s) => s.is_enabled).length}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-4 py-4 md:grid-cols-3">
          <div className="rounded-[24px] bg-[#F8F8F6] p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              Tryb linku
            </div>
            <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
              Read only
            </div>
          </div>

          <div className="rounded-[24px] bg-[#F4EEE4] p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              Co zobaczy gość
            </div>
            <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
              Plan · mapa · pogoda
            </div>
          </div>

          <div className="rounded-[24px] bg-[#F8F8F6] p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              Prywatność
            </div>
            <div className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
              Budżet ukryty
            </div>
          </div>
        </div>

        {msg ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {msg}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="rounded-[28px] border border-black/5 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Link2 className="h-4 w-4" />
              Utwórz nowy publiczny link
            </div>

            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Idealne do wysłania znajomym lub wrzucenia w wiadomość. Link pokaże tylko najważniejsze elementy podróży.
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Wygasa po dniach
              </label>
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                value={expiresDays}
                onChange={(e) => setExpiresDays(e.target.value)}
                placeholder="Np. 30 lub puste"
              />
              <p className="mt-2 text-xs text-slate-500">
                Zostaw puste, jeśli link ma nie wygasać.
              </p>
            </div>
          </div>

          <div className="flex items-end">
            <button onClick={createShare} disabled={busy} className={primaryBtn}>
              <Plus className="h-4 w-4" />
              {busy ? "Przetwarzanie..." : "Utwórz link"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="text-sm font-semibold text-slate-900">
          Twoje linki
        </div>
        {shares.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <div className="text-base font-semibold text-slate-900">Nie masz jeszcze żadnego publicznego linku</div>
            <p className="mt-2 text-sm text-slate-600">
              Utwórz pierwszy link i wyślij go komuś, żeby zobaczył trip bez logowania.
            </p>
          </div>
        ) : (
          shares.map((s) => (
            <div
              key={s.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                      {s.is_enabled ? "Aktywny" : "Wyłączony"}
                    </div>

                    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                      {formatDate(s.expires_at)}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Publiczny link
                    </div>
                    <a
                      className="mt-2 block break-all rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 underline-offset-4 hover:underline"
                      href={linkOf(s.token)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {linkOf(s.token)}
                    </a>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Token: <span className="font-mono">{s.token}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copy(linkOf(s.token))} disabled={busy} className={secondaryBtn}>
                    <Copy className="h-4 w-4" />
                    Kopiuj
                  </button>

                  <a
                    href={linkOf(s.token)}
                    target="_blank"
                    rel="noreferrer"
                    className={secondaryBtn}
                  >
                    <Eye className="h-4 w-4" />
                    Otwórz
                  </a>

                  <button
                    onClick={() => toggleEnabled(s.id, s.is_enabled)}
                    disabled={busy}
                    className={secondaryBtn}
                  >
                    {s.is_enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {s.is_enabled ? "Wyłącz" : "Włącz"}
                  </button>

                  <button onClick={() => revoke(s.id)} disabled={busy} className={secondaryBtn}>
                    <Trash2 className="h-4 w-4" />
                    Usuń
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        Tip: otwórz link w incognito albo wyślij go komuś innemu — powinien działać bez logowania.
      </div>
      </div>
    </div>
  );
}
