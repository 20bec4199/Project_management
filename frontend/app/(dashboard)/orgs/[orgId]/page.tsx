"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useProjects, useCreateProject, type Project } from "../../../../lib/hooks";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
};

export default function OrgOverviewPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: projects, isLoading } = useProjects(orgId);

  return (
    <div>
      <div className="flex items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500">All projects in this organization</p>
        </div>
        <Link
          href={`/orgs/${orgId}/projects`}
          className="text-sm text-blue-600 hover:underline shrink-0"
        >
          View all projects →
        </Link>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.slice(0, 6).map((p) => (
          <Link
            key={p.id}
            href={`/orgs/${orgId}/projects/${p.id}`}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition block"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                {p.status.toUpperCase()}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {projects?.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-3">No projects yet.</p>
          <Link
            href={`/orgs/${orgId}/projects`}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Create first project
          </Link>
        </div>
      )}
    </div>
  );
}
