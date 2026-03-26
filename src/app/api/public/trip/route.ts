import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();

  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supaUrl || !service) {
    return NextResponse.json(
      { error: "missing_server_env", hint: "Sprawdź NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY" },
      { status: 400 }
    );
  }

  const supabase = createClient(supaUrl, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const share = await supabase
    .from("trip_public_shares")
    .select("trip_id,is_enabled,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (share.error) return NextResponse.json({ error: share.error.message }, { status: 500 });
  if (!share.data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!share.data.is_enabled) return NextResponse.json({ error: "disabled" }, { status: 404 });
  if (share.data.expires_at && new Date(share.data.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 404 });
  }

  const tripId = share.data.trip_id as string;

  const trip = await supabase
    .from("trips")
    .select("id,title,start_date,end_date,base_currency")
    .eq("id", tripId)
    .single();

  if (trip.error) return NextResponse.json({ error: trip.error.message }, { status: 500 });

  const itinerary = await supabase
    .from("itinerary_items")
    .select("id,day_date,start_time,title,place_name,link,notes,status,sort_order")
    .eq("trip_id", tripId)
    .order("day_date", { ascending: true })
    .order("start_time", { ascending: true })
    .order("sort_order", { ascending: true });

  if (itinerary.error) return NextResponse.json({ error: itinerary.error.message }, { status: 500 });

  const stops = await supabase
    .from("trip_stops")
    .select("id,name,lat,lng,sort_order")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true });

  if (stops.error) return NextResponse.json({ error: stops.error.message }, { status: 500 });

  return NextResponse.json({
    trip: trip.data,
    itinerary: itinerary.data ?? [],
    stops: stops.data ?? [],
  });
}