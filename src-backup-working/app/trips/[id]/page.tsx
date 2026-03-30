"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, Wallet, ListTodo, MapPin, ImageIcon, ChevronRight, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getTripCoverUrl } from "@/lib/trips/media";
import { listTripMembers, type TripMember, removeMember } from "@/lib/trips/members";
import { getUserEmail } from "@/lib/trips/users";
import { updateMemberRole } from "@/lib/trips/memberRoles";

type Trip = {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  base_currency?: string | null;
  cover_path?: string | null;
  user_id?: string | null;
};

function NavRow({ href, icon, title, subtitle }: any) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl px-4 py-4 bg-white ring-1 ring-slate-200 hover:bg-slate-50">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
      <ChevronRight size={16} />
    </Link>
  );
}

function initials(value: string) {
  const safe = value.trim();
  if (!safe) return "?";
  const parts = safe.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function TripHomePage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrip() {
      if (!tripId) return;

      setLoading(true);
      setStatus(null);

      const { data: auth } = await supabase.auth.getUser();
      setCurrentUserId(auth?.user?.id || null);

      const { data, error } = await supabase
        .from("trips")
        .select("id, title, start_date, end_date, base_currency, cover_path, user_id")
        .eq("id", tripId)
        .single();

      if (error) {
        console.error("loadTrip error:", error);
        setTrip(null);
        setCoverUrl(null);
        setLoading(false);
        return;
      }

      setTrip(data);

      if (data?.cover_path) {
        try {
          const url = await getTripCoverUrl(data.cover_path);
          setCoverUrl(url);
        } catch (e) {
          console.error(e);
          setCoverUrl(null);
        }
      } else {
        setCoverUrl(null);
      }

      try {
        const loadedMembers = await listTripMembers(tripId);
        setMembers(loadedMembers);

        const map: Record<string, string> = {};
        for (const m of loadedMembers) {
          try {
            map[m.user_id] = await getUserEmail(m.user_id);
          } catch {
            map[m.user_id] = m.user_id;
          }
        }

        if (data?.user_id && !map[data.user_id]) {
          try {
            map[data.user_id] = await getUserEmail(data.user_id);
          } catch {
            map[data.user_id] = data.user_id;
          }
        }

        setEmails(map);
      } catch (e) {
        console.error(e);
        setMembers([]);
      }

      setLoading(false);
    }

    loadTrip();
  }, [tripId]);

  const ownerIsCurrentUser = trip?.user_id === currentUserId;
  const myMember = members.find((m) => m.user_id === currentUserId);
  const myRole = ownerIsCurrentUser ? "owner" : (myMember?.role || "viewer");
  const canManageMembers = myRole === "owner";
  const otherMembers = members.filter((m) => m.user_id !== trip?.user_id);

  function canRemoveMember(member: TripMember) {
    if (!trip || !currentUserId) return false;
    if (ownerIsCurrentUser) return member.user_id !== trip.user_id;
    return member.user_id === currentUserId;
  }

  async function reloadMembers() {
    const updated = await listTripMembers(tripId);
    setMembers(updated);

    const map: Record<string, string> = {};
    for (const m of updated) {
      try {
        map[m.user_id] = await getUserEmail(m.user_id);
      } catch {
        map[m.user_id] = m.user_id;
      }
    }
    if (trip?.user_id && !map[trip.user_id]) {
      try {
        map[trip.user_id] = await getUserEmail(trip.user_id);
      } catch {
        map[trip.user_id] = trip.user_id;
      }
    }
    setEmails(map);
  }

  async function onRemoveMember(memberId: string, isSelf = false) {
    if (!confirm(isSelf ? "Opuścić trip?" : "Usunąć uczestnika?")) return;
    try {
      setStatus(null);
      await removeMember(memberId);

      if (isSelf) {
        window.location.href = "/trips";
        return;
      }

      await reloadMembers();
      setStatus("Zaktualizowano uczestników.");
    } catch (e) {
      console.error(e);
      alert("Błąd usuwania");
    }
  }

  async function onChangeRole(memberId: string, role: "viewer" | "editor") {
    try {
      setStatus(null);
      await updateMemberRole(memberId, role);
      await reloadMembers();
      setStatus("Rola została zmieniona.");
    } catch (e) {
      console.error(e);
      alert("Nie udało się zmienić roli");
    }
  }

  async function onCreateInvite() {
    try {
      setInviteBusy(true);
      setStatus(null);

      const bytes = new Uint8Array(24);
      window.crypto.getRandomValues(bytes);
      const token = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        alert("Musisz być zalogowana");
        return;
      }

      const payload = {
        trip_id: tripId,
        token,
        created_by: authData.user.id,
        role: inviteRole,
        expires_at: expiresAt,
      };

      const { error } = await supabase.from("trip_invites").insert(payload);

      if (error) {
        alert("Błąd insert: " + error.message);
        return;
      }

      const link = `${window.location.origin}/join/${token}`;

      try {
        await navigator.clipboard.writeText(link);
        setStatus(`Link zaproszenia (${inviteRole}) skopiowany.`);
        alert("Link zaproszenia skopiowany!\n\n" + link);
      } catch (copyError) {
        console.error("clipboard error:", copyError);
        prompt("Link utworzony. Skopiuj ręcznie:", link);
      }
    } catch (e) {
      console.error("invite fatal error:", e);
      alert("Błąd tworzenia linku: " + (e instanceof Error ? e.message : JSON.stringify(e)));
    } finally {
      setInviteBusy(false);
    }
  }

  const tripMissing = !loading && !trip;

  return (
    <div className="pb-28 px-4 pt-5">
      <div className="mx-auto max-w-3xl space-y-5">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => window.location.reload()}
            className="border px-3 py-1 rounded-xl text-sm"
          >
            🔄 Odśwież
          </button>

          <button
            onClick={() => { window.location.href = "/trips"; }}
            className="border px-4 py-2 rounded-xl"
          >
            ← Powrót
          </button>

          <div className="flex flex-wrap gap-2">
            {canManageMembers && (
              <>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "viewer" | "editor")}
                  className="border px-3 py-2 rounded-xl bg-white"
                  disabled={inviteBusy}
                >
                  <option value="viewer">viewer invite</option>
                  <option value="editor">editor invite</option>
                </select>

                <button
                  onClick={onCreateInvite}
                  className="border px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={inviteBusy}
                >
                  {inviteBusy ? "Tworzenie..." : "Zaproś znajomych"}
                </button>
              </>
            )}

            <Link href={`/trips/${tripId}/cover`} className="border px-4 py-2 rounded-xl">
              Okładka
            </Link>
          </div>
        </div>

        {status && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {status}
          </div>
        )}

        {tripMissing ? (
          <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
            <div className="text-lg font-bold text-slate-900">Nie udało się otworzyć tripa</div>
            <div className="mt-2 text-sm text-slate-600">
              Trip nie istnieje albo nie masz do niego dostępu.
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
              {coverUrl ? (
                <img src={coverUrl} alt={trip?.title || "Cover"} className="h-56 w-full object-cover" />
              ) : (
                <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-400">
                  Brak okładki
                </div>
              )}

              <div className="p-5">
                <div className="text-sm text-slate-500">WanderSplit</div>
                <div className="text-2xl font-black mt-1">{loading ? "Ładowanie..." : (trip?.title || "Trip")}</div>

                <div className="text-sm text-slate-500 mt-1">
                  {trip?.start_date && trip?.end_date ? `${trip.start_date} → ${trip.end_date}` : "Dodaj daty"}
                </div>

                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="font-semibold">{trip?.base_currency || "EUR"}</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                    {myRole}
                  </span>
                </div>
              </div>
            </div>

            <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <Users size={18} />
                <div className="text-base font-black">Uczestnicy</div>
              </div>

              <div className="mt-4 space-y-2">
                {trip?.user_id ? (
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        {initials(ownerIsCurrentUser ? "Ty" : (emails[trip.user_id] || trip.user_id))}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {ownerIsCurrentUser ? "Ty" : (emails[trip.user_id] || trip.user_id)}
                        </div>
                        <div className="text-xs text-slate-500">
                          właściciel tripa
                        </div>
                      </div>
                    </div>

                    <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      owner
                    </div>
                  </div>
                ) : null}

                {otherMembers.length === 0 ? (
                  <div className="text-sm text-slate-500">Na razie brak innych uczestników.</div>
                ) : (
                  otherMembers.map((member) => {
                    const label = member.user_id === currentUserId ? "Ty" : (emails[member.user_id] || member.user_id);

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                            {initials(label)}
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {label}
                            </div>
                            <div className="text-xs text-slate-500">
                              dołączono: {new Date(member.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canManageMembers && member.user_id !== currentUserId ? (
                            <select
                              value={member.role || "viewer"}
                              onChange={(e) => onChangeRole(member.id, e.target.value as "viewer" | "editor")}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700"
                            >
                              <option value="viewer">viewer</option>
                              <option value="editor">editor</option>
                            </select>
                          ) : (
                            <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                              {member.role || "viewer"}
                            </div>
                          )}

                          {canRemoveMember(member) && (
                            <button
                              onClick={() => onRemoveMember(member.id, member.user_id === currentUserId)}
                              className="rounded-xl border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                              title={member.user_id === currentUserId ? "Opuść trip" : "Usuń uczestnika"}
                            >
                              {member.user_id === currentUserId ? "Opuść" : "Usuń"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <div className="space-y-2">
              <NavRow href={`/trips/${tripId}/stops`} icon={<MapPin size={18} />} title="Stops" subtitle="Trasa podróży" />
              <NavRow href={`/trips/${tripId}/plan`} icon={<ListTodo size={18} />} title="Plan" subtitle="Zadania i organizacja" />
              <NavRow href={`/trips/${tripId}/checklist`} icon={<CalendarDays size={18} />} title="Checklist" subtitle="Pakowanie" />
              <NavRow href={`/trips/${tripId}/budget`} icon={<Wallet size={18} />} title="Budżet" subtitle="Koszty" />
              <NavRow href={`/trips/${tripId}/memories`} icon={<ImageIcon size={18} />} title="Memories" subtitle="Zdjęcia z podróży" />
            </div>
          </>
        )}

      </div>
    </div>
  );
}