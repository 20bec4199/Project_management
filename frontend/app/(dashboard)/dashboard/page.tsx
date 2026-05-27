"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMyOrgs, useCreateOrg, type Org } from "../../../lib/hooks";
import { useOrgStore, type OrgState } from "../../../store/org.store";

export default function DashboardPage() {
  const router = useRouter();
  const setActiveOrg = useOrgStore((s: OrgState) => s.setActiveOrg);
  const { data: orgs, isLoading } = useMyOrgs();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const createOrg = useCreateOrg();

  function handleSelect(org: Org) {
    setActiveOrg({ id: org.id, name: org.name, slug: org.slug, plan: org.plan });
    router.push(`/orgs/${org.id}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    try {
      const org = await createOrg.mutateAsync({ name, slug });
      handleSelect(org);
    } catch {
      setCreateError("Failed to create organization.");
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Select Organization
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Choose an organization to continue, or create a new one.
      </p>

      {isLoading && (
        <p className="text-sm text-gray-400">Loading organizations…</p>
      )}

      <div className="space-y-2 mb-6">
        {orgs?.map((org) => (
          <button
            key={org.id}
            onClick={() => handleSelect(org)}
            className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 bg-white hover:border-blue-400 hover:shadow-sm transition"
          >
            <p className="font-medium text-gray-900">{org.name}</p>
            <p className="text-xs text-gray-400">{org.slug} · {org.plan}</p>
          </button>
        ))}
      </div>

      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm text-blue-600 hover:underline"
        >
          + Create new organization
        </button>
      ) : (
        <form
          onSubmit={handleCreate}
          className="border border-gray-200 rounded-xl p-5 bg-white space-y-3"
        >
          <h2 className="font-semibold text-gray-800">New organization</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Slug
            </label>
            <input
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {createError && (
            <p className="text-sm text-red-600">{createError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createOrg.isPending}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {createOrg.isPending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
