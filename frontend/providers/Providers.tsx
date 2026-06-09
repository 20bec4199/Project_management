"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "../lib/query-client";
import { useSessionInit } from "../hooks/useSessionInit";

/** Inner component so it can call hooks that depend on QueryClientProvider */
function AppInit({ children }: { children: React.ReactNode }) {
  useSessionInit();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInit>{children}</AppInit>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
