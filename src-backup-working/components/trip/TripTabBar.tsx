"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function TripTabBar() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const pathname = usePathname();

  const items = [
    { href: `/trips/${id}`, label: "Home", icon: "🏠" },
    { href: `/trips/${id}/plan`, label: "Plan", icon: "🗓️" },
    { href: `/trips/${id}/checklist`, label: "Check", icon: "✅" },
    { href: `/trips/${id}/stops`, label: "Stops", icon: "📍" },
    { href: `/trips/${id}/budget`, label: "Budżet", icon: "��" },
  ];

  return (
    <nav className="fixed bottom-3 left-1/2 z-[80] w-full max-w-[430px] -translate-x-1/2 px-3">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-2 shadow-[0_18px_60px_rgba(15,23,42,0.22)] backdrop-blur">
        <div className="grid grid-cols-5 gap-1">
          {items.map((it) => {
            const active =
              pathname === it.href ||
              (it.href !== `/trips/${id}` && pathname?.startsWith(it.href));

            return (
              <Link
                key={it.href}
                href={it.href}
                className={cx(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <div className="text-base leading-none">{it.icon}</div>
                <div className="leading-none">{it.label}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}