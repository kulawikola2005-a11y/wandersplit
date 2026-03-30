"use client";

import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function InvitePage() {
  const params = useParams();
  const tripId = String(params?.tripId || "");

  async function joinTrip() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;

    if (!userId) {
      alert("Musisz być zalogowana");
      return;
    }

    const { error } = await supabase.from("trip_members").insert({
      trip_id: tripId,
      user_id: userId,
    });

    if (error) {
      console.error(error);
      alert("Błąd dołączania");
    } else {
      window.location.href = `/trips/${tripId}`;
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Zaproszenie do tripa</h1>

      <button
        onClick={joinTrip}
        className="border px-4 py-2 rounded-xl"
      >
        Dołącz do tripa
      </button>
    </div>
  );
}