export type NetworkCoreMode = "cloud" | "local" | "mesh";

export type ID = string;

export type TextRole = "user" | "assistant";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface User {
  id: ID;
  createdAt: string;
}

export interface Tokens {
  userId: ID;
  balance: number;
  updatedAt: string;
}

export interface Job {
  id: ID;
  userId: ID;
  mode: NetworkCoreMode;
  status: JobStatus;
  createdAt: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface TextHistoryLog {
  id: ID;
  userId: ID;
  role: TextRole;
  content: string;
  createdAt: string;
}

export interface AdminMetrics {
  summary: {
    registeredUsers: number;
    totalJobs: number;
    failedJobs: number;
  };
  jobQueues: Array<{
    mode: NetworkCoreMode;
    queued: number;
    running: number;
    completed30m: number;
  }>;
  transactionHistory: Array<{
    id: ID;
    userId: ID;
    tokensDelta: number;
    reason: string;
    createdAt: string;
  }>;
}
