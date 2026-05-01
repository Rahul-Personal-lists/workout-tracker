"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarRange, Dumbbell, Scale, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/today",    label: "Today",    icon: CalendarDays },
  { href: "/program",  label: "Program",  icon: Dumbbell },
  { href: "/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/body",     label: "Body",     icon: Scale },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav during an active workout — keeps Finish button reachable
  // and removes navigation distractions mid-set.
  if (pathname.startsWith("/workout/")) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/70 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  active ? "text-accent" : "text-foreground-muted"
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-accent"
                  />
                ) : null}
                <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
