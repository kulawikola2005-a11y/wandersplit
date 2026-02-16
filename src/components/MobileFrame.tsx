import React from "react";

export default function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-950">
      {/* “telefon” */}
      <div className="mx-auto min-h-dvh w-full max-w-[430px] text-slate-900">
        {/* subtelny gradient + miękkie tło */}
        <div className="min-h-dvh bg-[radial-gradient(1100px_circle_at_-10%_-10%,rgba(99,102,241,0.18),transparent_45%),radial-gradient(900px_circle_at_110%_0%,rgba(16,185,129,0.12),transparent_42%),radial-gradient(700px_circle_at_50%_120%,rgba(236,72,153,0.10),transparent_40%)]">
          <div className="min-h-dvh bg-slate-50/90">{children}</div>
        </div>
      </div>
    </div>
  );
}
