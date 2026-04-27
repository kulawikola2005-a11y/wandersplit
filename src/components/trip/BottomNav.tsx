"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListTodo, MapPin, Wallet, LayoutDashboard } from "lucide-react";

export default function BottomNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();

  const tabs = [
    {
      label: "Start",
      href: `/trips/${tripId}`,
      icon: LayoutDashboard,
    },
    {
      label: "Plan",
      href: `/trips/${tripId}/plan`,
      icon: CalendarDays,
    },
    {
      label: "Lista",
      href: `/trips/${tripId}/checklist`,
      icon: ListTodo,
    },
    {
      label: "Stops",
      href: `/trips/${tripId}/stops`,
      icon: MapPin,
    },
    {
      label: "Budżet",
      href: `/trips/${tripId}/budget`,
      icon: Wallet,
    },
  ];

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-[430px] px-3 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <div className="pointer-events-auto rounded-[28px] border border-white/70 bg-white/88 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl">
          <div className="grid grid-cols-5 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-[18px] px-2 py-2 text-[11px] font-semibold transition active:scale-[0.97]"
                >
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-[16px] border transition ${
                      isActive
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)]"
                        : "border-transparent bg-[#f5f7fb] text-neutral-500"
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <div
                    className={`leading-none transition ${
                      isActive
                        ? "font-extrabold text-neutral-900"
                        : "font-medium text-neutral-500"
                    }`}
                  >
                    {tab.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
