import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_PROFILES = new Set(["driving-car", "foot-walking", "cycling-regular"]);

export async function POST(req: Request) {
  const key = process.env.ORS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Brak ORS_API_KEY w .env.local" }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Niepoprawny JSON" }, { status: 400 });
  }

  const profile = String(body?.profile || "driving-car");
  if (!ALLOWED_PROFILES.has(profile)) {
    return NextResponse.json({ error: "Niepoprawny profile" }, { status: 400 });
  }

  const coordinates = body?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return NextResponse.json(
      { error: "Podaj coordinates: [[lng,lat],[lng,lat],...] (min 2 punkty)" },
      { status: 400 }
    );
  }

  for (const c of coordinates) {
    if (!Array.isArray(c) || c.length !== 2) {
      return NextResponse.json({ error: "Zły format coordinates" }, { status: 400 });
    }
    const [lng, lat] = c;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return NextResponse.json({ error: "Coordinates muszą być liczbami" }, { status: 400 });
    }
  }

  const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

  const orsRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
      Accept: "application/geo+json, application/json",
    },
    body: JSON.stringify({ coordinates }),
  });

  const data = await orsRes.json().catch(() => null);

  if (!orsRes.ok) {
    return NextResponse.json(
      { error: "ORS error", status: orsRes.status, details: data },
      { status: orsRes.status }
    );
  }

  return NextResponse.json(data);
}
