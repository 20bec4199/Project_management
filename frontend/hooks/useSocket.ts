/* eslint-disable react-hooks/refs */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore, type AuthState } from "../store/auth.store";

const SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(
    /\/api$/,
    "",
  );

export interface UseSocketOptions {
  orgId?: string;
  onTaskCreated?: (task: unknown) => void;
  onTaskUpdated?: (task: unknown) => void;
  onTaskDeleted?: (data: { id: string }) => void;
  onNotification?: (notification: unknown) => void;
}

export interface UseSocketReturn {
  connected: boolean;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { orgId, onTaskCreated, onTaskUpdated, onTaskDeleted, onNotification } =
    options;

  const user = useAuthStore((s: AuthState) => s.user);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Stable callback refs to avoid reconnecting on every render
  const onTaskCreatedRef = useRef(onTaskCreated);
  const onTaskUpdatedRef = useRef(onTaskUpdated);
  const onTaskDeletedRef = useRef(onTaskDeleted);
  const onNotificationRef = useRef(onNotification);
  onTaskCreatedRef.current = onTaskCreated;
  onTaskUpdatedRef.current = onTaskUpdated;
  onTaskDeletedRef.current = onTaskDeleted;
  onNotificationRef.current = onNotification;

  const stableTaskCreated = useCallback((d: unknown) => onTaskCreatedRef.current?.(d), []);
  const stableTaskUpdated = useCallback((d: unknown) => onTaskUpdatedRef.current?.(d), []);
  const stableTaskDeleted = useCallback((d: { id: string }) => onTaskDeletedRef.current?.(d), []);
  const stableNotification = useCallback((d: unknown) => onNotificationRef.current?.(d), []);

  useEffect(() => {
    if (!user) return;

    // Cookies are sent automatically; withCredentials handles auth
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (orgId) socket.emit("join-org", orgId);
    });

    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));    

    socket.on("task:created", stableTaskCreated);
    socket.on("task:updated", stableTaskUpdated);
    socket.on("task:deleted", stableTaskDeleted);
    socket.on("notification", stableNotification);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orgId]);

  return { connected };
}
