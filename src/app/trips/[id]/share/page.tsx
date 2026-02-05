"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Share = {
  id: string;
  token: string;
  is_enabled: boolean;
  expires_at: string | null;
  created_at: string;
};

export default function SharePage({ params }: { params: { id: string } }) {
  const tripId = params.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [expiresDays, setExpiresDays] = useState("30");

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const linkOf = (token: string) => `${origin}/share/${encodeURIComponent(token)}`;

  async function load() {
    setMsg(null);

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);

    if (!uid) return;

    const s = await supabase
      .from("trip_public_shares")
      .select("id,token,is_enabled,expires_at,created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (s.error) setMsg(s.error.message);
    else setShares((s.data ?? []) as Share[]);
  }

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function createShare() {
    if (!userId) {
      window.location.href = `/login?next=${encodeURIComponent(`/trips/${tripId}/share`)}`;
      return;
    }

    setMsg(null);

    const days = expiresDays.trim() ? Number(expiresDays) : null;
    const expiresAt =
      days && Number.isFinite(days) && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const ins = await supabase.from("trip_public_shares").insert({
      trip_id: tripId,
      created_by: userId,
      expires_at: expiresAt,
      is_enabled: true,
    });

    if (ins.error) setMsg(ins.error.message);
    else await load();
  }

  async function toggleEnabled(id: string, current: boolean) {
    setMsg(null);
    const upd = await supabase
      .from("trip_public_shares")
      .update({ is_enabled: !current })
      .eq("id", id);

    if (upd.error) setMsg(upd.error.message);
    else await load();
  }

  async function revoke(id: string) {
    setMsg(null);
    const del = await supabase.from("trip_public_shares").delete().eq("id", id);
    if (del.error) setMsg(del.error.message);
    else await load();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Skopiowano link.");
      setTimeout(() => setMsg(null), 1500);
    } catch {
      setMsg("Nie udało się skopiować (skopiuj ręcznie).");
    }
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm">
          Nie jesteś zalogowana. <a className="underline" href="/login">/login</a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <a className="text-sm underline" href={`/trips/${tripId}`}>← Wróć do tripa</a>

      <h1 className="mt-4 text-2xl font-semibold">Public link (read-only)</h1>
      <p className="mt-1 text-sm text-gray-600">
        Link pokazuje plan + stops + mapę + pogodę bez logowania (bez budżetu).
      </p>

      {msg ? <div className="mt-4 rounded-2xl border p-3 text-sm text-gray-700">{msg}</div> : null}

      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Utwórz link</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-xl border p-3"
            value={expiresDays}
            onChange={(e) => setExpiresDays(e.target.value)}
            placeholder="Wygasa po dniach (np. 30) lub puste"
          />
          <button onClick={createShare} className="rounded-xl bg-black px-4 py-2 text-white">
            Create
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Puste = bez daty wygaśnięcia.</p>
      </div>

      <div className="mt-6 space-y-3">
        {shares.length === 0 ? (
          <p className="text-sm text-gray-600">Brak linków — utwórz pierwszy.</p>
        ) : (
          shares.map((s) => (
            <div key={s.id} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-[240px]">
                  <div className="font-medium">
                    Token: <span className="font-mono">{s.token}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {s.is_enabled ? "enabled" : "disabled"}
                    {s.expires_at ? ` · expires: ${new Date(s.expires_at).toLocaleString()}` : " · no expiry"}
                  </div>
                  <div className="mt-2 text-sm break-all">
                    <a className="underline" href={linkOf(s.token)} target="_blank" rel="noreferrer">
                      {linkOf(s.token)}
                    </a>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => copy(linkOf(s.token))} className="rounded-xl border px-3 py-1 text-sm">
                    copy
                  </button>
                  <button onClick={() => toggleEnabled(s.id, s.is_enabled)} className="rounded-xl border px-3 py-1 text-sm">
                    {s.is_enabled ? "disable" : "enable"}
                  </button>
                  <button onClick={() => revoke(s.id)} className="rounded-xl border px-3 py-1 text-sm">
                    revoke
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
EOFmkdir -p 'src/app/trips/[id]/share'

cat > 'src/app/trips/[id]/share/page.tsx' <<'EOF'
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Share = {
  id: string;
  token: string;
  is_enabled: boolean;
  expires_at: string | null;
  created_at: string;
};

export default function SharePage({ params }: { params: { id: string } }) {
  const tripId = params.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [expiresDays, setExpiresDays] = useState("30");

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);
  const linkOf = (token: string) => `${origin}/share/${encodeURIComponent(token)}`;

  async function load() {
    setMsg(null);

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);

    if (!uid) return;

    const s = await supabase
      .from("trip_public_shares")
      .select("id,token,is_enabled,expires_at,created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (s.error) setMsg(s.error.message);
    else setShares((s.data ?? []) as Share[]);
  }

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function createShare() {
    if (!userId) {
      window.location.href = `/login?next=${encodeURIComponent(`/trips/${tripId}/share`)}`;
      return;
    }

    setMsg(null);

    const days = expiresDays.trim() ? Number(expiresDays) : null;
    const expiresAt =
      days && Number.isFinite(days) && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const ins = await supabase.from("trip_public_shares").insert({
      trip_id: tripId,
      created_by: userId,
      expires_at: expiresAt,
      is_enabled: true,
    });

    if (ins.error) setMsg(ins.error.message);
    else await load();
  }

  async function toggleEnabled(id: string, current: boolean) {
    setMsg(null);
    const upd = await supabase
      .from("trip_public_shares")
      .update({ is_enabled: !current })
      .eq("id", id);

    if (upd.error) setMsg(upd.error.message);
    else await load();
  }

  async function revoke(id: string) {
    setMsg(null);
    const del = await supabase.from("trip_public_shares").delete().eq("id", id);
    if (del.error) setMsg(del.error.message);
    else await load();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Skopiowano link.");
      setTimeout(() => setMsg(null), 1500);
    } catch {
      setMsg("Nie udało się skopiować (skopiuj ręcznie).");
    }
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm">
          Nie jesteś zalogowana. <a className="underline" href="/login">/login</a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <a className="text-sm underline" href={`/trips/${tripId}`}>← Wróć do tripa</a>

      <h1 className="mt-4 text-2xl font-semibold">Public link (read-only)</h1>
      <p className="mt-1 text-sm text-gray-600">
        Link pokazuje plan + stops + mapę + pogodę bez logowania (bez budżetu).
      </p>

      {msg ? <div className="mt-4 rounded-2xl border p-3 text-sm text-gray-700">{msg}</div> : null}

      <div className="mt-6 rounded-2xl border p-4">
        <h2 className="font-medium">Utwórz link</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-xl border p-3"
            value={expiresDays}
            onChange={(e) => setExpiresDays(e.target.value)}
            placeholder="Wygasa po dniach (np. 30) lub puste"
          />
          <button onClick={createShare} className="rounded-xl bg-black px-4 py-2 text-white">
            Create
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Puste = bez daty wygaśnięcia.</p>
      </div>

      <div className="mt-6 space-y-3">
        {shares.length === 0 ? (
          <p className="text-sm text-gray-600">Brak linków — utwórz pierwszy.</p>
        ) : (
          shares.map((s) => (
            <div key={s.id} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-[240px]">
                  <div className="font-medium">
                    Token: <span className="font-mono">{s.token}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {s.is_enabled ? "enabled" : "disabled"}
                    {s.expires_at ? ` · expires: ${new Date(s.expires_at).toLocaleString()}` : " · no expiry"}
                  </div>
                  <div className="mt-2 text-sm break-all">
                    <a className="underline" href={linkOf(s.token)} target="_blank" rel="noreferrer">
                      {linkOf(s.token)}
                    </a>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => copy(linkOf(s.token))} className="rounded-xl border px-3 py-1 text-sm">
                    copy
                  </button>
                  <button onClick={() => toggleEnabled(s.id, s.is_enabled)} className="rounded-xl border px-3 py-1 text-sm">
                    {s.is_enabled ? "disable" : "enable"}
                  </button>
                  <button onClick={() => revoke(s.id)} className="rounded-xl border px-3 py-1 text-sm">
                    revoke
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
