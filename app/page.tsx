"use client";

import { useState } from "react";
import { isDebugMode } from "@/lib/utils";
import type { CreateDeveloperAccountResponse } from "@/types";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [devAccount, setDevAccount] =
    useState<CreateDeveloperAccountResponse | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debugMode = isDebugMode();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMagicLinkLoading(true);
    try {
      // In a real app this would POST to an email magic-link endpoint.
      await new Promise((resolve) => setTimeout(resolve, 800));
      setMagicLinkSent(true);
    } catch {
      setError("Failed to send magic link. Please try again.");
    } finally {
      setMagicLinkLoading(false);
    }
  }

  async function handleCreateDevAccount() {
    setError(null);
    setDevLoading(true);
    try {
      const response = await fetch("/api/auth/developer", { method: "POST" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          (body as { error?: string }).error ?? "Unknown error"
        );
      }
      const data: CreateDeveloperAccountResponse = await response.json();
      setDevAccount(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create developer account."
      );
    } finally {
      setDevLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-md p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Sign in
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Enter your email to receive a magic link.
          </p>
        </div>

        {/* Magic link form */}
        {!magicLinkSent ? (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={magicLinkLoading}
              className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition"
            >
              {magicLinkLoading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        ) : (
          <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4 text-sm text-zinc-700 dark:text-zinc-300 text-center">
            ✅ Check your inbox — we sent a magic link to{" "}
            <span className="font-medium">{email}</span>.
          </div>
        )}

        {/* Developer account section – only shown in debug / test mode */}
        {debugMode && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">
                  Debug
                </span>
              </div>
            </div>

            {devAccount ? (
              <div
                data-testid="dev-account-info"
                className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 space-y-2"
              >
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Developer Account Created
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 break-all">
                  <span className="font-medium">ID:</span> {devAccount.account.id}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 break-all">
                  <span className="font-medium">Token:</span> {devAccount.token}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  Permissions:{" "}
                  {devAccount.account.permissions.join(", ")}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  ⚠️ This account is for debugging only and has limited access.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCreateDevAccount}
                disabled={devLoading}
                data-testid="create-dev-account-btn"
                className="w-full rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 transition"
              >
                {devLoading ? "Creating…" : "Create Developer Account"}
              </button>
            )}
          </>
        )}

        {/* Error message */}
        {error && (
          <p
            role="alert"
            className="text-sm text-red-600 dark:text-red-400 text-center"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
