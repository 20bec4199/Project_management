import axios from "axios";
import { useAuthStore } from "../store/auth.store";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  headers: { "Content-Type": "application/json" },
  // Send HttpOnly cookies on every request (access_token + refresh_token)
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

function drainQueue(ok: boolean) {
  refreshQueue.forEach((cb) => cb(ok));
  refreshQueue = [];
}

// On 401: attempt silent token refresh, then retry the original request once.
api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      // Don't retry the refresh or login endpoints themselves
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      if (isRefreshing) {
        // Queue concurrent requests while refresh is in-flight
        return new Promise((resolve, reject) => {
          refreshQueue.push((ok) => {
            if (ok) resolve(api(originalRequest));
            else reject(error);
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        drainQueue(true);
        return api(originalRequest);
      } catch {
        drainQueue(false);
        // Clear the Zustand user — the dashboard layout will redirect to /login
        // via the normal Next.js router (no hard window.location redirect needed).
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
