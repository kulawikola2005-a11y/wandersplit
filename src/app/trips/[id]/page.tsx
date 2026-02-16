"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ListTodo, CheckSquare, MapPin, Wallet, Share2, FileDown } from "lucide-react";
import TripHeroPro from "@/components/trip/TripHeroPro";
import { ProCard } from "@/components/ui/pro";

export default function TripOverviewPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => String(params?.id || ""), [params]);
  if (!tripId) return null;

  const tiles = [
    { label: "Plan", href: `/trips/${tripId}/plan`, Icon: ListTodo, desc: "Zadania i statusy" },
    { label: "Checklist", href: `/trips/${tripId}/checklist`, Icon: CheckSquare, desc: "Rzeczy do zabrania" },
    { label: "Stops", href: `/trips/${tripId}/stops`, Icon: MapPin, desc: "Kolejność miejsc" },
    { label: "Budżet", href: `/trips/${tripId}/budget`, Icon: Wallet, desc: "Wydatki i rozliczenia" },
  ];

  return (
    <div className="pb-2">
      <TripHeroPro tripId={tripId} section="Start" />

      <div className="px-4 space-y-4">
        <div className="grid gap-3">
          {tiles.map((t) => (
            <Link key={t.label} href={t.href}>
              <ProCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-slate-50">
                    <t.Icon size={18} className="text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">{t.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{t.desc}</div>
                  </div>
                </div>
              </ProCard>
            </Link>
          ))}
        </div>

        <ProCard className="p-4">
          <div className="text-sm font-extrabold text-slate-900">Share / Export</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href={`/trips/${tripId}/public`}
            >
              <Share2 size={16} /> Public link
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              href={`/trips/${tripId}/export`}
            >
              <FileDown size={16} /> Export PDF
            </Link>
          </div>
        </ProCard>
      </div>
    </div>
  );
}
