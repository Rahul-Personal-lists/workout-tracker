"use client";

import { useRouter } from "next/navigation";
import { useTutorial, type TourId } from "@/lib/stores/tutorial";

type Entry = {
  tour: TourId;
  label: string;
  route: string;
};

const ENTRIES: Entry[] = [
  { tour: "today", label: "Replay: Get to know the app", route: "/today" },
  {
    tour: "createProgram",
    label: "Replay: Make your first program",
    route: "/program",
  },
];

export function SettingsReplayTutorials() {
  const router = useRouter();
  const replayTour = useTutorial((s) => s.replayTour);

  return (
    <div className="space-y-2">
      {ENTRIES.map((e) => (
        <button
          key={e.tour}
          type="button"
          onClick={() => {
            replayTour(e.tour);
            router.push(e.route);
          }}
          className="btn-secondary w-full h-10 text-sm"
        >
          {e.label}
        </button>
      ))}
    </div>
  );
}
