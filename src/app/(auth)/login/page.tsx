"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoKettlePop } from "@/components/logo-kettle-pop";

type Status = "idle" | "sending" | "sent" | "verifying";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const err = new URLSearchParams(window.location.search).get("error");
    if (err) setErrorMsg(err);
  }, []);

  async function sendCode() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email });
    return error;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("verifying");
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) {
      setStatus("sent");
      setErrorMsg(error.message);
      return;
    }
    // Hard navigation so the proxy middleware picks up the new auth cookies.
    window.location.href = "/program";
  }

  async function resend() {
    setResending(true);
    setErrorMsg(null);
    setCode("");
    const error = await sendCode();
    setResending(false);
    if (error) setErrorMsg(error.message);
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
          <div className="animate-logo-enter">
            <LogoKettlePop size={72} />
          </div>
          <h1 className="text-2xl font-semibold text-center animate-title-enter">
            <span className="inline-flex" aria-label="Trainly">
              {"Trainly".split("").map((ch, i) => (
                <span
                  key={i}
                  className="inline-block animate-letter-bounce"
                  style={{ animationDelay: `${0.45 + i * 0.06}s` }}
                >
                  {ch}
                </span>
              ))}
            </span>
          </h1>
        </div>

        {status === "sent" || status === "verifying" ? (
          <form onSubmit={onVerifyOtp} className="space-y-4">
            <p className="text-sm text-neutral-300">
              We sent a 6-digit code to <span className="font-medium">{email}</span>. Enter it below.
            </p>
            <input
              type="text"
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full h-12 rounded-md bg-neutral-900 border border-neutral-800 px-4 text-lg tracking-[0.4em] text-center outline-none focus:border-neutral-600"
              autoFocus
            />
            <button
              type="submit"
              disabled={status === "verifying" || code.length !== 6}
              className="w-full h-12 rounded-md bg-white text-black font-medium disabled:opacity-50"
            >
              {status === "verifying" ? "Verifying…" : "Verify code"}
            </button>
            {errorMsg ? (
              <p className="text-sm text-red-400">{errorMsg}</p>
            ) : null}
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="w-full text-sm text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
            >
              {resending ? "Sending…" : "Send a new code"}
            </button>
          </form>
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
              {status === "sending" ? "Sending…" : "Send code"}
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
