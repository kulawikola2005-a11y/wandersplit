"use client";

import * as React from "react";
import TripHeroPro from "@/components/trip/TripHeroPro";

type TripPageShellProps = {
  tripId: string;
  section: string;
  children: React.ReactNode;
};

export default function TripPageShell({ tripId, section, children }: TripPageShellProps) {
  return (
    <main className="min-h-dvh bg-slate-50 pb-28">
      <div className="w-full px-4 pt-4">
        <TripHeroPro tripId={tripId} section={section} />

        <div className="mt-4 grid gap-4">
          {children}
        </div>
      </div>
    </main>
  );
}
