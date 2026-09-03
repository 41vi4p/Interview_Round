"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function errorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Incorrect email or password.";
  if (code.includes("email-already-in-use")) return "That email already has an account — sign in instead.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "That email address doesn't look right.";
  if (code.includes("popup-closed-by-user")) return "Google sign-in was closed before finishing.";
  return "Something went wrong. Try again.";
}

export function AuthForm() {
  const router = useRouter();
  const { configured, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <div className="board-panel mx-auto max-w-sm rounded-lg p-6 font-mono text-sm text-ink-dim">
        Auth isn&apos;t configured yet — add your Firebase web config to{" "}
        <code className="text-ink">frontend/.env.local</code> to enable sign-in.
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      router.push("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="board-panel mx-auto max-w-sm rounded-lg p-6">
      <div className="mb-5 flex gap-1 rounded-md bg-panel-raised p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 cursor-pointer rounded px-3 py-2 font-display text-xs font-medium uppercase tracking-wide transition-colors ${
              mode === m ? "bg-panel text-ink shadow-sm" : "text-ink-dim"
            }`}
          >
            {m === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label htmlFor="auth-email" className="flex flex-col gap-1.5">
          <span className="font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">
            Email
          </span>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-amber-bright"
          />
        </label>
        <label htmlFor="auth-password" className="flex flex-col gap-1.5">
          <span className="font-display text-[11px] font-medium uppercase tracking-[0.14em] text-ink-dim">
            Password
          </span>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-amber-bright"
          />
        </label>

        {error && (
          <p role="alert" className="font-mono text-xs text-coral">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="min-h-11 cursor-pointer rounded-md bg-ink font-display text-sm font-medium uppercase tracking-wide text-board transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-ink-dim">
        <span className="h-px flex-1 bg-hairline" />
        or
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <button
        onClick={google}
        disabled={busy}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-hairline bg-panel-raised font-display text-sm font-medium text-ink transition-colors hover:border-amber-bright disabled:opacity-50"
      >
        Continue with Google
      </button>
    </div>
  );
}
