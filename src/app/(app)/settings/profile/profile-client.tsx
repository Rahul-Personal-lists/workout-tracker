"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, LogOut, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  clearAvatar,
  deleteAccount,
  setAvatar,
  setProfileFields,
} from "@/app/actions/profile";
import {
  MAX_PHOTO_BYTES,
  PHOTO_BUCKET,
  isLikelyImage,
  photoContentType,
  photoExt,
} from "@/lib/photo-upload";
import {
  cmToFtIn,
  formatWeight,
  parseHeightCm,
  parseHeightFtIn,
} from "@/lib/format";
import type { Units } from "@/lib/units";
import { cn } from "@/lib/utils";

type Gender = "male" | "female" | "other";

type Props = {
  initialName: string | null;
  initialGender: Gender | null;
  initialAge: number | null;
  initialHeightCm: number | null;
  initialAvatarUrl: string | null;
  initialAvatarPath: string | null;
  units: Units;
  todayWeightLb: number | null;
  email: string | null;
};

export function ProfileClient({
  initialName,
  initialGender,
  initialAge,
  initialHeightCm,
  initialAvatarUrl,
  initialAvatarPath,
  units,
  todayWeightLb,
  email,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [gender, setGender] = useState<Gender | null>(initialGender);
  const [age, setAge] = useState(initialAge !== null ? String(initialAge) : "");

  const initialFtIn = useMemo(
    () => (initialHeightCm !== null ? cmToFtIn(initialHeightCm) : null),
    [initialHeightCm]
  );
  const [heightFt, setHeightFt] = useState(
    initialFtIn ? String(initialFtIn.ft) : ""
  );
  const [heightIn, setHeightIn] = useState(
    initialFtIn ? String(initialFtIn.in) : ""
  );
  const [heightCmInput, setHeightCmInput] = useState(
    initialHeightCm !== null ? String(Math.round(initialHeightCm)) : ""
  );

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath);
  const [enlarged, setEnlarged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPending, startAvatar] = useTransition();
  const [formPending, startForm] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialAgeStr = initialAge !== null ? String(initialAge) : "";
  const initialHeightFtStr = initialFtIn ? String(initialFtIn.ft) : "";
  const initialHeightInStr = initialFtIn ? String(initialFtIn.in) : "";
  const initialHeightCmStr =
    initialHeightCm !== null ? String(Math.round(initialHeightCm)) : "";

  const isDirty =
    name !== (initialName ?? "") ||
    gender !== initialGender ||
    age !== initialAgeStr ||
    (units === "imperial"
      ? heightFt !== initialHeightFtStr || heightIn !== initialHeightInStr
      : heightCmInput !== initialHeightCmStr);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  function onPickAvatar(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError(null);
    if (file.size > MAX_PHOTO_BYTES) {
      setError(
        `Photo too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`
      );
      return;
    }
    if (!isLikelyImage(file)) {
      setError("Unsupported file type.");
      return;
    }
    startAvatar(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in.");
        return;
      }
      const ext = photoExt(file);
      const path = `${user.id}/profile/${crypto.randomUUID()}.${ext}`;
      const contentType = photoContentType(file, ext);
      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { contentType, upsert: false });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      try {
        await setAvatar({ path });
        const { data: signed } = await supabase.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(path, 60 * 60);
        setAvatarUrl(signed?.signedUrl ?? null);
        setAvatarPath(path);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch (err) {
        await supabase.storage.from(PHOTO_BUCKET).remove([path]);
        setError(err instanceof Error ? err.message : "Could not save avatar.");
      }
    });
  }

  function onAvatarTap() {
    // With a photo, tapping grows it in place; without one there's nothing to
    // enlarge, so fall back to the picker (matches the "Tap to add a photo" hint).
    if (avatarUrl) {
      setEnlarged((v) => !v);
    } else {
      fileInputRef.current?.click();
    }
  }

  function onRemoveAvatar() {
    startAvatar(async () => {
      try {
        await clearAvatar();
        setAvatarUrl(null);
        setAvatarPath(null);
        setEnlarged(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove.");
      }
    });
  }

  function onSaveForm() {
    setError(null);
    const trimmedName = name.trim();
    const ageNum = age.trim() === "" ? null : Number(age);
    if (ageNum !== null && (!Number.isInteger(ageNum) || ageNum <= 0 || ageNum >= 150)) {
      setError("Age must be between 1 and 149.");
      return;
    }

    let heightCm: number | null = null;
    if (units === "imperial") {
      const hasInput = heightFt.trim() !== "" || heightIn.trim() !== "";
      if (hasInput) {
        heightCm = parseHeightFtIn(heightFt, heightIn);
        if (heightCm === null) {
          setError("Enter a valid height.");
          return;
        }
      }
    } else {
      const trimmed = heightCmInput.trim();
      if (trimmed !== "") {
        heightCm = parseHeightCm(trimmed);
        if (heightCm === null) {
          setError("Enter a valid height in cm.");
          return;
        }
      }
    }

    startForm(async () => {
      try {
        await setProfileFields({
          name: trimmedName === "" ? undefined : trimmedName,
          gender,
          age: ageNum,
          heightCm,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function armDelete() {
    if (confirmingDelete) {
      startDelete(async () => {
        try {
          await deleteAccount();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not delete account.");
          setConfirmingDelete(false);
        }
      });
      return;
    }
    setConfirmingDelete(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmingDelete(false), 4000);
  }

  async function onSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 py-2">
        <button
          type="button"
          onClick={onAvatarTap}
          disabled={avatarPending}
          aria-label={
            avatarUrl
              ? enlarged
                ? "Shrink profile photo"
                : "Enlarge profile photo"
              : "Add a photo"
          }
          aria-expanded={avatarUrl ? enlarged : undefined}
          className={cn(
            "rounded-full border border-border bg-surface-subtle overflow-hidden flex items-center justify-center text-foreground-muted transition-[width,height] duration-300 ease-out outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
            enlarged ? "w-60 h-60" : "w-24 h-24",
            avatarPending && "opacity-60"
          )}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Profile photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="w-8 h-8" strokeWidth={1.5} />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onPickAvatar(e.target.files)}
          className="hidden"
        />
        {avatarPath ? (
          <div className="flex items-center gap-3 text-xs text-foreground-muted">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarPending}
              className="underline disabled:opacity-50 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
            >
              Change photo
            </button>
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
            <button
              type="button"
              onClick={onRemoveAvatar}
              disabled={avatarPending}
              className="underline disabled:opacity-50 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
            >
              Remove photo
            </button>
          </div>
        ) : (
          <span className="text-xs text-foreground-muted">Tap to add a photo</span>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface divide-y divide-[color:var(--color-border)]">
        <FieldRow label="Name">
          <input
            type="text"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a name"
            aria-label="Name"
            className="bg-transparent text-sm text-right outline-none w-full focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          />
        </FieldRow>

        <FieldRow label="Gender">
          <div className="flex items-center gap-1">
            {(["male", "female", "other"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(gender === g ? null : g)}
                aria-pressed={gender === g}
                className={cn(
                  "h-8 px-3 rounded-full text-xs capitalize border outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
                  gender === g
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-surface-subtle text-foreground-muted border-border"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Age">
          <input
            type="text"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            placeholder="—"
            aria-label="Age"
            className="bg-transparent text-sm text-right outline-none w-20 tabular-nums focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          />
        </FieldRow>

        <FieldRow label={units === "metric" ? "Height (cm)" : "Height"}>
          {units === "metric" ? (
            <input
              type="text"
              inputMode="decimal"
              value={heightCmInput}
              onChange={(e) =>
                setHeightCmInput(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))
              }
              placeholder="—"
              aria-label="Height in centimeters"
              className="bg-transparent text-sm text-right outline-none w-24 tabular-nums focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={heightFt}
                onChange={(e) =>
                  setHeightFt(e.target.value.replace(/[^\d]/g, "").slice(0, 1))
                }
                placeholder="ft"
                aria-label="Height feet"
                className="bg-surface-subtle border border-border rounded h-8 w-12 text-sm text-center outline-none tabular-nums focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
              />
              <span className="text-xs text-foreground-muted">ft</span>
              <input
                type="text"
                inputMode="numeric"
                value={heightIn}
                onChange={(e) =>
                  setHeightIn(e.target.value.replace(/[^\d]/g, "").slice(0, 2))
                }
                placeholder="in"
                aria-label="Height inches"
                className="bg-surface-subtle border border-border rounded h-8 w-12 text-sm text-center outline-none tabular-nums focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
              />
              <span className="text-xs text-foreground-muted">in</span>
            </div>
          )}
        </FieldRow>

        <FieldRow label="Weight">
          <Link
            href="/body"
            className="text-sm text-foreground-muted hover:text-foreground tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          >
            {todayWeightLb !== null
              ? formatWeight(todayWeightLb, units)
              : "Log on /body"}
          </Link>
        </FieldRow>

        <FieldRow label="Email">
          <span className="text-sm text-foreground-muted truncate">{email ?? "—"}</span>
        </FieldRow>
      </div>

      {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={onSaveForm}
        disabled={formPending || !isDirty}
        className={cn(
          "w-full h-11 rounded-md text-sm font-medium bg-accent text-accent-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
          (formPending || !isDirty) && "opacity-50"
        )}
      >
        {formPending ? "Saving…" : "Save changes"}
      </button>

      <div className="grid gap-2 pt-2">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full h-11 rounded-md text-sm border border-border bg-surface text-foreground flex items-center justify-center gap-2 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
        <button
          type="button"
          onClick={armDelete}
          disabled={deletePending}
          className={cn(
            "w-full h-11 rounded-md text-sm border flex items-center justify-center gap-2 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
            confirmingDelete
              ? "bg-red-500/20 border-red-500/60 text-red-300"
              : "border-red-500/40 text-red-400 bg-transparent",
            deletePending && "opacity-50"
          )}
        >
          <Trash2 className="w-4 h-4" />
          {deletePending
            ? "Deleting…"
            : confirmingDelete
              ? "Tap again to delete"
              : "Delete account"}
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 h-14 text-sm">
      <span className="text-xs uppercase tracking-wide text-foreground-muted">
        {label}
      </span>
      <div className="flex-1 flex justify-end items-center">{children}</div>
    </div>
  );
}
