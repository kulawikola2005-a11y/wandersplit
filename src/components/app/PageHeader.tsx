import React from "react";

type Props = {
  title: string;
  description?: string;
  right?: React.ReactNode;
  eyebrow?: string;
};

export default function PageHeader({ title, description, right, eyebrow }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</div>
        ) : null}
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}
