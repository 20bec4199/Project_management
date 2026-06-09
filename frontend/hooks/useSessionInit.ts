"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth.store";

interface MeResponse {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Runs once per app mount after Zustand has rehydrated from localStorage.
 *
 * Calls GET /auth/me — the HttpOnly access_token cookie is sent automatically.
 * The axios interceptor silently refreshes the access token if it is expired.
 *
 * Rules:
 *  - On success            → update the store with the latest user data
 *  - On definitive 401     → the interceptor already tried refreshing and
 *                            failed; clear the user so the layout can redirect
 *  - On any other error    → keep the current user (network blip, 5xx, etc.)
 *                            and still mark the session as checked so the layout
 *                            does not spin forever
 */
export function useSessionInit() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setSessionChecked = useAuthStore((s) => s.setSessionChecked);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const called = useRef(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (called.current) return;
    called.current = true;

    api
      .get<MeResponse>("/auth/me")
      .then(({ data }) => {
        setAuth({ id: data.id, email: data.email, name: data.name });
      })
      .catch((err: unknown) => {
        // Only clear the session for a definitive auth rejection.
        // The refresh interceptor already attempted token rotation before this
        // catch is reached, so a 401 here means both tokens are invalid.
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          clearAuth();
        }
        // For 404, 5xx, network errors, etc. — keep the existing user state.
      })
      .finally(() => {
        // Always mark the session as checked so the layout can stop spinning.
        setSessionChecked(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);
}
