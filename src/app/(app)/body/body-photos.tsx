"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { GitCompareArrows, Trash2, X } from "lucide-react";
import { deleteBodyPhoto } from "@/app/actions/body";
import type { BodyPhotoRow } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useDialog } from "@/lib/use-dialog";

const PHOTOS_INITIAL_GROUPS = 2;
const PHOTOS_PAGE_GROUPS = 4;

export function BodyPhotos({ photos }: { photos: BodyPhotoRow[] }) {
  const router = useRouter();
  const [active, setActive] = useState<BodyPhotoRow | null>(null);
  const [compareWith, setCompareWith] = useState<BodyPhotoRow | null>(null);
  const [picking, setPicking] = useState(false);
  const [groupsVisibleCount, setGroupsVisibleCount] = useState(
    PHOTOS_INITIAL_GROUPS
  );
  const [pending, startTransition] = useTransition();
  const dialogRef = useDialog<HTMLDivElement>(!!active, closeModal);

  const grouped = useMemo(() => {
    const map = new Map<string, BodyPhotoRow[]>();
    photos.forEach((p) => {
      const arr = map.get(p.log_date) ?? [];
      arr.push(p);
      map.set(p.log_date, arr);
    });
    return Array.from(map.entries());
  }, [photos]);

  const visibleGroups = grouped.slice(0, groupsVisibleCount);
  const groupsRemaining = Math.max(0, grouped.length - groupsVisibleCount);
  const groupsAtMax = groupsVisibleCount >= grouped.length;
  const nextStepGroups = Math.min(PHOTOS_PAGE_GROUPS, groupsRemaining);
  const nextStepPhotoCount = grouped
    .slice(groupsVisibleCount, groupsVisibleCount + nextStepGroups)
    .reduce((sum, [, list]) => sum + list.length, 0);

  if (photos.length === 0) return null;

  function closeModal() {
    setActive(null);
    setCompareWith(null);
    setPicking(false);
  }

  function onDelete(photo: BodyPhotoRow) {
    if (!confirm("Delete this photo?")) return;
    startTransition(async () => {
      await deleteBodyPhoto({ photoId: photo.id });
      closeModal();
      router.refresh();
    });
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs uppercase tracking-wide text-foreground-muted">
        Progress photos
      </h2>
      <div className="space-y-3">
        {visibleGroups.map(([date, dayPhotos]) => (
          <div key={date} className="space-y-1.5">
            <div className="text-xs text-foreground-muted tabular-nums">
              {format(new Date(date + "T00:00:00"), "MMM d, yyyy")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {dayPhotos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(p)}
                  className="relative aspect-square rounded-md overflow-hidden bg-surface-subtle border border-border outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.signed_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {grouped.length > PHOTOS_INITIAL_GROUPS ? (
        <button
          type="button"
          onClick={() => {
            if (groupsAtMax) {
              setGroupsVisibleCount(PHOTOS_INITIAL_GROUPS);
            } else {
              setGroupsVisibleCount((c) => c + PHOTOS_PAGE_GROUPS);
            }
          }}
          className="w-full h-10 rounded-md text-sm text-foreground-muted hover:text-foreground border border-border bg-surface-subtle"
        >
          {groupsAtMax
            ? "Show fewer photos"
            : `Show ${nextStepPhotoCount} more`}
        </button>
      ) : null}

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/90 overflow-y-auto"
          onClick={closeModal}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Progress photo"
            tabIndex={-1}
            className="relative max-w-md w-full p-4 mt-4 space-y-2 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <PhotoFrame photo={active} />
            {compareWith ? <PhotoFrame photo={compareWith} /> : null}

            {picking ? (
              <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-surface p-2">
                <div className="grid grid-cols-4 gap-2">
                  {photos
                    .filter((p) => p.id !== active.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setCompareWith(p);
                          setPicking(false);
                        }}
                        className="aspect-square rounded-md overflow-hidden border border-border outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.signed_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => onDelete(active)}
                disabled={pending}
                aria-label="Delete photo"
                className={cn(
                  "h-10 px-3 rounded-md text-sm flex items-center gap-1.5 bg-red-500/15 text-red-400 border border-red-500/40",
                  pending && "opacity-50"
                )}
              >
                <Trash2 className="w-4 h-4" />
                {pending ? "Deleting…" : "Delete"}
              </button>
              {photos.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (compareWith) {
                      setCompareWith(null);
                    } else {
                      setPicking((p) => !p);
                    }
                  }}
                  className="h-10 px-3 rounded-md text-sm flex items-center gap-1.5 bg-surface text-foreground border border-border"
                >
                  <GitCompareArrows className="w-4 h-4" />
                  {compareWith ? "Clear" : picking ? "Cancel" : "Compare"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="h-10 w-10 rounded-md flex items-center justify-center text-foreground-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PhotoFrame({ photo }: { photo: BodyPhotoRow }) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.signed_url}
        alt=""
        className="w-full max-h-[42vh] object-contain rounded-md bg-black"
      />
      <span className="absolute bottom-2 left-2 text-[11px] tabular-nums bg-black/70 text-white px-2 py-1 rounded">
        {format(new Date(photo.log_date + "T00:00:00"), "MMM d, yyyy")}
      </span>
    </div>
  );
}
