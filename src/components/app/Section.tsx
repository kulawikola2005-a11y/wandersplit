import React from "react";

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
};

export default function Section({ title, subtitle, right, children }: Props) {
  return (
    <section className="space-y-3">
      {(title || subtitle || right) ? (
        <div className="flex items-end justify-between gap-4">
          <div>
            {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      ) : null}
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">{children}</div>
    </section>
  );
}
