import Link from "next/link";
import { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  href?: string;
  ctaLabel?: string;
  children?: ReactNode;
};

export default function SectionCard({
  title,
  description,
  href,
  ctaLabel = "Zobacz więcej",
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-neutral-500">{description}</p>
          ) : null}
        </div>

        {href ? (
          <Link
            href={href}
            className="rounded-2xl border border-black/5 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-900"
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
