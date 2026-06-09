export function parseMoneyField(raw: string | undefined | null): number {
  if (!raw?.trim()) return 0;
  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function computePlayerValue(args: {
  totalDeposits: number;
  totalAdjustments: number;
  totalBonuses: number;
  approvedWithdrawals: number;
  cpa: string;
  cpl: string;
}): number {
  const investment = args.totalDeposits + args.totalAdjustments + args.totalBonuses;
  const cac = parseMoneyField(args.cpa) || parseMoneyField(args.cpl);
  return Math.round((investment - args.approvedWithdrawals - cac) * 100) / 100;
}

export function computeConversionRate(args: { totalDeposits: number; crmStatus?: string }): string {
  if (args.totalDeposits > 0) return "100%";
  const s = (args.crmStatus ?? "").toLowerCase();
  if (/(deposit|ftd|converted|active|trading)/.test(s)) return "100%";
  return "0%";
}
