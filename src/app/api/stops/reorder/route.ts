import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY; // opcjonalnie (jeśli nie chcesz, dajemy update z klienta)

  // Jeśli nie masz service key, zwróć błąd z jasnym opisem
  if (!service) {
    return NextResponse.json(
      { error: "missing_SUPABASE_SERVICE_ROLE_KEY", hint: "Dodaj SUPABASE_SERVICE_ROLE_KEY do .env.local albo zrób update z klienta." },
      { status: 400 }
    );
  }

  const body = (await req.json()) as { tripId: string; orderedStopIds: string[] };

  if (!body?.tripId || !Array.isArray(body.orderedStopIds)) {
    return NextResponse.json({ error: "bad_body" }, { status: 400 });
  }

  const supabase = createClient(url, service);

  // update każdy stop sort_order = index
  // robię to sekwencyjnie dla czytelności (MVP)
  for (let i = 0; i < body.orderedStopIds.length; i++) {
    const id = body.orderedStopIds[i];
    const { error } = await supabase
      .from("trip_stops")
      .update({ sort_order: i })
      .eq("id", id)
      .eq("trip_id", body.tripId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
