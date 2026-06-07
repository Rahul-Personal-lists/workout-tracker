import { createClient } from "@/lib/supabase/server";
import { getProfile, getTodayWeightLb } from "@/lib/queries";
import { SettingsDetailHeader } from "../settings-detail-header";
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
      <SettingsDetailHeader title="My profile" />

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
