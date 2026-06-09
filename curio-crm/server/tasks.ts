/**
 * Tasks / Reminders — operator action queue.
 * Manual + audit-driven. Deduped by dedupe_key so re-runs are idempotent.
 */
import { randomUUID } from "crypto";
import { getDb } from "./db";
import { buildAuditReport } from "./assistantAudit";
import { buildPspHealthReport } from "./pspHealth";

export type TaskRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  user_id: string | null;
  lead_id: string | null;
  deposit_id: string | null;
  due_at: string | null;
  status: "open" | "completed" | "dismissed";
  assigned_to: string | null;
  priority: number;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  completed_by: string | null;
};

export type TaskListFilter = { status?: TaskRow["status"]; kind?: string; limit?: number; assignedTo?: string };

export function listTasks(filter: TaskListFilter = {}): TaskRow[] {
  const db = getDb();
  const limit = Math.min(500, filter.limit ?? 200);
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.status) { where.push("status = ?"); params.push(filter.status); }
  if (filter.kind) { where.push("kind = ?"); params.push(filter.kind); }
  if (filter.assignedTo) { where.push("assigned_to = ?"); params.push(filter.assignedTo); }
  const sql = `SELECT * FROM tasks ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
               ORDER BY priority ASC, created_at DESC LIMIT ?`;
  return db.prepare(sql).all(...params, limit) as TaskRow[];
}

export function createTask(args: {
  kind: string;
  title: string;
  body?: string | null;
  userId?: string | null;
  leadId?: string | null;
  depositId?: string | null;
  dueAt?: string | null;
  assignedTo?: string | null;
  priority?: number;
  dedupeKey?: string | null;
}): TaskRow | null {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  try {
    db.prepare(
      `INSERT INTO tasks
         (id, kind, title, body, user_id, lead_id, deposit_id, due_at, status,
          assigned_to, priority, dedupe_key, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?, 'open', ?,?,?,?,?)`,
    ).run(
      id,
      args.kind,
      args.title.slice(0, 200),
      args.body ? String(args.body).slice(0, 2_000) : null,
      args.userId ?? null,
      args.leadId ?? null,
      args.depositId ?? null,
      args.dueAt ?? null,
      args.assignedTo ?? null,
      args.priority ?? 3,
      args.dedupeKey ?? null,
      now,
      now,
    );
    return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow;
  } catch {
    return null;
  }
}

export function completeTask(id: string, completedBy: string | null): TaskRow | null {
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE tasks SET status = 'completed', completed_at = ?, completed_by = ?, updated_at = ? WHERE id = ?")
    .run(now, completedBy, now, id);
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | null;
}

export function dismissTask(id: string): TaskRow | null {
  const now = new Date().toISOString();
  getDb().prepare("UPDATE tasks SET status = 'dismissed', updated_at = ? WHERE id = ?").run(now, id);
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | null;
}

export function reopenTask(id: string): TaskRow | null {
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE tasks SET status = 'open', completed_at = NULL, completed_by = NULL, updated_at = ? WHERE id = ?")
    .run(now, id);
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | null;
}

export function assignTask(id: string, assignedTo: string | null): TaskRow | null {
  const now = new Date().toISOString();
  getDb().prepare("UPDATE tasks SET assigned_to = ?, updated_at = ? WHERE id = ?").run(assignedTo, now, id);
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | null;
}

export function taskStats(): { open: number; completed: number; dismissed: number } {
  const rows = getDb().prepare("SELECT status, COUNT(*) AS c FROM tasks GROUP BY status").all() as Array<{ status: string; c: number }>;
  const out = { open: 0, completed: 0, dismissed: 0 };
  for (const r of rows) {
    if (r.status === "open") out.open = r.c;
    else if (r.status === "completed") out.completed = r.c;
    else if (r.status === "dismissed") out.dismissed = r.c;
  }
  return out;
}

export function generateAuditTasks(): { created: number; skipped: number } {
  const audit = buildAuditReport();
  const psp = buildPspHealthReport();
  let created = 0;
  let skipped = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const f of audit.categories.find((c) => c.key === "pipeline_stalled")?.findings.slice(0, 15) ?? []) {
    const t = createTask({
      kind: "follow_up",
      priority: 1,
      title: `Re-engage high-value client #${f.displayId} ${f.name}`,
      body: `Total deposits $${f.totalDeposits}. Last contact ${f.lastContactDays ?? "never"} day(s) ago. Agent: ${f.agentName}.`,
      userId: f.userId,
      dedupeKey: `audit:pipeline_stalled:${f.userId}:${today}`,
    });
    if (t) created += 1;
    else skipped += 1;
  }

  for (const f of audit.categories.find((c) => c.key === "fake_or_dead_investors")?.findings.slice(0, 10) ?? []) {
    const t = createTask({
      kind: "reactivation_call",
      priority: 2,
      title: `Reactivation call — #${f.displayId} ${f.name}`,
      body: `Deposited $${f.totalDeposits} but offline ${f.signupDays}d+. Agent: ${f.agentName}.`,
      userId: f.userId,
      dedupeKey: `audit:dead_investor:${f.userId}:${today}`,
    });
    if (t) created += 1;
    else skipped += 1;
  }

  for (const f of audit.categories.find((c) => c.key === "uncalled")?.findings.slice(0, 15) ?? []) {
    const t = createTask({
      kind: "first_call",
      priority: 2,
      title: `First call — #${f.displayId} ${f.name}`,
      body: `Signed up ${f.signupDays}d ago. Agent: ${f.agentName}. Phone: ${f.phone || "no data"}.`,
      userId: f.userId,
      dedupeKey: `audit:uncalled:${f.userId}:${today}`,
    });
    if (t) created += 1;
    else skipped += 1;
  }

  for (const d of psp.stuckDeposits.slice(0, 15)) {
    const t = createTask({
      kind: "collect_funds",
      priority: d.ageHours > 72 ? 1 : 2,
      title: `Chase deposit $${d.amount} via ${d.method} (${d.username || d.userId.slice(0, 8)})`,
      body: `Deposit pending ${d.ageHours}h. Contact PSP and/or client to confirm funds.`,
      userId: d.userId,
      depositId: d.id,
      dedupeKey: `psp:stuck:${d.id}`,
    });
    if (t) created += 1;
    else skipped += 1;
  }

  for (const m of psp.methods.filter((m) => m.health === "bad").slice(0, 5)) {
    const t = createTask({
      kind: "psp_review",
      priority: 1,
      title: `Review failing PSP "${m.method}"`,
      body: `${m.reasons.join("; ")}. 30d volume $${m.last30dVolume}.`,
      dedupeKey: `psp:health_bad:${m.method}:${today}`,
    });
    if (t) created += 1;
    else skipped += 1;
  }

  return { created, skipped };
}
