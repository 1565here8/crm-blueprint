/**
 * Payment Service Provider (PSP) health.
 *
 * Reads the local `deposit_requests` table and turns it into:
 *   - per-method success rate, average time-to-process, total volume
 *   - flagged methods (high failure rate, slow settlement, recent stall)
 *   - per-request reminders for the operator ("chase X with PSP Y")
 *
 * Pure SQL. No external PSP API call. Operator-only.
 */
import { getDb } from "./db";

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;

export type PspMethodHealth = {
  method: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  successRate: number;
  avgSettleHours: number | null;
  slowestSettleHours: number | null;
  pendingOlderThan24h: number;
  pendingOlderThan72h: number;
  last7dVolume: number;
  last30dVolume: number;
  recentStalled: number;
  health: "ok" | "watch" | "bad";
  reasons: string[];
};

export type PspHealthReport = {
  generatedAt: string;
  totals: {
    methods: number;
    pendingTotal: number;
    pendingAmount: number;
    last7dVolume: number;
    last30dVolume: number;
    overallSuccessRate: number;
  };
  methods: PspMethodHealth[];
  stuckDeposits: StuckDeposit[];
};

export type StuckDeposit = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  ageHours: number;
};

type Row = {
  id: string;
  user_id: string;
  username: string | null;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  processed_at: string | null;
};

function loadRows(): Row[] {
  return getDb()
    .prepare(
      `SELECT d.id, d.user_id, u.username AS username, d.amount, d.method, d.status, d.created_at, d.processed_at
       FROM deposit_requests d
       LEFT JOIN users u ON u.id = d.user_id
       ORDER BY d.created_at DESC
       LIMIT 5000`,
    )
    .all() as Row[];
}

function hoursBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return ms / MS_HOUR;
}

function ageHours(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / MS_HOUR;
}

export function buildPspHealthReport(): PspHealthReport {
  const rows = loadRows();
  const now = Date.now();

  const byMethod = new Map<string, Row[]>();
  for (const r of rows) {
    const m = (r.method || "unknown").trim().toLowerCase();
    const arr = byMethod.get(m) ?? [];
    arr.push(r);
    byMethod.set(m, arr);
  }

  const methods: PspMethodHealth[] = [];
  let overallApproved = 0;
  let overallSettled = 0;
  let pendingTotal = 0;
  let pendingAmount = 0;
  let last7dVolume = 0;
  let last30dVolume = 0;

  for (const [method, list] of byMethod) {
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let approvedAmount = 0;
    let rejectedAmount = 0;
    let pendingAmt = 0;
    const settleHours: number[] = [];
    let p24 = 0;
    let p72 = 0;
    let vol7 = 0;
    let vol30 = 0;
    let recentStalled = 0;

    for (const r of list) {
      const amt = Number(r.amount) || 0;
      const created = new Date(r.created_at).getTime();
      if (r.status === "approved") {
        approved += 1;
        approvedAmount += amt;
        if (r.processed_at) settleHours.push(hoursBetween(r.created_at, r.processed_at));
      } else if (r.status === "rejected") {
        rejected += 1;
        rejectedAmount += amt;
      } else {
        pending += 1;
        pendingAmt += amt;
        const age = ageHours(r.created_at);
        if (age > 24) p24 += 1;
        if (age > 72) p72 += 1;
        if (age > 24 && now - created < 7 * MS_DAY) recentStalled += 1;
      }
      if (now - created < 7 * MS_DAY) vol7 += amt;
      if (now - created < 30 * MS_DAY) vol30 += amt;
    }

    const settled = approved + rejected;
    const successRate = settled > 0 ? approved / settled : 0;
    const avgSettle = settleHours.length
      ? settleHours.reduce((a, b) => a + b, 0) / settleHours.length
      : null;
    const slowest = settleHours.length ? Math.max(...settleHours) : null;

    const reasons: string[] = [];
    let health: PspMethodHealth["health"] = "ok";
    if (settled >= 5 && successRate < 0.7) {
      health = "bad";
      reasons.push(`success rate ${(successRate * 100).toFixed(0)}%`);
    } else if (settled >= 5 && successRate < 0.85) {
      health = "watch";
      reasons.push(`success rate ${(successRate * 100).toFixed(0)}%`);
    }
    if (p72 > 0) {
      health = "bad";
      reasons.push(`${p72} deposits pending > 72h`);
    } else if (p24 >= 3) {
      health = health === "bad" ? "bad" : "watch";
      reasons.push(`${p24} deposits pending > 24h`);
    }
    if (avgSettle !== null && avgSettle > 48) {
      health = health === "bad" ? "bad" : "watch";
      reasons.push(`avg settle ${avgSettle.toFixed(1)}h`);
    }
    if (reasons.length === 0) reasons.push("nominal");

    methods.push({
      method,
      total: list.length,
      approved,
      rejected,
      pending,
      approvedAmount: round2(approvedAmount),
      pendingAmount: round2(pendingAmt),
      rejectedAmount: round2(rejectedAmount),
      successRate: round4(successRate),
      avgSettleHours: avgSettle === null ? null : round2(avgSettle),
      slowestSettleHours: slowest === null ? null : round2(slowest),
      pendingOlderThan24h: p24,
      pendingOlderThan72h: p72,
      last7dVolume: round2(vol7),
      last30dVolume: round2(vol30),
      recentStalled,
      health,
      reasons,
    });

    overallApproved += approved;
    overallSettled += settled;
    pendingTotal += pending;
    pendingAmount += pendingAmt;
    last7dVolume += vol7;
    last30dVolume += vol30;
  }

  methods.sort((a, b) => {
    const order = { bad: 0, watch: 1, ok: 2 } as const;
    if (order[a.health] !== order[b.health]) return order[a.health] - order[b.health];
    return b.last30dVolume - a.last30dVolume;
  });

  const stuckDeposits: StuckDeposit[] = rows
    .filter((r) => r.status === "pending")
    .map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username ?? "",
      amount: Number(r.amount) || 0,
      method: r.method,
      status: r.status,
      createdAt: r.created_at,
      ageHours: round2(ageHours(r.created_at)),
    }))
    .filter((d) => d.ageHours > 24)
    .sort((a, b) => b.ageHours - a.ageHours)
    .slice(0, 25);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      methods: methods.length,
      pendingTotal,
      pendingAmount: round2(pendingAmount),
      last7dVolume: round2(last7dVolume),
      last30dVolume: round2(last30dVolume),
      overallSuccessRate: overallSettled > 0 ? round4(overallApproved / overallSettled) : 0,
    },
    methods,
    stuckDeposits,
  };
}

export function pspHealthToContextText(report: PspHealthReport): string {
  const lines: string[] = [];
  lines.push(`PSP HEALTH @ ${report.generatedAt}`);
  lines.push(
    `methods=${report.totals.methods} pending=${report.totals.pendingTotal} pendingAmount=${report.totals.pendingAmount} 7dVol=${report.totals.last7dVolume} 30dVol=${report.totals.last30dVolume} overallSuccess=${(report.totals.overallSuccessRate * 100).toFixed(0)}%`,
  );
  lines.push("");
  lines.push("METHODS:");
  for (const m of report.methods) {
    lines.push(
      `  ${m.method} | ${m.health.toUpperCase()} | total=${m.total} approved=${m.approved} pending=${m.pending}(>${m.pendingOlderThan24h}@24h, ${m.pendingOlderThan72h}@72h) successRate=${(m.successRate * 100).toFixed(0)}% avgSettle=${m.avgSettleHours ?? "-"}h 30dVol=${m.last30dVolume} | ${m.reasons.join("; ")}`,
    );
  }
  if (report.stuckDeposits.length) {
    lines.push("");
    lines.push("STUCK DEPOSITS (>24h pending):");
    for (const d of report.stuckDeposits.slice(0, 12)) {
      lines.push(
        `  ${d.username || d.userId.slice(0, 8)} | ${d.method} | amount=${d.amount} | age=${d.ageHours}h`,
      );
    }
  }
  return lines.join("\n");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
