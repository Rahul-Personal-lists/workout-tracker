"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoKettlePop } from "@/components/logo-kettle-pop";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="relative min-h-dvh flex items-center justify-center px-6 bg-black text-white overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 0%, rgb(16 185 129 / 0.35), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950/80 p-10 space-y-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col items-center space-y-4">
          <LogoKettlePop size={72} />
          <h1 className="text-2xl font-semibold text-center">Welcome to Workout Tracker</h1>
        </div>

        {status === "sent" ? (
          <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm">
            Check <span className="font-medium">{email}</span> for the sign-in link.
          </div>
        ) : mounted ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 rounded-md bg-neutral-900 border border-neutral-800 px-4 text-base outline-none focus:border-neutral-600"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full h-12 rounded-md bg-white text-black font-medium disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {errorMsg ? (
              <p className="text-sm text-red-400">{errorMsg}</p>
            ) : null}
          </form>
        ) : (
          <div className="space-y-4">
            <div className="w-full h-12 rounded-md bg-neutral-900 border border-neutral-800" />
            <div className="w-full h-12 rounded-md bg-white/90" />
          </div>
        )}
      </div>
    </main>
  );
}
