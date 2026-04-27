"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function onClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <button
      onClick={onClick}
      className="w-full h-12 rounded-md border border-neutral-800 text-sm text-neutral-200 hover:bg-neutral-900"
    >
      Sign out
    </button>
  );
}
