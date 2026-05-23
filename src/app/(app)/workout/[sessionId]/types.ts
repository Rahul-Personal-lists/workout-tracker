export type SetRow = {
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
  actualSeconds: number | null;
  completed: boolean;
};

export type ExerciseRow = {
  id: string;
  name: string;
  note: string | null;
  imageUrl: string | null;
  kind: "reps" | "time";
  plannedWeight: number | null;
  plannedReps: number | null;
  plannedSeconds: number | null;
  lastWeight: number | null;
  lastReps: number | null;
  lastSeconds: number | null;
  sets: SetRow[];
};
