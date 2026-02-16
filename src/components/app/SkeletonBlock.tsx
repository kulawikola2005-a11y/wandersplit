import React from "react";

type Props = {
  className?: string;
};

export default function SkeletonBlock({ className }: Props) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className ?? "h-4 w-full"}`} />;
}
