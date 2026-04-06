type TripHeroCardProps = {
  title: string;
  subtitle?: string;
  dates?: string;
  travelers?: string;
  budget?: string;
};

export default function TripHeroCard({
  title,
  subtitle,
  dates,
  travelers,
  budget,
}: TripHeroCardProps) {
  return (
    <section className="rounded-3xl border border-black/5 bg-[#F3EDE2] p-5 shadow-sm">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-neutral-500">Twoja podróż</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Daty</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">
              {dates || "Brak dat"}
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Uczestnicy</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">
              {travelers || "Brak danych"}
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Budżet</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">
              {budget || "Nie ustawiono"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
