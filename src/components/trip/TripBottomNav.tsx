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
      "flex flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 text-[10px] font-semibold transition active:scale-[0.97]",
      active ? "text-slate-900" : "text-slate-500"
    )}
  >
    <div
      className={cx(
        "grid h-9 w-9 place-items-center rounded-[16px] border transition",
        active
          ? "border-white/70 bg-white text-indigo-700 shadow-[0_8px_24px_rgba(79,70,229,0.22)]"
          : "border-white/40 bg-white/55 text-slate-600"
      )}
    >
      {icon}
    </div>

    <div
      className={cx(
        "leading-none transition",
        active ? "font-extrabold text-slate-900" : "font-semibold text-slate-500"
      )}
    >
      {label}
    </div>
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
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-[430px] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="pointer-events-auto rounded-[24px] border border-white/50 bg-white/78 p-1.5 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="grid grid-cols-5 gap-1.5">
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
