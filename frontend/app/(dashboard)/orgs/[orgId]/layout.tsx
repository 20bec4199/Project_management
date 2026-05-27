"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useOrgStore, type OrgState } from "../../../../store/org.store";
import { useMyOrgs } from "../../../../lib/hooks";

/** Syncs :orgId param into the active org store. */
export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const { activeOrg, setActiveOrg } = useOrgStore((s: OrgState) => s);
  const { data: orgs } = useMyOrgs();

  useEffect(() => {
    if (!orgId) return;
    if (activeOrg?.id === orgId) return;
    const found = orgs?.find((o) => o.id === orgId);
    if (found) {
      setActiveOrg({ id: found.id, name: found.name, slug: found.slug, plan: found.plan });
    } else if (orgs && orgs.length === 0) {
      router.replace("/dashboard");
    }
  }, [orgId, orgs, activeOrg, setActiveOrg, router]);

  return <>{children}</>;
}
