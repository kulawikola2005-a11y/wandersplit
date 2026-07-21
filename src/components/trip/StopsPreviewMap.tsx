"use client";

type StopLike = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
};

export default function StopsPreviewMap({ items }: { items: StopLike[] }) {
  const points = items.slice(0, 5);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#dbeafe_0%,#dcfce7_48%,#fef3c7_100%)]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 420" preserveAspectRatio="none">
        <path
          d="M92 390 C 120 330, 120 300, 155 250 S 188 190, 170 150 S 210 92, 214 30"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>

      {points.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center px-8 text-center">
          <div>
            <div className="text-3xl">🗺️</div>
            <div className="mt-3 text-sm font-black text-slate-800">Dodaj pierwszy przystanek</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Podgląd trasy pojawi się tutaj.</div>
          </div>
        </div>
      ) : (
        points.map((point, index) => {
          const positions = [
            { left: "22%", top: "86%" },
            { left: "34%", top: "70%" },
            { left: "50%", top: "50%" },
            { left: "61%", top: "30%" },
            { left: "63%", top: "11%" },
          ];

          return (
            <div
              key={point.id}
              className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[linear-gradient(135deg,#4c1d95_0%,#7c3aed_100%)] text-xs font-black text-white shadow-[0_10px_24px_rgba(76,29,149,0.35)]"
              style={positions[index]}
            >
              {index + 1}
            </div>
          );
        })
      )}
    </div>
  );
}
