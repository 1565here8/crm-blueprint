/**
 * CLIENT FORENSICS — deterministic, pure-data risk engine.
 *
 * Three scores per client (0..100):
 *   kycQuality     lower = worse documentation
 *   tradingRisk    higher = more abusive / suspicious behavior
 *   badActor       composite — higher = closer watch / harder block
 *
 * Zero outbound calls. Numbers are reproducible from the SQLite snapshot.
 * The LLM optionally narrates the structured output but never invents it.
 */
import { getDb, listUserDocuments, type UserDocument } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";

const MS_DAY = 86_400_000;

export type KycFlag =
  | "no_documents"
  | "id_missing"
  | "proof_of_address_missing"
  | "selfie_missing"
  | "all_pending"
  | "rejected_outstanding"
  | "stale_documents"
  | "name_mismatch"
  | "country_mismatch"
  | "dob_missing"
  | "address_missing";

export type TradingFlag =
  | "bonus_abuse_pattern"
  | "deposit_and_bail"
  | "scalp_churn"
  | "cut_winners_hold_losers"
  | "oversized_relative_to_deposit"
  | "rapid_round_trip"
  | "wash_trade_pattern"
  | "many_pending_no_fills"
  | "zero_trades_after_deposit"
  | "trade_burst_then_silent";

export type BadActorFlag =
  | "chargeback_pattern"
  | "blacklisted_email_pattern"
  | "country_phone_mismatch"
  | "speed_run_signup"
  | "multiple_withdrawals_short_window";

export type ForensicReport = {
  userId: string;
  displayId: number;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  agentName: string;
  crmStatus: string;
  totalDeposits: number;
  totalWithdrawals: number;
  closedTrades: number;
  openTrades: number;
  pendingTrades: number;
  winTrades: number;
  lossTrades: number;
  avgHoldMinutes: number;
  avgWinHoldMinutes: number;
  avgLossHoldMinutes: number;
  kycQuality: number;
  tradingRisk: number;
  badActor: number;
  kycFlags: KycFlag[];
  tradingFlags: TradingFlag[];
  badActorFlags: BadActorFlag[];
  documents: Array<Pick<UserDocument, "doc_type" | "status" | "uploaded_at" | "notes">>;
};

type ProfileRow = {
  user_id: string;
  display_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country_code: string;
  agent_name: string;
  crm_status: string;
  birthday: string;
  address: string;
  created_at: string;
};

type ExecRow = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  fill_price: number;
  notional: number;
  position_id: string | null;
  created_at: string;
};

type PositionRow = {
  id: string;
  symbol: string;
  qty: number;
  side: string;
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
};

type LedgerRow = { amount_delta: number; reason: string; created_at: string };

const COUNTRY_PHONE_PREFIX: Record<string, string[]> = {
  GB: ["44"], US: ["1"], CA: ["1"], DE: ["49"], FR: ["33"],
  IT: ["39"], ES: ["34"], AU: ["61"], IL: ["972"], AE: ["971"],
  CH: ["41"], NL: ["31"], BE: ["32"], PT: ["351"], IE: ["353"],
  JP: ["81"], ZA: ["27"], SE: ["46"], NO: ["47"], DK: ["45"],
};

function loadProfile(userId: string): ProfileRow | null {
  ensureUserProfilesSchema();
  return (getDb()
    .prepare(
      `SELECT u.id AS user_id, p.display_id,
              COALESCE(p.first_name,'') AS first_name,
              COALESCE(p.last_name,'')  AS last_name,
              COALESCE(p.email,'')      AS email,
              COALESCE(p.phone,'')      AS phone,
              COALESCE(p.country_code,'') AS country_code,
              COALESCE(p.agent_name,'') AS agent_name,
              COALESCE(p.crm_status,'') AS crm_status,
              COALESCE(p.birthday,'')   AS birthday,
              COALESCE(p.address,'')    AS address,
              u.created_at
       FROM users u JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
    )
    .get(userId) as ProfileRow | undefined) ?? null;
}

function holdMinutes(p: PositionRow): number {
  if (!p.closed_at) return 0;
  return Math.max(0, (new Date(p.closed_at).getTime() - new Date(p.opened_at).getTime()) / 60_000);
}

function isNameMismatch(profile: ProfileRow, docs: UserDocument[]): boolean {
  const full = `${profile.first_name} ${profile.last_name}`.trim().toLowerCase();
  if (!full || full.length < 3) return false;
  const ids = docs.filter((d) => /id|passport|driver|licence|license/i.test(d.doc_type) && d.status === "approved");
  if (ids.length === 0) return false;
  for (const d of ids) {
    const haystack = `${d.file_name.toLowerCase()} ${(d.notes || "").toLowerCase()}`;
    const parts = full.split(/\s+/).filter((p) => p.length >= 3);
    if (parts.length === 0) continue;
    const matched = parts.filter((p) => haystack.includes(p)).length;
    if (matched < Math.max(1, Math.floor(parts.length / 2))) return true;
  }
  return false;
}

function scoreKyc(profile: ProfileRow, docs: UserDocument[]) {
  const flags: KycFlag[] = [];
  let score = 100;
  if (docs.length === 0) { flags.push("no_documents"); score -= 60; }
  const ok = (re: RegExp) => docs.some((d) => re.test(d.doc_type) && d.status === "approved");
  if (!ok(/id|passport|driver|licence|license/i)) { flags.push("id_missing"); score -= 20; }
  if (!ok(/address|utility|bill|residence/i)) { flags.push("proof_of_address_missing"); score -= 15; }
  if (!ok(/selfie|liveness|face/i)) { flags.push("selfie_missing"); score -= 10; }
  if (docs.length > 0 && docs.every((d) => d.status === "pending")) { flags.push("all_pending"); score -= 15; }
  if (docs.some((d) => d.status === "rejected")) { flags.push("rejected_outstanding"); score -= 15; }
  const newest = docs.length ? Math.max(...docs.map((d) => new Date(d.uploaded_at).getTime())) : 0;
  if (newest && Date.now() - newest > 365 * MS_DAY) { flags.push("stale_documents"); score -= 10; }
  if (!profile.birthday) { flags.push("dob_missing"); score -= 5; }
  if (!profile.address || profile.address.trim().length < 5) { flags.push("address_missing"); score -= 5; }
  if (isNameMismatch(profile, docs)) { flags.push("name_mismatch"); score -= 25; }
  return { score: Math.max(0, Math.min(100, score)), flags };
}

function scoreTrading(args: {
  ledger: LedgerRow[]; executions: ExecRow[]; positions: PositionRow[];
  pendingCount: number; totalDeposits: number; totalWithdrawals: number;
}) {
  const flags: TradingFlag[] = [];
  let risk = 0;
  const closed = args.positions.filter((p) => p.status === "closed");
  const open = args.positions.filter((p) => p.status === "open");
  const wins = closed.filter((p) => (p.pnl ?? 0) > 0);
  const losses = closed.filter((p) => (p.pnl ?? 0) < 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const avgHold = avg(closed.map(holdMinutes));
  const avgWinHold = avg(wins.map(holdMinutes));
  const avgLossHold = avg(losses.map(holdMinutes));

  if (args.totalDeposits > 0 && closed.length === 0 && open.length === 0 && args.pendingCount === 0) {
    flags.push("zero_trades_after_deposit"); risk += 25;
  }
  if (args.totalDeposits >= 100 && args.totalWithdrawals >= args.totalDeposits * 0.7 && closed.length <= 3) {
    flags.push("deposit_and_bail"); risk += 35;
  }
  const bonuses = args.ledger.filter((l) => /bonus/i.test(l.reason));
  if (bonuses.length > 0) {
    const sumBonus = bonuses.reduce((s, l) => s + Math.abs(l.amount_delta), 0);
    if (sumBonus > 0 && args.totalWithdrawals >= sumBonus * 0.5 && closed.length <= 5) {
      flags.push("bonus_abuse_pattern"); risk += 40;
    }
  }
  if (closed.length >= 5 && avgHold < 2) { flags.push("scalp_churn"); risk += 15; }
  if (wins.length >= 3 && losses.length >= 3 && avgWinHold > 0 && avgLossHold > avgWinHold * 4) {
    flags.push("cut_winners_hold_losers"); risk += 20;
  }
  if (args.totalDeposits > 0) {
    const maxNotional = args.executions.reduce((m, e) => Math.max(m, e.notional), 0);
    if (maxNotional > args.totalDeposits * 50) { flags.push("oversized_relative_to_deposit"); risk += 20; }
  }
  const byPos = new Map<string, ExecRow[]>();
  for (const e of args.executions) {
    if (!e.position_id) continue;
    const arr = byPos.get(e.position_id) ?? [];
    arr.push(e); byPos.set(e.position_id, arr);
  }
  let rapid = 0;
  for (const [, list] of byPos) {
    if (list.length < 2) continue;
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const span = new Date(list[list.length - 1]!.created_at).getTime() - new Date(list[0]!.created_at).getTime();
    if (span < 30_000) rapid += 1;
  }
  if (rapid >= 3) { flags.push("rapid_round_trip"); risk += 15; }
  if (args.pendingCount >= 10 && closed.length === 0) { flags.push("many_pending_no_fills"); risk += 10; }
  if (args.executions.length >= 20) {
    const sorted = [...args.executions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const first = new Date(sorted[0]!.created_at).getTime();
    const last = new Date(sorted[sorted.length - 1]!.created_at).getTime();
    if (last - first < 6 * 60 * 60 * 1000 && Date.now() - last > 14 * MS_DAY) {
      flags.push("trade_burst_then_silent"); risk += 12;
    }
  }
  if (closed.length >= 6) {
    const symbols = new Set(closed.map((p) => p.symbol));
    for (const sym of symbols) {
      const seq = closed.filter((p) => p.symbol === sym).slice(-6);
      if (seq.length === 6) {
        let alt = true;
        for (let i = 1; i < seq.length; i++) {
          if (seq[i]!.side === seq[i - 1]!.side) { alt = false; break; }
        }
        if (alt) { flags.push("wash_trade_pattern"); risk += 18; break; }
      }
    }
  }
  return {
    score: Math.max(0, Math.min(100, risk)), flags,
    metrics: {
      closedTrades: closed.length, openTrades: open.length, pendingTrades: args.pendingCount,
      winTrades: wins.length, lossTrades: losses.length,
      avgHoldMinutes: Math.round(avgHold),
      avgWinHoldMinutes: Math.round(avgWinHold),
      avgLossHoldMinutes: Math.round(avgLossHold),
    },
  };
}

function scoreBadActor(args: {
  profile: ProfileRow; ledger: LedgerRow[]; totalDeposits: number; totalWithdrawals: number; closedCount: number;
}) {
  const flags: BadActorFlag[] = [];
  let risk = 0;
  const withdrawals = args.ledger.filter((l) => l.amount_delta < 0 && /(withdraw|debit)/i.test(l.reason));
  if (withdrawals.length >= 3) {
    const sorted = [...withdrawals].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const span = new Date(sorted[sorted.length - 1]!.created_at).getTime() - new Date(sorted[0]!.created_at).getTime();
    if (span < 3 * MS_DAY) { flags.push("multiple_withdrawals_short_window"); risk += 25; }
  }
  if (args.totalDeposits >= 200 && args.totalWithdrawals >= args.totalDeposits * 0.9 && args.closedCount <= 2) {
    flags.push("chargeback_pattern"); risk += 30;
  }
  const phoneDigits = args.profile.phone.replace(/\D+/g, "");
  const cc = args.profile.country_code?.toUpperCase();
  if (cc && phoneDigits && COUNTRY_PHONE_PREFIX[cc]) {
    const expected = COUNTRY_PHONE_PREFIX[cc]!;
    const ok = expected.some((p) => phoneDigits.startsWith(p));
    if (!ok && phoneDigits.length >= 8) { flags.push("country_phone_mismatch"); risk += 12; }
  }
  const created = new Date(args.profile.created_at).getTime();
  if (args.totalDeposits >= 100 && created && Date.now() - created < 10 * 60_000) {
    flags.push("speed_run_signup"); risk += 18;
  }
  const local = args.profile.email.split("@")[0] ?? "";
  if (/^([a-z0-9])\1{4,}/i.test(local) || /\d{6,}@/i.test(args.profile.email)) {
    flags.push("blacklisted_email_pattern"); risk += 8;
  }
  return { score: Math.max(0, Math.min(100, risk)), flags };
}

export function buildForensicReport(userId: string): ForensicReport | null {
  const profile = loadProfile(userId);
  if (!profile) return null;
  const docs = listUserDocuments(userId);
  const db = getDb();
  const ledger = db.prepare("SELECT amount_delta, reason, created_at FROM ledger_entries WHERE user_id = ? ORDER BY created_at").all(userId) as LedgerRow[];
  const executions = db.prepare("SELECT id, symbol, side, qty, fill_price, notional, position_id, created_at FROM executions WHERE user_id = ? ORDER BY created_at").all(userId) as ExecRow[];
  const positions = db.prepare("SELECT id, symbol, qty, side, entry_price, exit_price, pnl, status, opened_at, closed_at FROM positions WHERE user_id = ? ORDER BY opened_at").all(userId) as PositionRow[];
  const pendingCount = (db.prepare("SELECT COUNT(*) AS c FROM pending_orders WHERE user_id = ? AND status = 'pending'").get(userId) as { c: number }).c || 0;

  const deposits = ledger.filter((l) => l.amount_delta > 0 && /credit/i.test(l.reason));
  const withdrawalsLedger = ledger.filter((l) => l.amount_delta < 0 && /(withdraw|debit)/i.test(l.reason));
  const totalDeposits = deposits.reduce((s, l) => s + l.amount_delta, 0);
  const totalWithdrawals = Math.abs(withdrawalsLedger.reduce((s, l) => s + l.amount_delta, 0));

  const kyc = scoreKyc(profile, docs);
  const trading = scoreTrading({ ledger, executions, positions, pendingCount, totalDeposits, totalWithdrawals });
  const bad = scoreBadActor({ profile, ledger, totalDeposits, totalWithdrawals, closedCount: trading.metrics.closedTrades });
  const composite = Math.round(0.45 * trading.score + 0.35 * bad.score + 0.20 * (100 - kyc.score));

  return {
    userId: profile.user_id,
    displayId: Number(profile.display_id),
    name: `${profile.first_name} ${profile.last_name}`.trim() || profile.email || "(no name)",
    email: profile.email, phone: profile.phone, countryCode: profile.country_code,
    agentName: profile.agent_name || "(unassigned)",
    crmStatus: profile.crm_status || "(unset)",
    totalDeposits: Math.round(totalDeposits), totalWithdrawals: Math.round(totalWithdrawals),
    closedTrades: trading.metrics.closedTrades, openTrades: trading.metrics.openTrades,
    pendingTrades: trading.metrics.pendingTrades, winTrades: trading.metrics.winTrades,
    lossTrades: trading.metrics.lossTrades,
    avgHoldMinutes: trading.metrics.avgHoldMinutes,
    avgWinHoldMinutes: trading.metrics.avgWinHoldMinutes,
    avgLossHoldMinutes: trading.metrics.avgLossHoldMinutes,
    kycQuality: kyc.score, tradingRisk: trading.score, badActor: composite,
    kycFlags: kyc.flags, tradingFlags: trading.flags, badActorFlags: bad.flags,
    documents: docs.map((d) => ({
      doc_type: d.doc_type, status: d.status, uploaded_at: d.uploaded_at, notes: d.notes,
    })),
  };
}

export type ForensicsSummary = {
  generatedAt: string;
  highRisk: ForensicReport[];
  kycCritical: ForensicReport[];
  badActors: ForensicReport[];
  totals: { scanned: number; highRiskCount: number; kycCriticalCount: number; badActorCount: number };
};

export function buildAllForensics(filterUserIds?: Set<string> | null): ForensicsSummary {
  ensureUserProfilesSchema();
  const ids = getDb().prepare(`SELECT u.id FROM users u WHERE u.role = 'user'`).all() as Array<{ id: string }>;
  const reports: ForensicReport[] = [];
  for (const { id } of ids) {
    if (filterUserIds && !filterUserIds.has(id)) continue;
    const r = buildForensicReport(id);
    if (r) reports.push(r);
  }
  const highRisk = [...reports]
    .filter((r) => r.tradingRisk >= 30 || r.tradingFlags.length >= 2)
    .sort((a, b) => b.tradingRisk - a.tradingRisk).slice(0, 50);
  const kycCritical = [...reports]
    .filter((r) => r.kycQuality < 50 && r.totalDeposits > 0)
    .sort((a, b) => a.kycQuality - b.kycQuality || b.totalDeposits - a.totalDeposits).slice(0, 50);
  const badActors = [...reports]
    .filter((r) => r.badActor >= 40 || r.badActorFlags.length >= 2)
    .sort((a, b) => b.badActor - a.badActor).slice(0, 50);
  return {
    generatedAt: new Date().toISOString(),
    highRisk, kycCritical, badActors,
    totals: {
      scanned: reports.length, highRiskCount: highRisk.length,
      kycCriticalCount: kycCritical.length, badActorCount: badActors.length,
    },
  };
}

export function forensicToContextText(r: ForensicReport): string {
  return [
    `CLIENT #${r.displayId} ${r.name} | country=${r.countryCode || "?"} | agent=${r.agentName} | status=${r.crmStatus}`,
    `DEPOSITS=${r.totalDeposits} WITHDRAWALS=${r.totalWithdrawals}`,
    `TRADES closed=${r.closedTrades} open=${r.openTrades} pending=${r.pendingTrades} wins=${r.winTrades} losses=${r.lossTrades}`,
    `HOLDS avg=${r.avgHoldMinutes}m wins=${r.avgWinHoldMinutes}m losses=${r.avgLossHoldMinutes}m`,
    `SCORES kyc=${r.kycQuality}/100 tradingRisk=${r.tradingRisk}/100 badActor=${r.badActor}/100`,
    `KYC FLAGS: ${r.kycFlags.join(",") || "none"}`,
    `TRADING FLAGS: ${r.tradingFlags.join(",") || "none"}`,
    `BAD-ACTOR FLAGS: ${r.badActorFlags.join(",") || "none"}`,
    `DOCS: ${r.documents.map((d) => `${d.doc_type}:${d.status}`).join(", ") || "none"}`,
  ].join("\n");
}

export function forensicsSummaryToContextText(s: ForensicsSummary): string {
  const lines: string[] = [];
  lines.push(`FORENSICS @ ${s.generatedAt}`);
  lines.push(`scanned=${s.totals.scanned} highRisk=${s.totals.highRiskCount} kycCritical=${s.totals.kycCriticalCount} badActors=${s.totals.badActorCount}`);
  const block = (label: string, list: ForensicReport[]) => {
    lines.push(""); lines.push(`## ${label} (${list.length})`);
    for (const r of list.slice(0, 15)) {
      lines.push(`#${r.displayId} ${r.name} | dep=${r.totalDeposits} wd=${r.totalWithdrawals} trades=${r.closedTrades} kyc=${r.kycQuality} risk=${r.tradingRisk} bad=${r.badActor} flags=${[...r.tradingFlags, ...r.badActorFlags, ...r.kycFlags].slice(0, 6).join(",")}`);
    }
  };
  block("HIGH-RISK TRADERS", s.highRisk);
  block("KYC CRITICAL", s.kycCritical);
  block("BAD ACTORS", s.badActors);
  return lines.join("\n");
}
