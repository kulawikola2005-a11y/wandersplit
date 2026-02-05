import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const apiUrl =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(q)}` +
    "&count=8&language=en&format=json";

  const r = await fetch(apiUrl, { cache: "no-store" });
  if (!r.ok) {
    return NextResponse.json({ error: "geocode_failed" }, { status: 500 });
  }

  const json = await r.json();
  return NextResponse.json({ results: json.results ?? [] });
}
