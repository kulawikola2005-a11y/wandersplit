import * as React from "react";

export function cx(...v: Array<string | null | undefined | false>) {
  return v.filter(Boolean).join(" ");
}

export function ProCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cx("ws-card", className)}>
      {children}
    </div>
  );
}

export function ProButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }
) {
  const { variant = "primary", className, ...rest } = props;
  const base = "rounded-2xl px-3 py-2 text-sm font-semibold transition active:scale-[0.98]";
  const v =
    variant === "primary"
      ? "ws-btn-accent"
      : variant === "secondary"
      ? "ws-btn"
      : "ws-btn";
  return <button className={[base, v, className].filter(Boolean).join(" ")} {...rest} />;
}

export function ProInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const cls = [
    "w-full ws-input px-4 py-3 text-sm outline-none",
    "focus:bg-white focus:border-[color:var(--ws-line)]",
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  return <input {...props} className={cls} />;
}
