import TripBottomNav from "@/components/trip/TripBottomNav";

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[430px] px-2 pb-32 pt-2">
        {children}
      </div>
      <TripBottomNav />
    </div>
  );
}
