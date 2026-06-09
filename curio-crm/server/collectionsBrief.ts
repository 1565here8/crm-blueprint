/**
 * Collections context bundle — feeds THE DESK's COLLECTIONS_BRIEF mode.
 * PSP health + dormant depositors + stalled high-value clients + open tasks.
 */
import { buildAuditReport } from "./assistantAudit";
import { buildPspHealthReport, pspHealthToContextText } from "./pspHealth";
import { listTasks } from "./tasks";

export function buildCollectionsContext(): string {
  const audit = buildAuditReport();
  const psp = buildPspHealthReport();
  const tasks = listTasks({ status: "open", limit: 50 });

  const dead = audit.categories.find((c) => c.key === "fake_or_dead_investors")?.findings ?? [];
  const stalled = audit.categories.find((c) => c.key === "pipeline_stalled")?.findings ?? [];

  const lines: string[] = [];
  lines.push(`COLLECTIONS SNAPSHOT @ ${new Date().toISOString()}`);
  lines.push("");
  lines.push(pspHealthToContextText(psp));
  lines.push("");
  lines.push(`RE-DEPOSIT CANDIDATES (dormant depositors):`);
  for (const f of dead.slice(0, 10)) {
    lines.push(
      `  #${f.displayId} ${f.name} | dep=$${f.totalDeposits} | last=${f.lastContactDays ?? "never"}d | agent=${f.agentName}`,
    );
  }
  lines.push("");
  lines.push(`HIGH-VALUE STALLED (no contact 7d+):`);
  for (const f of stalled.slice(0, 10)) {
    lines.push(
      `  #${f.displayId} ${f.name} | dep=$${f.totalDeposits} | last=${f.lastContactDays ?? "never"}d | agent=${f.agentName}`,
    );
  }
  lines.push("");
  lines.push(`OPEN TASKS (top 10 by priority):`);
  for (const t of tasks.slice(0, 10)) {
    lines.push(`  [P${t.priority}] ${t.kind} | ${t.title}`);
  }
  return lines.join("\n");
}
