import type { NetworkCoreMode } from "../networkCore";

export interface MeResponse {
  user: { id: string; role: "user" | "admin"; tokens: number } | null;
}
export interface AdminMetrics {
  summary: { registeredUsers: number; totalJobs: number; failedJobs: number };
  jobQueues: Array<{ mode: string; queued: number; running: number; completed30m: number }>;
  transactionHistory: Array<{ id: string; reason: string; tokensDelta: number }>;
}

let csrfToken: string | null = null;

export async function ensureCsrfToken(): Promise<void> {
  if (csrfToken) return;
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  if (res.ok) {
    const body: { token: string } | null = await res.json().catch(() => null);
    if (body?.token) csrfToken = body.token;
  }
}

function getCsrfToken(): string | undefined {
  return csrfToken ?? undefined;
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.method && options.method !== "GET"
        ? { "x-csrf-token": getCsrfToken() ?? "" }
        : {}),
      ...((options?.headers as Record<string, string>) ?? {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function bootstrapSession(): Promise<MeResponse> {
  return api<MeResponse>("/api/auth/bootstrap", { method: "POST" });
}

export async function fetchMe(): Promise<MeResponse> {
  return api<MeResponse>("/api/me");
}

export async function fetchDeploymentConfig(): Promise<Record<string, unknown>> {
  return api("/api/deployment");
}

export async function fetchBillingConfig(): Promise<Record<string, unknown>> {
  return api("/api/billing");
}

export async function fetchAdminMetrics(opts?: {
  signal?: AbortSignal;
}): Promise<AdminMetrics> {
  return api("/api/admin/metrics", { signal: opts?.signal });
}

export async function fetchOpsMetrics(opts?: { signal?: AbortSignal }): Promise<unknown> {
  return api("/api/metrics", { signal: opts?.signal });
}


