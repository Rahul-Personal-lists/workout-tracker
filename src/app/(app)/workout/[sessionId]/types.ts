export type SetRow = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  actualSeconds: number | null;
  completed: boolean;
};

import type { ReframeRect, TrimBounds } from "@/lib/video-upload";

export type ExerciseRow = {
  id: string;
  name: string;
  note: string | null;
  imageUrl: string | null;
  // Video custom exercises: mediaKind "video" + the signed URLs + crop/trim.
  mediaKind: "image" | "video";
  videoUrl: string | null;
  posterUrl: string | null;
  videoPath: string | null;
  rect: ReframeRect | null;
  trim: TrimBounds | null;
  aspect: number | null;
  kind: "reps" | "time";
  plannedWeight: number | null;
  plannedReps: number | null;
  plannedSeconds: number | null;
  lastWeight: number | null;
  lastReps: number | null;
  lastSeconds: number | null;
  sets: SetRow[];
};
