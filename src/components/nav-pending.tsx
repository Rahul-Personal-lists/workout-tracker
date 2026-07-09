"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

// Renders inside a <Link>; dims its content while that navigation is pending
// (see the paired [data-nav-pending] rule in globals.css).
export function NavPending({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      data-nav-pending={pending ? "" : undefined}
      className={cn("inline-flex items-center justify-center gap-1", className)}
    >
      {children}
    </span>
  );
}
