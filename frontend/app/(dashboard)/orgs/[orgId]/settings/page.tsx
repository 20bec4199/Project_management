"use client";

import { useParams } from "next/navigation";
import { useOrgStore, type OrgState } from "../../../../../store/org.store";

export default function SettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const activeOrg = useOrgStore((s: OrgState) => s.activeOrg);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Organization ID
          </p>
          <p className="text-sm font-mono text-gray-700">{orgId}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Name
          </p>
          <p className="text-sm text-gray-900">{activeOrg?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Slug
          </p>
          <p className="text-sm font-mono text-gray-700">
            {activeOrg?.slug ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Plan
          </p>
          <p className="text-sm text-gray-900 capitalize">
            {activeOrg?.plan?.toLowerCase() ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
