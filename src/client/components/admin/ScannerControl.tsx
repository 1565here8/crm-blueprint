import React, { useEffect, useState } from "react";
import {
  Activity,
  Clock,
  RefreshCw,
  Settings,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";

type ScannerStatus = {
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  runsToday: number;
  spellsFound: number;
  errors: number;
  sources: string[];
};

export function ScannerControl() {
  const [status, setStatus] = useState<ScannerStatus>({
    enabled: false,
    lastRun: null,
    nextRun: null,
    runsToday: 0,
    spellsFound: 0,
    errors: 0,
    sources: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scanner", { credentials: "include" });
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {}
    setLoading(false);
  }

  async function toggleScanner() {
    try {
      const res = await fetch("/api/admin/scanner/toggle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !status.enabled }),
      });
      if (res.ok) {
        setStatus((prev) => ({ ...prev, enabled: !prev.enabled }));
      }
    } catch {}
  }

  async function triggerScan() {
    try {
      await fetch("/api/admin/scanner/run", { method: "POST", credentials: "include" });
      loadStatus();
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="heading-display">AI Scanner Control</h2>
        <div className="flex gap-2">
          <button onClick={loadStatus} className="btn-premium-ghost flex items-center gap-2 text-sm">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={triggerScan} className="btn-premium flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" />
            Run Scan Now
          </button>
        </div>
      </div>

      <div className="glass-panel">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="heading-display">Scanner Status</h3>
            <p className="body-muted mt-1">
              Crawls the internet for legit spells, grimoires, and magic texts.
            </p>
          </div>
          <button
            onClick={toggleScanner}
            className="flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium transition"
          >
            {status.enabled ? (
              <>
                <ToggleRight className="h-5 w-5 text-[color:var(--success)]" />
                <span className="text-[color:var(--success)]">Active</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-5 w-5 text-[color:var(--text-tertiary)]" />
                <span className="text-[color:var(--text-tertiary)]">Inactive</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-inset">
          <p className="label-premium">Last Run</p>
          <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">
            {status.lastRun ? new Date(status.lastRun).toLocaleString() : "Never"}
          </p>
        </div>
        <div className="glass-inset">
          <p className="label-premium">Next Scheduled</p>
          <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">
            {status.nextRun ? new Date(status.nextRun).toLocaleString() : "—"}
          </p>
        </div>
        <div className="glass-inset">
          <p className="label-premium">Runs Today</p>
          <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">{status.runsToday}</p>
        </div>
        <div className="glass-inset">
          <p className="label-premium">Spells Found</p>
          <p className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">{status.spellsFound}</p>
        </div>
      </div>

      {status.errors > 0 && (
        <div className="rounded-xl border border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger)]">
          {status.errors} error(s) in last scan. Check logs for details.
        </div>
      )}

      <div className="glass-panel">
        <h3 className="mb-4 heading-display">Scan Sources</h3>
        <div className="space-y-2">
          {[
            "Public domain grimoires",
            "Magic subreddits",
            "Occult forums",
            "Academic papers on magic",
            "Grimoire archives",
            "Community submissions",
          ].map((source) => (
            <div
              key={source}
              className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-3 py-2"
            >
              <span className="text-sm text-[color:var(--text-secondary)]">{source}</span>
              <span className="rounded-full bg-[color:var(--success-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--success)]">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel">
        <h3 className="mb-4 heading-display">Garbage Filter Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-4 py-3">
            <span className="text-sm text-[color:var(--text-secondary)]">Auto-approve trusted sources</span>
            <span className="rounded-full bg-[color:var(--success-soft)] px-2.5 py-1 text-xs font-medium text-[color:var(--success)]">
              Enabled
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-4 py-3">
            <span className="text-sm text-[color:var(--text-secondary)]">Filter duplicate content</span>
            <span className="rounded-full bg-[color:var(--success-soft)] px-2.5 py-1 text-xs font-medium text-[color:var(--success)]">
              Enabled
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-4 py-3">
            <span className="text-sm text-[color:var(--text-secondary)]">AI quality scoring threshold</span>
            <span className="text-sm text-[color:var(--text-primary)]">0.7 / 1.0</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-4 py-3">
            <span className="text-sm text-[color:var(--text-secondary)]">Require community verification</span>
            <span className="rounded-full bg-[color:var(--surface-1)] px-2.5 py-1 text-xs font-medium text-[color:var(--text-secondary)]">
              Optional
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
