"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { CheckSquare, LayoutDashboard, ListTodo, MapPin, Wallet } from "lucide-react";
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
      "relative flex h-[60px] flex-col items-center justify-center gap-1 rounded-[24px] text-[10px] font-bold transition duration-200 active:scale-[0.94]",
      active ? "text-white" : "text-slate-500 hover:text-slate-900"
    )}
  >
    {active ? (
      <div className="absolute inset-0 rounded-[24px] bg-[linear-gradient(135deg,#101827_0%,#27205f_48%,#7c5cff_100%)] shadow-[0_16px_36px_rgba(49,46,129,0.32)]" />
    ) : null}

    <div className="relative z-10">
      {icon}
    </div>

    <div className="relative z-10 leading-none">
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
        <div className="pointer-events-auto rounded-[34px] border border-white/75 bg-white/82 p-2 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur-2xl ring-1 ring-black/5">
          <div className="grid grid-cols-5 gap-1.5">
            <Item href={base} icon={<LayoutDashboard size={19} />} label="Start" active={is(base)} />
            <Item href={`${base}/plan`} icon={<ListTodo size={19} />} label="Plan" active={is(`${base}/plan`)} />
            <Item href={`${base}/checklist`} icon={<CheckSquare size={19} />} label="Lista" active={is(`${base}/checklist`)} />
            <Item href={`${base}/stops`} icon={<MapPin size={19} />} label="Trasa" active={is(`${base}/stops`)} />
            <Item href={`${base}/budget`} icon={<Wallet size={19} />} label="Budżet" active={is(`${base}/budget`)} />
          </div>
        </div>
      </div>
    </div>
  );
}
