import React from "react";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-10">
      <h3 className="text-base font-semibold sm:text-lg">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
