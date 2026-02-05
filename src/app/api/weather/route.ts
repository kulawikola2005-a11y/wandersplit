import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "bad_params" }, { status: 400 });
  }

  const apiUrl =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(String(lat))}` +
    `&longitude=${encodeURIComponent(String(lng))}` +
    "&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=auto";

  const r = await fetch(apiUrl, { cache: "no-store" });
  if (!r.ok) {
    return NextResponse.json({ error: "weather_failed" }, { status: 500 });
  }

  const json = await r.json();
  return NextResponse.json(json);
}
