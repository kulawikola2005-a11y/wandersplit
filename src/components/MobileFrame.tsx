import React from "react";

export default function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-950 px-3 py-8 sm:px-6 sm:py-12">
      {/* “telefon” */}
      <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-[44px] bg-slate-900 shadow-[0_30px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
        {/* subtelny gradient + miękkie tło */}
        <div className="min-h-dvh bg-[radial-gradient(1100px_circle_at_-10%_-10%,rgba(99,102,241,0.22),transparent_45%),radial-gradient(900px_circle_at_110%_0%,rgba(16,185,129,0.14),transparent_42%),radial-gradient(700px_circle_at_50%_120%,rgba(236,72,153,0.12),transparent_40%)]">
          <div className="min-h-dvh bg-slate-50/95 text-slate-900">{children}</div>
        </div>
      </div>
    </div>
  );
}
