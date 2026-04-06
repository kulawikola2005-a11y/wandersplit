import TripBottomNav from "@/components/trip/TripBottomNav";

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="w-full px-2 pb-28 pt-2">
        {children}
      </div>
      <TripBottomNav />
    </div>
  );
}
