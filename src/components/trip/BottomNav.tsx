"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListTodo, MapPin, Wallet } from "lucide-react";

export default function BottomNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();

  const tabs = [
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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  isActive
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500"
                }`}
              >
                <Icon size={18} />
              </div>

              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-neutral-900" : "text-neutral-500"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
