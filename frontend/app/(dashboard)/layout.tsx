"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "../../components/layout/Sidebar";
import { TopBar } from "../../components/layout/TopBar";
import { useAuthStore, type AuthState } from "../../store/auth.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s: AuthState) => s._hasHydrated);
  const sessionChecked = useAuthStore((s: AuthState) => s.sessionChecked);
  const user = useAuthStore((s: AuthState) => s.user);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Only redirect once we know for certain the session is invalid:
    //   1. Zustand has finished reading localStorage (_hasHydrated)
    //   2. The /auth/me network call has resolved (sessionChecked)
    //   3. There is still no user
    // This prevents the flash-redirect that happened when user was null only
    // because the cookie check hadn't completed yet.
    if (hasHydrated && sessionChecked && !user) {
      router.replace("/login");
    }
  }, [hasHydrated, sessionChecked, user, router]);

  // ── Loading states ──────────────────────────────────────────────────────────
  // Case 1: Zustand hasn't read localStorage yet.
  // Case 2: No user in localStorage AND session check still in flight
  //         (e.g. user cleared localStorage manually but still has valid cookies).
  const isLoading = !hasHydrated || (!user && !sessionChecked);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Session check is done and user is null — redirect is in-flight via useEffect.
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
