# Expo Phase 1 — trainr-mobile Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new private repo `Rahul-Personal-lists/trainr-mobile` containing an Expo (SDK 57) app that signs into the shared Supabase project via email OTP and shows the 4-tab shell (Program / Progress / Body / Settings) with ported design tokens.

**Architecture:** `create-expo-app` default template (expo-router + TS) reduced to a blank shell, then NativeWind styling fed by `theme/tokens.ts`, a `SessionProvider` around an expo-router `Stack` whose `Stack.Protected` guards swap between `(auth)/login` and `(tabs)`. supabase-js with AsyncStorage persistence; no data reads beyond auth (Phase 2).

**Tech Stack:** Expo SDK 57 / RN 0.86 / expo-router, NativeWind 4.2 + tailwindcss 3.4, @supabase/supabase-js v2, @react-native-async-storage/async-storage, lucide-react-native + react-native-svg.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-10-expo-phase1-scaffold-design.md` (workout-tracker repo). Deviations get flagged in the PR.
- **SDK 57 postdates Claude's training data.** Wherever this plan conflicts with what `create-expo-app` generates or what docs.expo.dev / nativewind.dev / supabase.com/docs say today, **the generated output + live docs win**; note the deviation in the commit message.
- New repo: **`Rahul-Personal-lists/trainr-mobile`, private**, local clone `~/Desktop/work/trainr-mobile`. All tasks run there except Task 8 (web repo `~/Desktop/work/workout-tracker`, branch `docs/expo-phase1`).
- App identity, exact values: name `Trainr`, slug `trainr-mobile`, scheme `trainr`, Android package + iOS bundle id `com.rahul.trainr`, `userInterfaceStyle: "dark"`, portrait only, black (`#000000`) splash background.
- Auth: `shouldCreateUser: false` on every `signInWithOtp` call (single-user protection — do not drop it).
- Package manager npm. Node 22. TypeScript strict.
- Verification account is **claude-test@example.com only** (OTP minted via `npx tsx scripts/test-otp.ts` in the web repo — no email sent). Never rahul@satel.ca.
- Supabase env values come from the web repo's `.env` (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) renamed to `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. `.env` is gitignored; only `.env.example` is committed.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Repo + pristine template on `main`

**Files:**
- Create: entire template at `~/Desktop/work/trainr-mobile` (generated — do not hand-edit in this task)

**Interfaces:**
- Produces: GitHub repo `Rahul-Personal-lists/trainr-mobile` (private), `main` = one pristine-template commit, working branch `feat/phase1-scaffold`, dev server known to boot.

- [ ] **Step 1: Scaffold with the official template**

```bash
cd ~/Desktop/work
npx create-expo-app@latest trainr-mobile
cd trainr-mobile
```

Expected: template installs (npm), git repo initialized by the CLI (if not: `git init`). Record the SDK line: `grep '"expo"' package.json` — expect `~57.x` (if it's newer, that's fine — the CLI matches current Expo Go; carry on and note it).

- [ ] **Step 2: Verify the template typechecks and boots on the web target**

```bash
npx tsc --noEmit
npx expo start --web
```

Expected: tsc exits 0. Dev server prints `http://localhost:8081`; opening it in the preview browser shows the template's example screen with zero console errors. Stop the server after confirming.

- [ ] **Step 3: Commit pristine template and create the GitHub repo**

```bash
git add -A
git commit -m "Pristine create-expo-app template (SDK 57)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
gh repo create Rahul-Personal-lists/trainr-mobile --private --source=. --remote=origin --push
git checkout -b feat/phase1-scaffold
```

Expected: `gh repo view Rahul-Personal-lists/trainr-mobile --json visibility` → `PRIVATE`; `main` pushed; now on `feat/phase1-scaffold`.

---

### Task 2: Reduce to a blank Trainr shell (identity, env, docs)

**Files:**
- Modify: `app.json`, `package.json`, `.gitignore`, `assets/images/*` (art swap)
- Create: `.env`, `.env.example`, `CLAUDE.md`; Replace: `README.md`
- Delete: template example code via `reset-project`, then `scripts/reset-project.js`

**Interfaces:**
- Produces: blank `app/index.tsx` + `app/_layout.tsx` (template-generated, restyled in later tasks); app.json identity keys per Global Constraints; `npm run typecheck` script.

- [ ] **Step 1: Run the template's sanctioned strip script (delete, don't archive)**

```bash
printf 'n\n' | npm run reset-project
```

Expected: `app/` now contains only `_layout.tsx` + `index.tsx`; example `components/`, `hooks/`, `constants/` are gone (the `n` answer deletes instead of moving to `app-example/`). If prompt semantics differ, ensure the end state matches, deleting any `app-example/` leftover. Then remove the script itself:

```bash
rm scripts/reset-project.js && rmdir scripts 2>/dev/null || true
node -e "const p=require('./package.json');delete p.scripts['reset-project'];p.scripts.typecheck='tsc --noEmit';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
```

- [ ] **Step 2: App identity in `app.json`**

Merge these keys into the generated `expo` object, **preserving template keys you don't recognize** (e.g. `newArchEnabled`, `experiments`):

```json
{
  "name": "Trainr",
  "slug": "trainr-mobile",
  "scheme": "trainr",
  "orientation": "portrait",
  "userInterfaceStyle": "dark",
  "icon": "./assets/images/icon.png",
  "ios": { "bundleIdentifier": "com.rahul.trainr", "supportsTablet": false },
  "android": {
    "package": "com.rahul.trainr",
    "adaptiveIcon": { "foregroundImage": "./assets/images/adaptive-icon.png", "backgroundColor": "#000000" }
  }
}
```

If the template configures splash via the `expo-splash-screen` plugin entry, set its options to `{ "image": "./assets/images/splash-icon.png", "backgroundColor": "#000000", "imageWidth": 200 }` (keep the plugin's own shape if it differs; black background is the requirement). If `android.adaptiveIcon` lives elsewhere in the generated file, adapt in place.

- [ ] **Step 3: Swap in the kettlebell art**

```bash
for f in icon.png adaptive-icon.png splash-icon.png favicon.png; do
  cp ~/Desktop/work/workout-tracker/public/icon-512.png assets/images/$f 2>/dev/null || true
done
ls assets/images/
```

Only overwrite files that exist in the template's `assets/images/`; delete other leftover example images (`react-logo*.png` etc.). 512px art is acceptable for Phase 1 (spec: regenerate properly in Phase 7).

- [ ] **Step 4: Env plumbing**

```bash
sed -n 's/^NEXT_PUBLIC_SUPABASE_URL=/EXPO_PUBLIC_SUPABASE_URL=/p; s/^NEXT_PUBLIC_SUPABASE_ANON_KEY=/EXPO_PUBLIC_SUPABASE_ANON_KEY=/p' ~/Desktop/work/workout-tracker/.env > .env
printf 'EXPO_PUBLIC_SUPABASE_URL=\nEXPO_PUBLIC_SUPABASE_ANON_KEY=\n' > .env.example
grep -qxF '.env' .gitignore || printf '\n.env\n' >> .gitignore
grep -c . .env
```

Expected: `.env` has exactly 2 non-empty lines; `git status` must NOT list `.env`.

- [ ] **Step 5: `CLAUDE.md` + `README.md`**

`CLAUDE.md` (create, exact content):

```markdown
# Trainr (mobile) — project memory

Expo (React Native) client for Rahul's workout tracker. **Same Supabase project
as the web app** ([workout-tracker](https://github.com/Rahul-Personal-lists/workout-tracker))
— schema, RLS, storage and auth are shared. The rewrite roadmap lives there:
`docs/MOBILE_ROADMAP.md`. This repo is Phase 1 (scaffold: tabs, OTP auth,
tokens); the data layer arrives in Phase 2.

## Hard rules

- **Write-invariants still live in the web app's server actions**
  (exactly-one-active-program, day-order normalization, planned_* snapshotting
  in set_logs). Until Phase 2 makes the duplicate-vs-Postgres-RPC decision,
  auth is this app's ONLY Supabase write.
- The Expo SDK here is newer than Claude's training data — trust the template
  and docs.expo.dev over memory.
- Design tokens: `theme/tokens.ts` and `tailwind.config.js` mirror each other
  (and `globals.css` upstream in the web repo). Change them together.
  Semantic classes only in components: `bg-surface`, `border-border`,
  `text-foreground-muted`, `text-accent` — no raw hex in screens.
- Verification account: **claude-test@example.com**; mint OTPs with
  `npx tsx scripts/test-otp.ts` in the web repo (no email sent). Never touch
  rahul@satel.ca data.
- Stay terse. No component libraries, no abstractions before a second caller.

## Commands

- `npx expo start` (QR → Expo Go) · `npx expo start --web` (browser)
- `npm run typecheck` · `npx expo lint` · `npx expo-doctor`
```

`README.md` (replace template content):

```markdown
# Trainr — mobile

Expo client for the [workout-tracker](https://github.com/Rahul-Personal-lists/workout-tracker)
Supabase backend (same DB, same auth). Phase 1 of `docs/MOBILE_ROADMAP.md` there.

## Run

    cp .env.example .env   # values = web repo .env (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY)
    npm install
    npx expo start         # scan QR with Expo Go (Android 7+ / iOS 16.4+)

`npx expo start --web` runs the same app in a browser.
```

- [ ] **Step 6: Gate + commit**

```bash
npm run typecheck && npx expo lint
git add -A && git status   # confirm .env absent
git commit -m "Trainr identity, env plumbing, blank shell

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected: typecheck + lint exit 0 (template ships an eslint config; if `expo lint` offers to scaffold one, accept its default).

---

### Task 3: NativeWind + design tokens

**Files:**
- Create: `theme/tokens.ts`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`
- Modify: `babel.config.js`, `metro.config.js` (create via `npx expo customize` if absent), `app/_layout.tsx` (css import), `app/index.tsx` (styled probe)

**Interfaces:**
- Produces: `tokens` / `accents` / `goalColors` exports from `@/theme/tokens`; Tailwind classes `bg-background`, `bg-surface`, `bg-surface-hover`, `bg-surface-subtle`, `border-border`, `border-border-strong`, `text-foreground`, `text-foreground-muted`, `text-accent`, `bg-accent`, `text-accent-foreground` (same names the web app uses).

- [ ] **Step 1: Install per the live NativeWind guide**

Fetch https://www.nativewind.dev/docs/getting-started/installation and follow it for Expo. Expected shape (defer to the live guide on conflicts):

```bash
npm i nativewind
npm i -D tailwindcss@^3.4.0
npx expo install react-native-reanimated react-native-safe-area-context
npx expo customize babel.config.js metro.config.js
```

- [ ] **Step 2: Token single-sources**

`theme/tokens.ts`:

```ts
// Ported from workout-tracker src/app/globals.css @theme (closest sRGB hex to
// its oklch neutrals). tailwind.config.js mirrors these — change together.
// Runtime single-sourcing lands with the Phase 6 accent switcher.
export const tokens = {
  background: "#0a0a0a",
  surface: "#171717",
  surfaceHover: "rgba(23,23,23,0.7)",
  surfaceSubtle: "rgba(23,23,23,0.4)",
  border: "#262626",
  borderStrong: "#404040",
  foreground: "#ffffff",
  foregroundMuted: "#a3a3a3",
  accent: "#a3e635",
  accentForeground: "#000000",
} as const;

// Web app's five data-theme accents — the Phase 6 switcher's palette.
export const accents = {
  lime: "#a3e635",
  sky: "#38bdf8",
  amber: "#fbbf24",
  violet: "#a78bfa",
  rose: "#fb7185",
} as const;

// Program-library goal labels — fixed, independent of accent.
export const goalColors = {
  buildMuscle: "#fb923c",
  getLean: "#2dd4bf",
  overallFitness: "#fb7185",
} as const;
```

`tailwind.config.js`:

```js
/** Mirrors theme/tokens.ts — change together (see that file's header). */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: { DEFAULT: "#171717", hover: "rgba(23,23,23,0.7)", subtle: "rgba(23,23,23,0.4)" },
        border: { DEFAULT: "#262626", strong: "#404040" },
        foreground: { DEFAULT: "#ffffff", muted: "#a3a3a3" },
        accent: { DEFAULT: "#a3e635", foreground: "#000000" },
        goal: { "build-muscle": "#fb923c", "get-lean": "#2dd4bf", "overall-fitness": "#fb7185" },
      },
    },
  },
  plugins: [],
};
```

`global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`nativewind-env.d.ts`:

```ts
/// <reference types="nativewind/types" />
```

Wire per the guide: `babel.config.js` gets the nativewind preset (`presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"]`), `metro.config.js` wraps the default config with `withNativeWind(config, { input: "./global.css" })`, and `app/_layout.tsx` adds `import "../global.css";` as its first line.

- [ ] **Step 3: Styled probe to prove the pipeline**

Replace `app/index.tsx`:

```tsx
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background">
      <Text className="text-2xl font-semibold text-foreground">Trainr</Text>
      <View className="rounded-xl border border-border bg-surface px-4 py-3">
        <Text className="text-sm text-foreground-muted">tokens wired</Text>
      </View>
      <View className="h-1 w-16 rounded-full bg-accent" />
    </View>
  );
}
```

- [ ] **Step 4: Gate + commit**

```bash
npm run typecheck && npx expo start --web
```

Expected: near-black `#0a0a0a` page, white "Trainr", muted text on a `#171717` card with visible border, lime bar. If NativeWind fails against SDK 57 and the live guide has no fix: fall back to `StyleSheet` fed by `theme/tokens.ts` (keep the same token names), note it in the commit, and continue — the tokens file is the stable interface. Then:

```bash
git add -A && git commit -m "NativeWind + ported design tokens

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Supabase client + session provider

**Files:**
- Create: `lib/supabase.ts`, `components/session-provider.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from Task 2's `.env`.
- Produces: `supabase` (client singleton) from `@/lib/supabase`; `SessionProvider` component and `useSession(): { session: Session | null; ready: boolean }` from `@/components/session-provider`.

- [ ] **Step 1: Install per the live Supabase RN guide**

Fetch https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native and install exactly what it currently lists — expected:

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

(If the guide has dropped `react-native-url-polyfill`, drop it here too and skip its import below.)

- [ ] **Step 2: `lib/supabase.ts`**

```ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY — copy .env.example to .env");

// No Database generic yet — generated types arrive with the Phase 2 data layer.
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase RN pattern: refresh tokens only while foregrounded.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
```

- [ ] **Step 3: `components/session-provider.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const SessionContext = createContext<{ session: Session | null; ready: boolean }>({
  session: null,
  ready: false,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={{ session, ready }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
```

Confirm the template tsconfig maps `@/*` (SDK default); if not, add `"paths": { "@/*": ["./*"] }` under `compilerOptions`.

- [ ] **Step 4: Mount in `app/_layout.tsx` + gate + commit**

Wrap the existing layout content: `<SessionProvider>` around the router element (full auth routing lands in Task 5 — this step only proves the provider mounts).

```bash
npm run typecheck && npx expo start --web
```

Expected: probe screen still renders, zero console errors (a failed env throw would white-screen — that's the test that `.env` loads).

```bash
git add -A && git commit -m "Supabase client + session provider

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Login screen + protected routing

**Files:**
- Create: `app/(auth)/login.tsx`
- Modify: `app/_layout.tsx`; Delete: `app/index.tsx` (probe — `(tabs)/index.tsx` replaces it in Task 6; for this task, move the probe to `app/(tabs)/index.tsx` with a matching minimal `app/(tabs)/_layout.tsx` stub)

**Interfaces:**
- Consumes: `useSession`, `SessionProvider`, `supabase`, `tokens`.
- Produces: route group behavior — signed-out users see only `/login`, signed-in users land in `(tabs)`; `app/(tabs)/_layout.tsx` stub that Task 6 fully replaces.

- [ ] **Step 1: Root layout with `Stack.Protected` guards**

Replace `app/_layout.tsx`:

```tsx
import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider, useSession } from "@/components/session-provider";
import { tokens } from "@/theme/tokens";

function RootStack() {
  const { session, ready } = useSession();
  if (!ready) return null; // black flash < splash-hide; refined never unless it hurts

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.background } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)/login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootStack />
      <StatusBar style="light" />
    </SessionProvider>
  );
}
```

`Stack.Protected` is the documented expo-router auth pattern (docs.expo.dev/router/advanced/protected). If typecheck says it doesn't exist in this SDK's expo-router, use that page's alternative: keep the plain `<Stack>`, and add `if (!session) return <Redirect href="/login" />;` at the top of `app/(tabs)/_layout.tsx` plus `if (session) return <Redirect href="/" />;` at the top of `app/(auth)/login.tsx` (import `Redirect` from `expo-router`).

Stub `app/(tabs)/_layout.tsx` (Task 6 replaces it):

```tsx
import { Stack } from "expo-router";

export default function TabsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Move the Task 3 probe: `git mv app/index.tsx "app/(tabs)/index.tsx"`.

- [ ] **Step 2: `app/(auth)/login.tsx` — the web OTP flow, ported**

```tsx
import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { tokens } from "@/theme/tokens";

type Status = "idle" | "sending" | "sent" | "verifying";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function sendCode() {
    // Single-user app: don't let an unknown email self-provision a workspace.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    return error;
  }

  async function onSend() {
    setStatus("sending");
    setErrorMsg(null);
    const error = await sendCode();
    if (error) {
      setStatus("idle");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  async function onVerify() {
    setStatus("verifying");
    setErrorMsg(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "email",
    });
    if (error) {
      setStatus("sent");
      setErrorMsg(error.message);
    }
    // Success: onAuthStateChange flips the session and the root guard swaps to (tabs).
  }

  async function onResend() {
    setResending(true);
    setErrorMsg(null);
    setCode("");
    const error = await sendCode();
    setResending(false);
    if (error) setErrorMsg(error.message);
  }

  const atCode = status === "sent" || status === "verifying";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 items-center justify-center px-6"
      >
        <View className="w-full max-w-md gap-8 rounded-2xl border border-border bg-surface-subtle p-8">
          <View className="items-center gap-2">
            <Text className="text-3xl font-semibold text-foreground">Trainr</Text>
            <Text className="text-center text-sm text-foreground-muted">
              Turn every workout into measurable progress.
            </Text>
          </View>

          {atCode ? (
            <View className="gap-4">
              <Text className="text-sm text-foreground-muted">
                We sent a 6-digit code to <Text className="font-medium text-foreground">{email.trim()}</Text>.
              </Text>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor={tokens.foregroundMuted}
                autoFocus
                accessibilityLabel="6-digit verification code"
                className="h-12 rounded-md border border-border bg-surface px-4 text-center text-lg text-foreground"
                style={{ letterSpacing: 8 }}
              />
              <Pressable
                onPress={onVerify}
                disabled={status === "verifying" || code.length !== 6}
                accessibilityRole="button"
                className="h-12 items-center justify-center rounded-md bg-white disabled:opacity-50"
              >
                {status === "verifying" ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text className="text-base font-medium text-black">Verify code</Text>
                )}
              </Pressable>
              {errorMsg ? <Text accessibilityRole="alert" className="text-sm text-red-400">{errorMsg}</Text> : null}
              <Pressable onPress={onResend} disabled={resending} accessibilityRole="button" className="items-center disabled:opacity-50">
                <Text className="text-sm text-foreground-muted">{resending ? "Sending…" : "Send a new code"}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-4">
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={tokens.foregroundMuted}
                accessibilityLabel="Email address"
                className="h-12 rounded-md border border-border bg-surface px-4 text-base text-foreground"
              />
              <Pressable
                onPress={onSend}
                disabled={status === "sending" || !email.includes("@")}
                accessibilityRole="button"
                className="h-12 items-center justify-center rounded-md bg-white disabled:opacity-50"
              >
                {status === "sending" ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text className="text-base font-medium text-black">Send code</Text>
                )}
              </Pressable>
              {errorMsg ? <Text accessibilityRole="alert" className="text-sm text-red-400">{errorMsg}</Text> : null}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

Note: NativeWind `disabled:` variant needs the component's `disabled` prop — it's on both Pressables. If the variant doesn't fire on this NativeWind version, fall back to `style={{ opacity: disabled ? 0.5 : 1 }}`.

- [ ] **Step 3: Live gate — real OTP sign-in on the web target**

```bash
npx expo start --web
```

In the preview browser at `http://localhost:8081`: login screen renders (not tabs). Enter `claude-test@example.com` → **Send code** (if Supabase rate-limits — ~60 s between sends — wait and retry). Then in the web repo:

```bash
cd ~/Desktop/work/workout-tracker && npx tsx scripts/test-otp.ts
```

Enter the printed 6-digit code → **Verify code** → probe screen (the moved `(tabs)/index.tsx`) appears. Reload the page → still signed in (persisted session). Sign-out isn't built yet; clear storage for a re-test if needed (`localStorage.clear()` on the web target).

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npm run typecheck && npx expo lint
git add -A && git commit -m "Email-OTP login + protected routing

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 4-tab shell (Program / Progress / Body / Settings)

**Files:**
- Create: `components/screen-placeholder.tsx`, `app/(tabs)/progress.tsx`, `app/(tabs)/body.tsx`, `app/(tabs)/settings.tsx`
- Modify: `app/(tabs)/_layout.tsx` (replace stub), `app/(tabs)/index.tsx` (replace probe)

**Interfaces:**
- Consumes: `useSession`, `supabase`, `tokens`.
- Produces: `ScreenPlaceholder({ title, note }: { title: string; note: string })` from `@/components/screen-placeholder`.

- [ ] **Step 1: Icons**

```bash
npx expo install react-native-svg
npm i lucide-react-native
```

- [ ] **Step 2: Tab bar — replace `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from "expo-router";
import { View } from "react-native";
import { Dumbbell, LineChart, Scale, Settings, type LucideIcon } from "lucide-react-native";
import { tokens } from "@/theme/tokens";

// Web bottom-nav parity: accent tint + a w-8 accent bar above the active icon.
function TabIcon({ Icon, color, focused }: { Icon: LucideIcon; color: string; focused: boolean }) {
  return (
    <View className="items-center gap-1">
      <View className={`h-0.5 w-8 rounded-b-full ${focused ? "bg-accent" : "bg-transparent"}`} />
      <Icon size={20} color={color} strokeWidth={focused ? 2.25 : 1.75} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: tokens.background, borderTopColor: tokens.border },
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.foregroundMuted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Program", tabBarIcon: (p) => <TabIcon Icon={Dumbbell} {...p} /> }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: (p) => <TabIcon Icon={LineChart} {...p} /> }} />
      <Tabs.Screen name="body" options={{ title: "Body", tabBarIcon: (p) => <TabIcon Icon={Scale} {...p} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: (p) => <TabIcon Icon={Settings} {...p} /> }} />
    </Tabs>
  );
}
```

(If `LucideIcon` isn't exported by this lucide-react-native version, type `Icon` as `ComponentType<{ size?: number; color?: string; strokeWidth?: number }>`.)

- [ ] **Step 3: Placeholder component + 3 placeholder tabs**

`components/screen-placeholder.tsx`:

```tsx
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function ScreenPlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-2 px-8">
        <Text className="text-2xl font-semibold text-foreground">{title}</Text>
        <Text className="text-center text-sm text-foreground-muted">{note}</Text>
      </View>
    </SafeAreaView>
  );
}
```

`app/(tabs)/index.tsx` (replaces probe):

```tsx
import { ScreenPlaceholder } from "@/components/screen-placeholder";

export default function ProgramScreen() {
  return (
    <ScreenPlaceholder
      title="Program"
      note="Your program hub arrives in Phase 3 — day pills, next-up, start & rest-day skip."
    />
  );
}
```

`app/(tabs)/progress.tsx`:

```tsx
import { ScreenPlaceholder } from "@/components/screen-placeholder";

export default function ProgressScreen() {
  return <ScreenPlaceholder title="Progress" note="Charts, month grid and history arrive in Phase 5." />;
}
```

`app/(tabs)/body.tsx`:

```tsx
import { ScreenPlaceholder } from "@/components/screen-placeholder";

export default function BodyScreen() {
  return <ScreenPlaceholder title="Body" note="Weight, measurements and photos arrive in Phase 6." />;
}
```

- [ ] **Step 4: `app/(tabs)/settings.tsx` — proof the session plumbing works**

```tsx
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/components/session-provider";

export default function SettingsScreen() {
  const { session } = useSession();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <View className="flex-1 gap-6 px-6 pt-6">
        <Text className="text-2xl font-semibold text-foreground">Settings</Text>
        <View className="gap-1 rounded-xl border border-border bg-surface p-4">
          <Text className="text-xs text-foreground-muted">Signed in as</Text>
          <Text className="text-base text-foreground">{session?.user.email}</Text>
        </View>
        <Pressable
          onPress={() => supabase.auth.signOut()}
          accessibilityRole="button"
          className="h-12 items-center justify-center rounded-xl border border-border active:bg-surface-hover"
        >
          <Text className="text-base text-foreground">Sign out</Text>
        </Pressable>
        <Text className="text-xs text-foreground-muted">
          Profile, units, sounds and themes arrive in Phase 6.
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Live gate + commit**

`npx expo start --web`, signed in from Task 5: 4 tabs with lucide icons; active tab lime with the w-8 bar, inactive muted; Program/Progress/Body show their phase notes; Settings shows `claude-test@example.com`; **Sign out** returns to login; signing back in (fresh OTP via `test-otp.ts`) works. Zero console errors.

```bash
npm run typecheck && npx expo lint
git add -A && git commit -m "4-tab shell with placeholders + settings sign-out

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: CI, doctor, full E2E, PR #1

**Files:**
- Create: `.github/workflows/check.yml`

**Interfaces:**
- Produces: PR #1 on `Rahul-Personal-lists/trainr-mobile` with green `check` CI.

- [ ] **Step 1: `.github/workflows/check.yml`**

```yaml
name: check
on:
  push:
    branches: [main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npx expo lint
```

- [ ] **Step 2: Full local gate**

```bash
npm run typecheck && npx expo lint && npx expo-doctor
```

Expected: all pass. expo-doctor warnings that are template defaults are acceptable; version-mismatch findings must be fixed via `npx expo install --fix`.

- [ ] **Step 3: Full E2E once more (web target)**

Cold start `npx expo start --web`: signed-in session persisted from Task 6 → tabs appear directly (persistence across restarts). Sign out → login → full OTP round-trip (mint via web repo `scripts/test-otp.ts`) → tabs. Zero console errors.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/phase1-scaffold
gh pr create --repo Rahul-Personal-lists/trainr-mobile --base main --head feat/phase1-scaffold \
  --title "Phase 1: Expo scaffold — tabs, OTP auth, design tokens" \
  --body "$(cat <<'EOF'
Phase 1 of the Expo rewrite (workout-tracker docs/MOBILE_ROADMAP.md): 4-tab shell
(Program/Progress/Body/Settings), Supabase email-OTP sign-in (shouldCreateUser:false)
with AsyncStorage persistence, NativeWind + tokens ported from globals.css,
Trainr identity (com.rahul.trainr, dark, portrait).

Verified: tsc, expo lint, expo-doctor, live web-target E2E (OTP sign-in as
claude-test@example.com, tab nav, sign-out, session persistence). Native pass =
Expo Go on Rahul's phone.

Spec: workout-tracker docs/superpowers/specs/2026-07-10-expo-phase1-scaffold-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --repo Rahul-Personal-lists/trainr-mobile 1 --watch
```

Expected: PR #1 created; `check` goes green.

---

### Task 8: Web-repo docs wrap (branch `docs/expo-phase1`)

**Files:**
- Modify: `docs/MOBILE_ROADMAP.md` (status header), `.claude/sessions.md` (new entry, keep 3)

**Interfaces:**
- Consumes: PR URLs from Task 7.

- [ ] **Step 1: Roadmap status**

In `docs/MOBILE_ROADMAP.md`, change the header line

```markdown
**Written:** 2026-07-08 · **Status:** planned, not started
```

to

```markdown
**Written:** 2026-07-08 · **Status:** in progress — Phase 1 shipped ([trainr-mobile#1](https://github.com/Rahul-Personal-lists/trainr-mobile/pull/1))
**Repo:** https://github.com/Rahul-Personal-lists/trainr-mobile (private)
```

and add under the Phases table a checklist line: `- [x] Phase 1 — Scaffold (trainr-mobile#1, 2026-07-10)`.

- [ ] **Step 2: Session log**

Prepend a `## 2026-07-10 — Expo rewrite Phase 1: trainr-mobile scaffold (trainr-mobile#1)` entry to `.claude/sessions.md` in the house style (3–4 bullets: what shipped + repo decisions [trainr-mobile, private, Phase-1-only scope], gotchas found during execution, verification evidence). Delete the oldest entry so only 3 remain.

- [ ] **Step 3: Commit + PR**

```bash
cd ~/Desktop/work/workout-tracker
git add docs/MOBILE_ROADMAP.md .claude/sessions.md
git commit -m "Docs: Expo Phase 1 shipped — roadmap status + session log

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push -u origin docs/expo-phase1
gh pr create --base main --head docs/expo-phase1 \
  --title "Docs: Expo rewrite Phase 1 (spec, plan, roadmap status)" \
  --body "$(cat <<'EOF'
Spec + implementation plan for the trainr-mobile Phase 1 scaffold, roadmap
status bump, session log. Code lives in trainr-mobile#1.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: docs PR open in workout-tracker. Done.
