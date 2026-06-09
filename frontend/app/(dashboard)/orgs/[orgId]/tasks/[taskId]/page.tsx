"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  useTask,
  useUpdateTask,
  useDeleteTask,
  useTaskComments,
  useAddComment,
  useDeleteComment,
  useTaskActivity,
  useOrgMembers,
  type TaskStatus,
  type TaskPriority,
} from "../../../../../../lib/hooks";
import { useAuthStore, type AuthState } from "../../../../../../store/auth.store";
import { useRouter } from "next/navigation";

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

/** Initials avatar for a user */
function Avatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase();
  return (
    <span
      title={email}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold ring-2 ring-white"
    >
      {initials}
    </span>
  );
}

export default function TaskDetailPage() {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s: AuthState) => s.user?.id);

  const { data: task, isLoading } = useTask(orgId, taskId);
  const { data: comments } = useTaskComments(orgId, taskId);
  const { data: activity } = useTaskActivity(orgId, taskId);
  const { data: members } = useOrgMembers(orgId);

  const updateTask = useUpdateTask(orgId, taskId);
  const deleteTask = useDeleteTask(orgId);
  const addComment = useAddComment(orgId, taskId);
  const deleteComment = useDeleteComment(orgId, taskId);

  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

  if (isLoading || !task) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  const currentAssigneeIds = task.assignees?.map((a) => a.id) ?? [];

  async function saveTitle() {
    if (!title.trim() || title === task!.title) { setEditTitle(false); return; }
    await updateTask.mutateAsync({ title });
    setEditTitle(false);
  }

  async function handleStatusChange(status: TaskStatus) {
    await updateTask.mutateAsync({ status });
  }

  async function handlePriorityChange(priority: TaskPriority) {
    await updateTask.mutateAsync({ priority });
  }

  async function toggleAssignee(memberId: string) {
    const next = currentAssigneeIds.includes(memberId)
      ? currentAssigneeIds.filter((id) => id !== memberId)
      : [...currentAssigneeIds, memberId];
    await updateTask.mutateAsync({ assigneeIds: next });
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    await addComment.mutateAsync(commentBody);
    setCommentBody("");
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    await deleteTask.mutateAsync(taskId);
    router.push(`/orgs/${orgId}/tasks`);
  }

  return (
    <div className="max-w-3xl w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href={`/orgs/${orgId}/tasks`} className="hover:text-gray-900">
          Tasks
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{task.title}</span>
      </div>

      {/* Title */}
      <div className="mb-4">
        {editTitle ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              className="flex-1 text-2xl font-bold border-b-2 border-blue-500 focus:outline-none"
            />
          </div>
        ) : (
          <h1
            className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition"
            onClick={() => { setTitle(task.title); setEditTitle(true); }}
          >
            {task.title}
          </h1>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[task.status] ?? ""}`}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>
          ))}
        </select>
        <select
          value={task.priority}
          onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
          className="text-xs px-3 py-1.5 rounded-full font-medium border border-gray-200 cursor-pointer bg-white"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {task.dueDate && (
          <span className="text-xs text-gray-500 px-3 py-1.5 bg-gray-100 rounded-full">
            Due {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        <button
          onClick={handleDelete}
          className="text-xs text-gray-400 hover:text-red-500 transition sm:ml-auto"
        >
          Delete task
        </button>
      </div>

      {/* Assignees */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Assignees ({task.assignees?.length ?? 0})
          </span>
          <button
            onClick={() => setShowAssigneePicker((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showAssigneePicker ? "Done" : "Edit"}
          </button>
        </div>

        {/* Current assignees */}
        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {task.assignees.map((a) => (
              <div key={a.id} className="flex items-center gap-1.5">
                <Avatar email={a.email} />
                <span className="text-xs text-gray-700">{a.name ?? a.email}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mb-3">No assignees yet.</p>
        )}

        {/* Member picker */}
        {showAssigneePicker && members && (
          <div className="border-t border-gray-100 pt-3 space-y-1 max-h-48 overflow-y-auto">
            {members.map((m) => {
              const assigned = currentAssigneeIds.includes(m.userId);
              return (
                <label
                  key={m.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={assigned}
                    onChange={() => toggleAssignee(m.userId)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Avatar email={m.user?.email ?? m.userId} />
                  <span className="text-xs text-gray-700">
                    {m.user?.name ?? m.user?.email ?? m.userId}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">{m.role}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6">
          {task.description}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-4">
        {(["comments", "activity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium capitalize transition border-b-2 -mb-px ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "comments" && (
        <div className="space-y-3">
          {comments?.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">
                  {c.author?.email ?? c.authorId}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                  {c.authorId === userId && (
                    <button
                      onClick={() => deleteComment.mutate(c.id)}
                      className="text-xs text-gray-300 hover:text-red-500 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}

          <form onSubmit={handleAddComment} className="flex flex-col sm:flex-row gap-2 pt-2">
            <textarea
              rows={2}
              placeholder="Add a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              type="submit"
              disabled={addComment.isPending || !commentBody.trim()}
              className="bg-blue-600 text-white text-sm px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition sm:self-end py-2"
            >
              Post
            </button>
          </form>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-2">
          {activity?.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 text-sm py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-gray-400 shrink-0">
                {new Date(a.createdAt).toLocaleString()}
              </span>
              <span className="text-gray-600">
                <span className="font-medium">{a.actor?.email ?? a.actorId}</span>{" "}
                {a.action.toLowerCase().replace("_", " ")}
                {a.metadata && Object.keys(a.metadata).length > 0 && (
                  <span className="text-gray-400">
                    {" "}
                    — {JSON.stringify(a.metadata)}
                  </span>
                )}
              </span>
            </div>
          ))}
          {activity?.length === 0 && (
            <p className="text-sm text-gray-400">No activity yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

