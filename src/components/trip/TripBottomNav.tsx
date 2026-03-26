"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ListTodo, CheckSquare, MapPin, Wallet, LayoutDashboard } from "lucide-react";
import { cx } from "@/components/ui/pro";

const Item = ({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) => (
  <Link
    href={href}
    className={cx(
      "flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold",
      active ? "text-indigo-700" : "text-slate-600"
    )}
  >
    <div
      className={cx(
        "grid h-9 w-9 place-items-center rounded-2xl border",
        active ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"
      )}
    >
      {icon}
    </div>
    <div className="leading-none">{label}</div>
  </Link>
);

export default function TripBottomNav() {
  const params = useParams<{ id: string }>();
  const tripId = String(params?.id || "");
  const pathname = usePathname();

  if (!tripId) return null;

  const base = `/trips/${tripId}`;
  const is = (p: string) => pathname === p;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-[430px] px-4 pb-5">
        <div className="rounded-[26px] border border-slate-200 bg-white/95 p-2 shadow-[0_18px_60px_rgba(2,6,23,0.18)] backdrop-blur">
          <div className="grid grid-cols-5 gap-2">
            <Item href={base} icon={<LayoutDashboard size={18} />} label="Start" active={is(base)} />
            <Item href={`${base}/plan`} icon={<ListTodo size={18} />} label="Plan" active={is(`${base}/plan`)} />
            <Item
              href={`${base}/checklist`}
              icon={<CheckSquare size={18} />}
              label="Lista"
              active={is(`${base}/checklist`)}
            />
            <Item href={`${base}/stops`} icon={<MapPin size={18} />} label="Stops" active={is(`${base}/stops`)} />
            <Item href={`${base}/budget`} icon={<Wallet size={18} />} label="Budżet" active={is(`${base}/budget`)} />
          </div>
        </div>
      </div>
    </div>
  );
}