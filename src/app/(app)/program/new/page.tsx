import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BlankProgramForm } from "./blank-program-form";

export const dynamic = "force-dynamic";

export default function NewProgramPage() {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link
          href="/program"
          className="inline-flex items-center gap-1 text-xs text-neutral-400"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Program
        </Link>
        <h1 className="text-2xl font-semibold">New program</h1>
        <p className="text-xs text-neutral-500">
          Set the structure here. Add exercises after.
        </p>
      </header>
      <BlankProgramForm />
    </div>
  );
}
