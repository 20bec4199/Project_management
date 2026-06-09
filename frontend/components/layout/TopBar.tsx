"use client";

import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useAuthStore, type AuthState } from "../../store/auth.store";
import { useOrgStore, type OrgState } from "../../store/org.store";
import { NotificationBell } from "../notifications/NotificationBell";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore((s: AuthState) => s);
  const clearOrg = useOrgStore((s: OrgState) => s.clearOrg);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore — clear client state regardless
    } finally {
      clearAuth();
      clearOrg();
      router.push("/login");
    }
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 shrink-0">
      {/* Hamburger — visible only on mobile */}
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition md:hidden"
        aria-label="Open navigation"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Spacer on desktop (hamburger takes left space on mobile) */}
      <div className="hidden md:block" />

      {/* Right side: notifications + user menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />
        <span className="text-sm text-gray-600 hidden sm:block truncate max-w-[160px]">
          {user?.email}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900 transition whitespace-nowrap"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
