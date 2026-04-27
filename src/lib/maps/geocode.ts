export async function geocodeCity(name: string) {
  const q = name.trim();
  if (!q) return null;

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      console.error("geocode api error", data);
      return null;
    }

    const first = Array.isArray(data.results) ? data.results[0] : null;
    if (!first) return null;

    return {
      lat: Number(first.latitude),
      lng: Number(first.longitude),
    };
  } catch (e) {
    console.error("geocode error", e);
    return null;
  }
}
