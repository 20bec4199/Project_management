"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  useTasks,
  useDeleteTask,
  useProjects,
  type TaskStatus,
  type TaskPriority,
} from "../../../../../lib/hooks";

const STATUS_OPTIONS: Array<TaskStatus | ""> = [
  "", "backlog", "todo", "in_progress", "in_review", "done",
];
const PRIORITY_OPTIONS: Array<TaskPriority | ""> = [
  "", "low", "medium", "high", "urgent",
];

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

export default function TasksPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const deleteTask = useDeleteTask(orgId);
  const { data: projects } = useProjects(orgId);

  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [search, setSearch] = useState("");

  const { data: tasks, isLoading } = useTasks(orgId, {
    ...(projectId && { projectId }),
    ...(status && { status }),
    ...(priority && { priority }),
    ...(search && { search }),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tasks</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none w-44"
        />
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All projects</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace("_", " ").toUpperCase() : "All statuses"}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority | "")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p ? p.toUpperCase() : "All priorities"}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="space-y-2">
        {tasks?.data.map((task) => (
          <div
            key={task.id}
            className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-4 hover:border-gray-300 transition"
          >
            <span className={`text-xs font-bold w-4 shrink-0 ${PRIORITY_COLORS[task.priority] ?? ""}`}>
              {task.priority[0]}
            </span>
            <Link
              href={`/orgs/${orgId}/tasks/${task.id}`}
              className="flex-1 font-medium text-gray-900 hover:text-blue-600 truncate"
            >
              {task.title}
            </Link>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[task.status] ?? ""}`}
            >
              {task.status.replace("_", " ").toUpperCase()}
            </span>
            {task.dueDate && (
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            <button
              onClick={() => deleteTask.mutate(task.id)}
              className="text-xs text-gray-300 hover:text-red-500 transition shrink-0"
            >
              ✕
            </button>
          </div>
        ))}

        {tasks?.data.length === 0 && !isLoading && (
          <p className="text-center py-12 text-gray-400">No tasks found.</p>
        )}
      </div>

      {tasks?.hasNextPage && (
        <p className="text-center mt-4 text-sm text-gray-400">
          More tasks available — use the API for cursor navigation.
        </p>
      )}
    </div>
  );
}
