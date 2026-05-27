"use client";

import { useEffect, useRef } from "react";
import { useNotifications } from "../../hooks/useNotifications";
import type { Notification } from "../../lib/hooks";

const NOTIF_LABELS: Record<string, string> = {
  task_assigned: "You were assigned a task",
  task_updated: "A task was updated",
  comment_added: "New comment on a task",
  member_joined: "A new member joined",
  project_created: "A new project was created",
};

function label(type: string) {
  return NOTIF_LABELS[type] ?? "New notification";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationInbox({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, connected, markRead, markAllRead } =
    useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-semibold text-sm text-gray-800">
          Notifications
        </span>
        <div className="flex items-center gap-2">
          {!connected && (
            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
              Polling
            </span>
          )}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-xs text-indigo-600 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">
            All caught up!
          </p>
        ) : (
          notifications.map((n: Notification) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`px-4 py-3 hover:bg-gray-50 transition cursor-pointer ${
                n.isRead ? "opacity-60" : ""
              }`}
            >
              {!n.isRead && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2 align-middle" />
              )}
              <span className="text-sm text-gray-800">{label(n.type)}</span>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(n.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
