import type { ReactNode } from "react";

export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="min-h-dvh rounded-[32px] border border-slate-200 bg-slate-50 shadow-xl">
        <div className="min-h-dvh overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
