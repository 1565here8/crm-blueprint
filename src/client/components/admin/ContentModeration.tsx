import React, { useEffect, useState } from "react";
import {
  Check,
  Clock,
  FileText,
  Eye,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

type Submission = {
  id: string;
  title: string;
  tradition: string;
  submittedBy: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  verifiedBy?: string;
};

export function ContentModeration() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/submissions", { credentials: "include" });
      if (res.ok) {
        setSubmissions(await res.json());
      }
    } catch {}
    setLoading(false);
  }

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/admin/submissions/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) loadSubmissions();
    } catch {}
  }

  async function handleReject(id: string) {
    try {
      const res = await fetch(`/api/admin/submissions/${id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) loadSubmissions();
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) loadSubmissions();
    } catch {}
  }

  const filtered = submissions.filter((s) => filter === "all" || s.status === filter);
  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="heading-display">
          Content Moderation
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--accent-text)]">
              {pendingCount} pending
            </span>
          )}
        </h2>
        <button onClick={loadSubmissions} className="btn-premium-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-inset)] p-1.5">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              filter === f
                ? "bg-[color:var(--surface-card)] text-[color:var(--text-primary)] shadow-sm"
                : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            }`}
          >
            {f}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-[color:var(--danger)] px-1.5 py-0.5 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[color:var(--text-tertiary)]">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[color:var(--text-tertiary)]">
          {filter === "pending" ? "No pending submissions. All clear." : "No submissions match filter."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="glass-inset"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-[color:var(--text-primary)]">{sub.title}</h4>
                    <span className="rounded-full bg-[color:var(--surface-1)] px-2 py-0.5 text-xs text-[color:var(--text-secondary)]">
                      {sub.tradition}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        sub.status === "approved"
                          ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
                          : sub.status === "rejected"
                            ? "bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                    by {sub.submittedBy.slice(0, 8)}… · {new Date(sub.submittedAt).toLocaleDateString()}
                  </p>
                  {previewId === sub.id && (
                    <p className="mt-3 rounded-lg bg-[color:var(--surface-0)] p-3 text-sm text-[color:var(--text-secondary)]">
                      {sub.content}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewId(previewId === sub.id ? null : sub.id)}
                    className="rounded p-1.5 text-[color:var(--text-tertiary)] hover:bg-[color:var(--surface-1)]"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {sub.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(sub.id)}
                        className="rounded p-1.5 text-[color:var(--success)] hover:bg-[color:var(--success-soft)]"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReject(sub.id)}
                        className="rounded p-1.5 text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)]"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="rounded p-1.5 text-[color:var(--text-tertiary)] hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
