export const COVER_URLS: string[] = [
  "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=60", // beach
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=60", // city
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=60", // mountains
  "https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=1200&q=60", // road
  "https://images.unsplash.com/photo-1441716844725-09cedc13a4e7?auto=format&fit=crop&w=1200&q=60", // forest
  "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=60", // desert
];

function hash(str: string) {
  // prosty stabilny hash (bez crypto)
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getTripCoverDeterministic(tripId: string): string {
  const i = hash(tripId) % COVER_URLS.length;
  return COVER_URLS[i];
}

// (opcjonalnie) jeśli kiedyś chcesz wybierać okładkę ręcznie:
export function getTripCover(tripId: string): string {
  if (typeof window === "undefined") return getTripCoverDeterministic(tripId);
  const key = `wandersplit:cover:${tripId}`;
  const saved = window.localStorage.getItem(key);
  return saved || getTripCoverDeterministic(tripId);
}

export function setTripCover(tripId: string, url: string) {
  if (typeof window === "undefined") return;
  const key = `wandersplit:cover:${tripId}`;
  window.localStorage.setItem(key, url);
}