import TripBottomNav from "@/components/trip/TripBottomNav";

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-[430px] pb-28">{children}</div>
      <TripBottomNav />
    </div>
  );
}
