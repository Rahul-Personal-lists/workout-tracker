import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:bg-accent focus:text-accent-foreground focus:text-sm focus:font-medium focus:outline-none"
      >
        Skip to content
      </a>
      <InstallPrompt />
      <main id="main" className="max-w-md mx-auto pb-24 px-4 pt-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
