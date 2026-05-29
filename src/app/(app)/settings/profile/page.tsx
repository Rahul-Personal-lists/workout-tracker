import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getTodayWeightLb } from "@/lib/queries";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const supabase = await createClient();
  const [
    profile,
    todayWeight,
    {
      data: { user },
    },
  ] = await Promise.all([
    getProfile(),
    getTodayWeightLb(),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Back to settings"
          className="h-9 w-9 rounded-full flex items-center justify-center border border-border bg-surface text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold">My profile</h1>
      </header>

      <ProfileClient
        initialName={profile.display_name}
        initialGender={profile.gender}
        initialAge={profile.age}
        initialHeightCm={profile.height_cm}
        initialAvatarUrl={profile.avatar_signed_url}
        initialAvatarPath={profile.avatar_path}
        units={profile.units}
        todayWeightLb={todayWeight}
        email={user?.email ?? null}
      />
    </div>
  );
}
