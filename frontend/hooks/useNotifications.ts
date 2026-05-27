"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOrgStore, type OrgState } from "../store/org.store";
import {
  useNotificationsQuery,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from "../lib/hooks";
import { useSocket } from "./useSocket";

const POLLING_INTERVAL = 15_000; // 15 s fallback when WS is disconnected

export function useNotifications() {
  const orgId = useOrgStore((s: OrgState) => s.activeOrg?.id);
  const queryClient = useQueryClient();

  const onNotification = useCallback(
    (notif: unknown) => {
      queryClient.setQueryData<Notification[]>(
        ["orgs", orgId, "notifications"],
        (old = []) => [notif as Notification, ...old],
      );
      void queryClient.invalidateQueries({
        queryKey: ["orgs", orgId, "notifications", "unread-count"],
      });
    },
    [orgId, queryClient],
  );

  const { connected } = useSocket({ orgId, onNotification });

  const polling = connected ? undefined : POLLING_INTERVAL;

  const { data: notifications = [] } = useNotificationsQuery(orgId, polling);
  const { data: unreadData } = useUnreadCount(orgId, polling);

  const { mutate: markRead } = useMarkNotificationRead(orgId);
  const { mutate: markAllRead } = useMarkAllNotificationsRead(orgId);

  return {
    notifications,
    unreadCount: unreadData?.count ?? 0,
    connected,
    markRead,
    markAllRead,
  };
}
