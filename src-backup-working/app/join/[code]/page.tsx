"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AcceptInviteResult = {
  ok: boolean;
  out_trip_id: string | null;
  error_text: string | null;
};

export default function JoinByCodePage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState("Dołączanie do tripa...");

  useEffect(() => {
    async function join() {
      const token = String(params?.code || "");

      if (!token) {
        setStatus("Brak tokenu.");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setStatus("Musisz być zalogowana, żeby dołączyć do tripa.");
        return;
      }

      const user = authData.user;

      const { data, error } = await supabase.rpc("accept_trip_invite", {
        _token: token,
        _user_id: user.id,
      });

      if (error) {
        console.error(error);
        setStatus(error.message || "Nie udało się dołączyć.");
        return;
      }

      const row = Array.isArray(data) ? (data[0] as AcceptInviteResult | undefined) : undefined;

      if (!row?.ok || !row.out_trip_id) {
        setStatus(row?.error_text || "Nie udało się dołączyć.");
        return;
      }

      setStatus("Dołączono. Przekierowuję...");
      router.push(`/trips/${row.out_trip_id}`);
    }

    join();
  }, [params, router]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <div className="text-lg font-bold">WanderSplit</div>
        <div className="mt-3 text-sm text-slate-600">{status}</div>
      </div>
    </div>
  );
}