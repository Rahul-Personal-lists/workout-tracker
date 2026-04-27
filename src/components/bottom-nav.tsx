"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, History, Scale, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/today",    label: "Today",   icon: CalendarDays },
  { href: "/program",  label: "Program", icon: Dumbbell },
  { href: "/history",  label: "History", icon: History },
  { href: "/body",     label: "Body",    icon: Scale },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav during an active workout — keeps Finish button reachable
  // and removes navigation distractions mid-set.
  if (pathname.startsWith("/workout/")) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/70 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "text-white" : "text-neutral-500"
                )}
              >
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
