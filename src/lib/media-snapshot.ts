// Validates that a snapshotted custom-exercise media set is self-consistent and
// scoped to the caller's own {uid}/exercise-videos/{customExerciseId}/ folder
// (defense-in-depth on top of storage RLS). Shared by createCustomExercise and
// addExerciseToProgram so the rule can't drift. Poster is mandatory when any
// media is present; the video is optional (photo-only customs have none).
// Returns null when valid, else a human-readable reason.
export type MediaSnapshot = {
  customExerciseId: string | null;
  videoPath: string | null;
  posterPath: string | null;
};

export function mediaSnapshotError(
  userId: string,
  s: MediaSnapshot
): string | null {
  const hasMedia = s.videoPath !== null || s.posterPath !== null;
  if (!hasMedia) return null; // catalog exercise — no media

  if (s.customExerciseId === null) return "Missing custom exercise id";
  if (s.posterPath === null) return "Missing poster path";

  const prefix = `${userId}/exercise-videos/${s.customExerciseId}/`;
  if (!s.posterPath.startsWith(prefix)) return "Poster path outside owner folder";
  if (s.videoPath !== null && !s.videoPath.startsWith(prefix)) {
    return "Video path outside owner folder";
  }
  return null;
}
