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
      className="btn-secondary w-full h-12 text-sm"
    >
      Sign out
    </button>
  );
}
