import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export type OrgRole =
  | "owner"
  | "admin"
  | "cto"
  | "project_manager"
  | "tech_lead"
  | "scrum_master"
  | "product_owner"
  | "senior_developer"
  | "developer"
  | "qa_engineer"
  | "devops_engineer"
  | "designer"
  | "data_analyst"
  | "security_engineer"
  | "member"
  | "viewer";

export interface OrgMember {
  id: string;
  userId: string;
  role: OrgRole;
  user: { id: string; email: string; name?: string | null };
}

export interface OrgInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export type ProjectStatus = "active" | "archived" | "completed";

export interface Project {
  id: string;
  orgId: string;
  name: string;
  status: ProjectStatus;
  createdBy: string;
}

export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
}

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  orgId: string;
  projectId: string;
  title: string;
  description?: string;
  /** All users assigned to this task */
  assignees: Array<{ id: string; email: string; name?: string | null }>;
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: { id: string; email: string };
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor?: { id: string; email: string };
}

export interface PaginatedTasks {
  data: Task[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface Notification {
  id: string;
  type: string;
  isRead: boolean;
  payload: Record<string, unknown>;
  createdAt: string;
}

// ── Orgs ──────────────────────────────────────────────────────────────────────

export function useMyOrgs() {
  return useQuery({
    queryKey: ["orgs"],
    queryFn: () => api.get<Org[]>("/orgs").then((r) => r.data),
  });
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["orgs", orgId, "members"],
    queryFn: () =>
      api.get<OrgMember[]>(`/orgs/${orgId}/members`).then((r) => r.data),
    enabled: !!orgId,
  });
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function useProjects(orgId: string | undefined) {
  return useQuery({
    queryKey: ["orgs", orgId, "projects"],
    queryFn: () =>
      api.get<Project[]>(`/orgs/${orgId}/projects`).then((r) => r.data),
    enabled: !!orgId,
  });
}

export function useProjectStats(orgId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: ["orgs", orgId, "projects", projectId, "stats"],
    queryFn: () =>
      api
        .get<ProjectStats>(`/orgs/${orgId}/projects/${projectId}/stats`)
        .then((r) => r.data),
    enabled: !!orgId && !!projectId,
    staleTime: 2 * 60 * 1000, // matches backend TTL
  });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function useTasks(orgId: string | undefined, params?: Record<string, string>) {
  return useQuery({
    queryKey: ["orgs", orgId, "tasks", params],
    queryFn: () =>
      api
        .get<PaginatedTasks>(`/orgs/${orgId}/tasks`, { params })
        .then((r) => r.data),
    enabled: !!orgId,
  });
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  /** One or more user IDs to assign */
  assigneeIds?: string[];
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}

export function useCreateTask(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTaskInput) =>
      api.post<Task>(`/orgs/${orgId}/tasks`, dto).then((r) => r.data),

    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: ["orgs", orgId, "tasks"] });
      const snapshot = queryClient.getQueryData<PaginatedTasks>(["orgs", orgId, "tasks", undefined]);
      if (snapshot) {
        const optimistic: Task = {
          id: `optimistic-${Date.now()}`,
          orgId,
          projectId: dto.projectId,
          title: dto.title,
          description: dto.description,
          assignees: [],
          createdBy: "",
          status: dto.status ?? "todo",
          priority: dto.priority ?? "medium",
          dueDate: dto.dueDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<PaginatedTasks>(["orgs", orgId, "tasks", undefined], {
          ...snapshot,
          data: [optimistic, ...snapshot.data],
        });
      }
      return { snapshot };
    },

    onError: (_err, _dto, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(["orgs", orgId, "tasks", undefined], ctx.snapshot);
      }
    },

    onSettled: (_data, _err, dto) => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "tasks"] });
      void queryClient.invalidateQueries({
        queryKey: ["orgs", orgId, "projects", dto.projectId, "stats"],
      });
    },
  });
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  /** Replace the full assignee list; pass [] to remove all */
  assigneeIds?: string[] | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export function useUpdateTaskOptimistic(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, dto }: { taskId: string; dto: UpdateTaskInput }) =>
      api.patch<Task>(`/orgs/${orgId}/tasks/${taskId}`, dto).then((r) => r.data),

    onMutate: async ({ taskId, dto }) => {
      await queryClient.cancelQueries({ queryKey: ["orgs", orgId, "tasks"] });
      const snapshot = queryClient.getQueryData<PaginatedTasks>(["orgs", orgId, "tasks", undefined]);
      if (snapshot) {
        queryClient.setQueryData<PaginatedTasks>(["orgs", orgId, "tasks", undefined], {
          ...snapshot,
          data: snapshot.data.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  ...dto,
                  dueDate: dto.dueDate ?? undefined,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        });
      }
      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(["orgs", orgId, "tasks", undefined], ctx.snapshot);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "tasks"] });
    },
  });
}

export function useDeleteTask(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api.delete(`/orgs/${orgId}/tasks/${taskId}`),

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["orgs", orgId, "tasks"] });
      const snapshot = queryClient.getQueryData<PaginatedTasks>(["orgs", orgId, "tasks", undefined]);
      if (snapshot) {
        queryClient.setQueryData<PaginatedTasks>(["orgs", orgId, "tasks", undefined], {
          ...snapshot,
          data: snapshot.data.filter((t) => t.id !== taskId),
        });
      }
      return { snapshot };
    },

    onError: (_err, _taskId, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(["orgs", orgId, "tasks", undefined], ctx.snapshot);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "tasks"] });
    },
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useNotificationsQuery(orgId: string | undefined, pollingInterval?: number) {
  return useQuery({
    queryKey: ["orgs", orgId, "notifications"],
    queryFn: () =>
      api
        .get<Notification[]>(`/orgs/${orgId}/notifications`)
        .then((r) => r.data),
    enabled: !!orgId,
    refetchInterval: pollingInterval,
  });
}

export function useUnreadCount(orgId: string | undefined, pollingInterval?: number) {
  return useQuery({
    queryKey: ["orgs", orgId, "notifications", "unread-count"],
    queryFn: () =>
      api
        .get<{ count: number }>(`/orgs/${orgId}/notifications/unread-count`)
        .then((r) => r.data),
    enabled: !!orgId,
    refetchInterval: pollingInterval,
  });
}

export function useMarkNotificationRead(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notifId: string) =>
      api.patch(`/orgs/${orgId}/notifications/${notifId}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead(orgId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/orgs/${orgId}/notifications/read-all`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orgs", orgId, "notifications"] });
    },
  });
}


// ── Additional Org hooks ──────────────────────────────────────────────────────

export function useOrgInvites(orgId: string) {
  return useQuery<OrgInvite[]>({
    queryKey: ["orgs", orgId, "invites"],
    queryFn: async () => (await api.get(`/orgs/${orgId}/invites`)).data,
    enabled: !!orgId,
  });
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      api.post<Org>("/orgs", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orgs"] }),
  });
}

export function useInviteMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post(`/orgs/${orgId}/invites`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["orgs", orgId, "invites"] }),
  });
}

export function useRevokeInvite(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      api.delete(`/orgs/${orgId}/invites/${inviteId}`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["orgs", orgId, "invites"] }),
  });
}

export function useUpdateMemberRole(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api
        .patch(`/orgs/${orgId}/members/${memberId}/role`, { role })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["orgs", orgId, "members"] }),
  });
}

export function useRemoveMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/orgs/${orgId}/members/${memberId}`).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["orgs", orgId, "members"] }),
  });
}

// ── Additional Project hooks ──────────────────────────────────────────────────

export function useProject(orgId: string, projectId: string) {
  return useQuery<Project>({
    queryKey: ["orgs", orgId, "projects", projectId],
    queryFn: async () =>
      (await api.get(`/orgs/${orgId}/projects/${projectId}`)).data,
    enabled: !!(orgId && projectId),
  });
}

export function useCreateProject(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; status?: string }) =>
      api.post<Project>(`/orgs/${orgId}/projects`, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["orgs", orgId, "projects"] }),
  });
}

export function useArchiveProject(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api
        .patch(`/orgs/${orgId}/projects/${projectId}/archive`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["orgs", orgId, "projects"] }),
  });
}

// ── Additional Task hooks ─────────────────────────────────────────────────────

export function useTask(orgId: string, taskId: string) {
  return useQuery<Task>({
    queryKey: ["orgs", orgId, "tasks", taskId],
    queryFn: async () =>
      (await api.get(`/orgs/${orgId}/tasks/${taskId}`)).data,
    enabled: !!(orgId && taskId),
  });
}

export function useUpdateTask(orgId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTaskInput) =>
      api
        .patch<Task>(`/orgs/${orgId}/tasks/${taskId}`, data)
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["orgs", orgId, "tasks"] });
    },
  });
}

export function useTaskComments(orgId: string, taskId: string) {
  return useQuery<TaskComment[]>({
    queryKey: ["orgs", orgId, "tasks", taskId, "comments"],
    queryFn: async () =>
      (await api.get(`/orgs/${orgId}/tasks/${taskId}/comments`)).data,
    enabled: !!(orgId && taskId),
  });
}

export function useAddComment(orgId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api
        .post(`/orgs/${orgId}/tasks/${taskId}/comments`, { body })
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["orgs", orgId, "tasks", taskId, "comments"],
      }),
  });
}

export function useDeleteComment(orgId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      api
        .delete(`/orgs/${orgId}/tasks/${taskId}/comments/${commentId}`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["orgs", orgId, "tasks", taskId, "comments"],
      }),
  });
}

export function useTaskActivity(orgId: string, taskId: string) {
  return useQuery<TaskActivity[]>({
    queryKey: ["orgs", orgId, "tasks", taskId, "activity"],
    queryFn: async () =>
      (await api.get(`/orgs/${orgId}/tasks/${taskId}/activity`)).data,
    enabled: !!(orgId && taskId),
  });
}

