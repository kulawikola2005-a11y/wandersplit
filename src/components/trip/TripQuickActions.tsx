import Link from "next/link";

type QuickAction = {
  href: string;
  title: string;
  description: string;
};

type TripQuickActionsProps = {
  tripId: string;
};

export default function TripQuickActions({ tripId }: TripQuickActionsProps) {
  const actions: QuickAction[] = [
    {
      href: `/trips/${tripId}/plan`,
      title: "Plan",
      description: "Dni, aktywności i harmonogram",
    },
    {
      href: `/trips/${tripId}/budget`,
      title: "Budżet",
      description: "Wydatki i rozliczenia grupy",
    },
    {
      href: `/trips/${tripId}/stops`,
      title: "Przystanki",
      description: "Miejsca i kolejność trasy",
    },
    {
      href: `/trips/${tripId}/checklist`,
      title: "Checklista",
      description: "Rzeczy do zabrania i zrobienia",
    },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Szybkie wejścia</h2>
        <p className="text-sm text-neutral-500">Najważniejsze sekcje podróży</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-neutral-900">
                {action.title}
              </h3>
              <p className="text-sm text-neutral-500">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
