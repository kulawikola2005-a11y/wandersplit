type StatItem = {
  label: string;
  value: string;
};

type TripStatsRowProps = {
  items: StatItem[];
};

export default function TripStatsRow({ items }: TripStatsRowProps) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm"
        >
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {item.label}
          </p>
          <p className="mt-2 text-lg font-semibold text-neutral-900">
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}
