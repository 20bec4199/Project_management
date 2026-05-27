"use client";

import { useParams } from "next/navigation";

/** Returns the :orgId param from the current route. */
export function useOrgId(): string {
  const params = useParams<{ orgId: string }>();
  return params.orgId ?? "";
}
