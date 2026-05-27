"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  useProject,
  useTasks,
  useCreateTask,
  useDeleteTask,
  type TaskStatus,
  type TaskPriority,
} from "../../../../../../lib/hooks";

const STATUS_OPTIONS: TaskStatus[] = [
  "backlog", "todo", "in_progress", "in_review", "done",
];

const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-gray-100 text-gray-600",
  todo: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-400",
  medium: "text-yellow-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

export default function ProjectDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const { data: project } = useProject(orgId, projectId);
  const { data: tasks, isLoading } = useTasks(orgId, { projectId });
  const createTask = useCreateTask(orgId);
  const deleteTask = useDeleteTask(orgId);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createTask.mutateAsync({ title, projectId, status, priority });
      setTitle("");
      setShowCreate(false);
    } catch {
      setError("Failed to create task.");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href={`/orgs/${orgId}/projects`} className="hover:text-gray-900">
          Projects
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{project?.name ?? "…"}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {project?.name ?? "…"}
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add task
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3"
        >
          <h2 className="font-semibold text-gray-800">New task</h2>
          <input
            autoFocus
            required
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createTask.isPending}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {createTask.isPending ? "Creating…" : "Create"}
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

      {isLoading && <p className="text-sm text-gray-400">Loading tasks…</p>}

      <div className="space-y-2">
        {tasks?.data.map((task) => (
          <div
            key={task.id}
            className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-4 hover:border-gray-300 transition"
          >
            <span className={`text-xs font-bold ${PRIORITY_COLORS[task.priority] ?? ""}`}>
              {task.priority[0]}
            </span>
            <Link
              href={`/orgs/${orgId}/tasks/${task.id}`}
              className="flex-1 font-medium text-gray-900 hover:text-blue-600 truncate"
            >
              {task.title}
            </Link>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] ?? ""}`}
            >
              {task.status.replace("_", " ").toUpperCase()}
            </span>
            <button
              onClick={() => deleteTask.mutate(task.id)}
              className="text-xs text-gray-300 hover:text-red-500 transition"
            >
              ✕
            </button>
          </div>
        ))}

        {tasks?.data.length === 0 && !isLoading && (
          <p className="text-center py-12 text-gray-400">No tasks yet.</p>
        )}
      </div>
    </div>
  );
}
