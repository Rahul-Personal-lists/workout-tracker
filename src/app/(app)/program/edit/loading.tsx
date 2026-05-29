import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      className="flex items-center justify-center py-24"
      aria-busy="true"
      aria-label="Loading editor"
    >
      <Loader2
        aria-hidden="true"
        className="w-6 h-6 animate-spin text-foreground-muted"
      />
    </div>
  );
}
