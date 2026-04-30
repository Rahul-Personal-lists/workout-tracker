"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function MonthJump({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <label className="relative inline-block cursor-pointer">
      {children}
      <input
        type="month"
        defaultValue={value}
        onChange={(e) => {
          if (e.target.value) router.push(`/calendar?m=${e.target.value}`);
        }}
        aria-label="Jump to month"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </label>
  );
}
