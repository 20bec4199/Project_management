import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthState {
  /** True once the persist middleware has finished reading localStorage */
  _hasHydrated: boolean;
  /**
   * True once the /auth/me network call has resolved (success OR definitive
   * auth failure). Stays false while the call is in-flight so the dashboard
   * layout waits before deciding to redirect.
   */
  sessionChecked: boolean;
  user: AuthUser | null;
  setAuth: (user: AuthUser) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  setHasHydrated: (v: boolean) => void;
  setSessionChecked: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      sessionChecked: false,
      user: null,

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setSessionChecked: (v) => set({ sessionChecked: v }),

      setAuth: (user) => set({ user }),

      clearAuth: () => set({ user: null }),

      isAuthenticated: () => !!get().user,
    }),
    {
      name: "auth",
      // Only persist the user object — tokens live in HttpOnly cookies
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
