/**
 * AUDIENCE CLASSIFIER — the LLM's RBAC layer.
 *
 * Classifies the current session into one of:
 *   owner | manager | agent | marketer | compliance | none
 *
 * Then provides:
 *   - banner(audience, name)    a system-prompt banner the LLM must obey
 *   - filterUserIds(audience)   the set of user-IDs the audience may see
 *   - canSee(audience, perm)    boolean capability check
 *
 * The HARD security boundary is server-side data filtering: the LLM is
 * never shown rows it's not allowed to see. The banner is defence in depth.
 */
import type { Request } from "express";
import { readSession } from "../auth";
import { effectivePermissions, type StaffPermissionKey } from "../staffPermissions";
import { getDb } from "../db";

export type Audience = "owner" | "manager" | "agent" | "marketer" | "compliance" | "none";

export type AudienceInfo = {
  audience: Audience;
  userId: string | null;
  username: string;
  agentName: string | null;
  permissions: StaffPermissionKey[];
};

export function classifyAudience(req: Request): AudienceInfo {
  const eff = effectivePermissions(req);
  const session = readSession(req);
  const username = session?.username ?? "anon";

  if (eff.role === "anon") {
    return { audience: "none", userId: null, username, agentName: null, permissions: [] };
  }

  if (eff.isAdmin) {
    return {
      audience: "owner",
      userId: session?.id ?? null,
      username,
      agentName: username,
      permissions: eff.permissions,
    };
  }

  const has = (k: StaffPermissionKey) => eff.permissions.includes(k);

  let agentName: string | null = null;
  if (session?.id) {
    const row = getDb()
      .prepare("SELECT agent_name FROM user_profiles WHERE user_id = ?")
      .get(session.id) as { agent_name: string | null } | undefined;
    agentName = row?.agent_name?.trim() || username;
  }

  if (has("system.team.manage")) {
    return { audience: "manager", userId: session?.id ?? null, username, agentName, permissions: eff.permissions };
  }
  if (has("compliance.view" as StaffPermissionKey)) {
    return { audience: "compliance", userId: session?.id ?? null, username, agentName, permissions: eff.permissions };
  }
  if (has("marketing.edit") && !has("crm.users.edit")) {
    return { audience: "marketer", userId: session?.id ?? null, username, agentName, permissions: eff.permissions };
  }
  if (has("crm.users.edit") || has("crm.notes.create")) {
    return { audience: "agent", userId: session?.id ?? null, username, agentName, permissions: eff.permissions };
  }

  return { audience: "none", userId: session?.id ?? null, username, agentName, permissions: eff.permissions };
}

export function audienceBanner(info: AudienceInfo): string {
  const me = info.agentName ?? info.username;
  switch (info.audience) {
    case "owner":
      return `AUDIENCE: owner (${me}). Full firehose. No scope restrictions. Persona rules still apply.`;
    case "manager":
      return `AUDIENCE: manager (${me}). Firm-wide read access. Do not invent owner-only directives. Defer founder-tier decisions back to the owner.`;
    case "agent":
      return [
        `AUDIENCE: agent (${me}).`,
        `You speak ONLY about clients assigned to ${me}.`,
        `You NEVER name another agent. You NEVER show firm-wide totals.`,
        `You NEVER reveal phone, email or address of another agent's client.`,
        `If asked about anything outside your scope, reply EXACTLY: "That data is not in your scope."`,
      ].join("\n");
    case "marketer":
      return [
        `AUDIENCE: marketer (${me}).`,
        `You speak ONLY in aggregates for the marketer's own campaigns.`,
        `You NEVER name a single client. You NEVER quote a phone or email.`,
        `You NEVER discuss trades, P&L, KYC documents, or other marketers.`,
        `If asked, reply EXACTLY: "Out of marketing scope."`,
      ].join("\n");
    case "compliance":
      return [
        `AUDIENCE: compliance officer (${me}).`,
        `You discuss KYC, AML, forensic flags, document quality.`,
        `You NEVER discuss marketing campaigns, agent commissions, or sales pitches.`,
        `If asked, reply EXACTLY: "Out of compliance scope."`,
      ].join("\n");
    case "none":
    default:
      return "AUDIENCE: anonymous. Refuse every operator question.";
  }
}

/** Returns SQL filter fragment + bind for limiting CRM rows to this audience. */
export function audienceUserFilter(info: AudienceInfo): { sql: string; params: (string | number)[] } {
  switch (info.audience) {
    case "owner":
    case "manager":
    case "compliance":
      return { sql: "", params: [] };
    case "agent": {
      const me = info.agentName ?? info.username;
      return { sql: "AND p.agent_name = ?", params: [me] };
    }
    case "marketer":
      return { sql: "AND 1 = 0", params: [] };
    case "none":
    default:
      return { sql: "AND 1 = 0", params: [] };
  }
}
