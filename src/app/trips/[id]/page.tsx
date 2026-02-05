"use client";

import { useParams } from "next/navigation";

export default function TripHomePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? String(params.id) : "";

  const btn = "rounded-xl border px-4 py-2";

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Trip</h1>
      <p className="mt-1 text-sm text-gray-600">
        Trip ID: <span className="font-mono">{id}</span>
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <a className={btn} href={`/trips/${id}/plan`}>Plan</a>
        <a className={btn} href={`/trips/${id}/checklist`}>Checklist</a>
        <a className={btn} href={`/trips/${id}/budget`}>Budżet</a>
        <a className={btn} href={`/trips/${id}/stops`}>Stops</a>
        <a className={btn} href={`/trips/${id}/map`}>Mapa</a>
        <a className={btn} href={`/trips/${id}/weather`}>Pogoda</a>
        <a className={btn} href={`/trips/${id}/invite`}>Invite</a>
      </div>

      <div className="mt-6">
        <a className={btn} href="/trips">← Wróć do listy</a>
      </div>
    </div>
  );
}
