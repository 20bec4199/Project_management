"use client";

import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useAuthStore, type AuthState } from "../../store/auth.store";
import { useOrgStore, type OrgState } from "../../store/org.store";
import { NotificationBell } from "../notifications/NotificationBell";

export function TopBar() {
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
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />

      {/* Right side: notifications + user menu */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        <span className="text-sm text-gray-600">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900 transition"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
