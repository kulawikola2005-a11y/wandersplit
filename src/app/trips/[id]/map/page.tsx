"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useParams } from "next/navigation";

const LeafletMapClient = dynamic(() => import("./LeafletMapClient"), { ssr: false });

export default function TripMapPage() {
  const params = useParams<{ id: string }>();
  const tripId = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  return <LeafletMapClient tripId={tripId} />;
}
