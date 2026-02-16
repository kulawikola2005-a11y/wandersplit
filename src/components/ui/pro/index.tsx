import * as React from "react";

export function cx(...v: Array<string | null | undefined | false>) {
  return v.filter(Boolean).join(" ");
}

export function ProCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cx("rounded-3xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function ProButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }
) {
  const { variant = "primary", className, ...rest } = props;
  const base = "rounded-2xl px-4 py-3 text-sm font-semibold transition active:scale-[0.98]";
  const v =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : variant === "secondary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200";
  return <button className={[base, v, className].filter(Boolean).join(" ")} {...rest} />;
}

export function ProInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const cls = [
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none",
    "focus:bg-white focus:border-slate-300",
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  return <input {...props} className={cls} />;
}
