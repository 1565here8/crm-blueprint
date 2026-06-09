/** Broker desk pipeline — All Clients / Create User status picker (Toropros-style). */
export const BROKER_PIPELINE_STATUSES = [
  { name: "New", color: "#22c55e" },
  { name: "Create", color: "#14b8a6" },
  { name: "No Answer", color: "#f97316" },
  { name: "Deposited", color: "#059669" },
  { name: "Not Ready", color: "#64748b" },
  { name: "No Cash", color: "#78716c" },
  { name: "Wrong Number", color: "#ef4444" },
  { name: "Bad Line", color: "#dc2626" },
  { name: "Voicemail", color: "#f59e0b" },
  { name: "Call Back", color: "#3b82f6" },
  { name: "Email FUP", color: "#2563eb" },
  { name: "Email Only", color: "#6366f1" },
  { name: "High Potential", color: "#16a34a" },
  { name: "Med Potential", color: "#84cc16" },
  { name: "FUT", color: "#a855f7" },
] as const;

export const BROKER_PIPELINE_STATUS_NAMES: string[] = BROKER_PIPELINE_STATUSES.map((s) => s.name);

export type BrokerPipelineStatus = (typeof BROKER_PIPELINE_STATUSES)[number]["name"];
