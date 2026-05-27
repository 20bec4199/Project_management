"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  useProjects,
  useCreateProject,
  useArchiveProject,
  type Project,
  type ProjectStatus,
} from "../../../../../lib/hooks";

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
};

export default function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: projects, isLoading } = useProjects(orgId);
  const createProject = useCreateProject(orgId);
  const archiveProject = useArchiveProject(orgId);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createProject.mutateAsync({ name: newName });
      setNewName("");
      setShowCreate(false);
    } catch {
      setError("Failed to create project.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + New project
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3"
        >
          <h2 className="font-semibold text-gray-800">New project</h2>
          <input
            autoFocus
            required
            placeholder="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createProject.isPending}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {createProject.isPending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-sm text-gray-500 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="space-y-2">
        {projects?.map((p) => (
          <div
            key={p.id}
            className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-gray-300 transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href={`/orgs/${orgId}/projects/${p.id}`}
                className="font-medium text-gray-900 hover:text-blue-600 truncate"
              >
                {p.name}
              </Link>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[p.status] ?? ""}`}
              >
                {p.status.toUpperCase()}
              </span>
            </div>
            {p.status !== "archived" && (
              <button
                onClick={() => archiveProject.mutate(p.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition ml-4 shrink-0"
              >
                Archive
              </button>
            )}
          </div>
        ))}

        {projects?.length === 0 && !isLoading && (
          <p className="text-center py-12 text-gray-400">
            No projects yet. Create one above.
          </p>
        )}
      </div>
    </div>
  );
}
