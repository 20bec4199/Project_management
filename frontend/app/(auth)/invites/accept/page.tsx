"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { useAuthStore, type AuthState } from "../../../../store/auth.store";
import { useOrgStore } from "../../../../store/org.store";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AcceptResult {
  orgId: string;
  orgName: string;
  role: string;
}

type Stage = "init" | "needs-auth" | "accepting" | "success" | "error";

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg =
      (err.response?.data as { message?: string })?.message ?? err.message;
    return Array.isArray(msg) ? msg.join(", ") : msg;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const { user, setAuth } = useAuthStore((s: AuthState) => s);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);

  const [stage, setStage] = useState<Stage>("init");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<AcceptResult | null>(null);

  // Auth form
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // ── Accept logic ────────────────────────────────────────────────────────────

  const doAccept = useCallback(async () => {
    if (!token) return;
    setStage("accepting");
    try {
      const { data } = await api.post<AcceptResult>("/invites/accept", { token });
      setResult(data);
      setStage("success");
    } catch (err) {
      setErrorMsg(extractError(err));
      setStage("error");
    }
  }, [token]);

  // On mount: if no token → error; if already authed → auto-accept
  useEffect(() => {
    if (!token) {
      setErrorMsg("Invalid or missing invite link.");
      setStage("error");
      return;
    }
    if (user) {
      void doAccept();
    } else {
      setStage("needs-auth");
    }
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth form submit ────────────────────────────────────────────────────────

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setAuthError(null);
    setAuthLoading(true);

    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post<{
        user: { id: string; email: string; name?: string | null };
      }>(endpoint, { email, password });

      // Store user info — tokens are in HttpOnly cookies
      setAuth(data.user);

      // Accept right away without waiting for a re-render
      await doAccept();
    } catch (err) {
      setAuthError(extractError(err));
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Go to dashboard after success ───────────────────────────────────────────

  function goToDashboard() {
    if (result) {
      setActiveOrg({
        id: result.orgId,
        name: result.orgName,
        slug: "",
        plan: "free",
      });
    }
    router.push("/dashboard");
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (stage === "init" || stage === "accepting") {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500">
          {stage === "accepting" ? "Accepting invitation…" : "Loading…"}
        </p>
      </div>
    );
  }

  if (stage === "success" && result) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          You&apos;re in!
        </h1>
        <p className="text-sm text-gray-500 mb-1">
          You&apos;ve joined{" "}
          <span className="font-semibold text-gray-800">{result.orgName}</span>{" "}
          as a{" "}
          <span className="capitalize font-medium text-indigo-600">
            {result.role}
          </span>
          .
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Welcome to the team! 🎉
        </p>
        <button
          onClick={goToDashboard}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition text-sm"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Invitation failed
        </h1>
        <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
        <Link
          href="/dashboard"
          className="inline-block py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition text-sm"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // needs-auth: show login / register form
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Banner */}
      <div className="bg-indigo-600 px-6 py-5 text-center">
        <h1 className="text-lg font-bold text-white">You&apos;ve been invited!</h1>
        <p className="text-indigo-200 text-sm mt-1">
          Sign in or create an account to accept your invitation.
        </p>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-5">
          {(["login", "register"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setAuthMode(mode);
                setAuthError(null);
              }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                authMode === mode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {authError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition text-sm"
          >
            {authLoading
              ? "Please wait…"
              : authMode === "login"
              ? "Sign In & Accept"
              : "Register & Accept"}
          </button>
        </form>
      </div>
    </div>
  );
}
