"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn("github", { redirectTo: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card card-pad w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl"
             style={{ background: "var(--accent-50)", color: "var(--accent-700)" }}>
          <span className="heading-md">MC</span>
        </div>
        <h1 className="heading-lg mb-2">Mission Control</h1>
        <p className="text-body mb-8" style={{ color: "var(--text-secondary)" }}>
          Sign in with GitHub to review and build ideas.
        </p>
        <button
          onClick={handleSignIn}
          disabled={submitting}
          className="w-full rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-60"
          style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
        >
          {submitting ? "Redirecting…" : "Continue with GitHub"}
        </button>
        {error && (
          <p className="mt-4 text-small" style={{ color: "var(--error-600)" }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
