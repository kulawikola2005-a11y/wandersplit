"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

const DefaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function ShareMapClient({
  points,
  line,
}: {
  points: Array<{ label: string; lat: number; lng: number }>;
  line: Array<[number, number]>; // [lat,lng]
}) {
  const center: [number, number] = points.length ? [points[0].lat, points[0].lng] : [41.9028, 12.4964];

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div style={{ height: 520 }}>
        <MapContainer center={center} zoom={6} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {points.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lng]} icon={DefaultIcon}>
              <Popup>
                <div className="text-sm">{p.label}</div>
              </Popup>
            </Marker>
          ))}

          {line.length > 1 ? <Polyline positions={line} /> : null}
        </MapContainer>
      </div>
    </div>
  );
}
