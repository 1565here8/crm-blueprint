/** Member notification event catalog — shared by admin UI and server. */

export const NOTIFICATION_CHANNELS = ["email", "push", "in_app"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type NotificationEventDef = {
  key: string;
  label: string;
  description: string;
  /** Sensible default per channel for new desk members */
  defaults: Record<NotificationChannel, boolean>;
};

export const NOTIFICATION_EVENTS: NotificationEventDef[] = [
  {
    key: "new_lead",
    label: "New lead",
    description: "Concierge or form capture lands in Hot Leads.",
    defaults: { email: true, push: true, in_app: true },
  },
  {
    key: "deposit_request",
    label: "Deposit request",
    description: "Client submits funding — Pending In queue.",
    defaults: { email: true, push: true, in_app: true },
  },
  {
    key: "deposit_approved",
    label: "Deposit approved",
    description: "Treasury credits a client balance.",
    defaults: { email: false, push: false, in_app: true },
  },
  {
    key: "withdrawal",
    label: "Withdrawal request",
    description: "Client asks to withdraw — Payouts / Wire Queue.",
    defaults: { email: true, push: true, in_app: true },
  },
  {
    key: "margin_call",
    label: "Margin call",
    description: "Open position hits margin threshold.",
    defaults: { email: true, push: true, in_app: true },
  },
  {
    key: "client_login",
    label: "Client login",
    description: "Assigned client signs into the terminal.",
    defaults: { email: false, push: false, in_app: true },
  },
  {
    key: "task_assigned",
    label: "Task assigned",
    description: "Action Queue item assigned to this agent.",
    defaults: { email: true, push: true, in_app: true },
  },
  {
    key: "wire_request",
    label: "Wire request",
    description: "Wire withdrawal awaiting approval.",
    defaults: { email: true, push: false, in_app: true },
  },
  {
    key: "kyc_missing",
    label: "KYC missing",
    description: "Client file lacks required documents.",
    defaults: { email: true, push: false, in_app: true },
  },
  {
    key: "smtp_fail",
    label: "SMTP failure",
    description: "Outbound email could not be delivered.",
    defaults: { email: false, push: false, in_app: true },
  },
  {
    key: "psp_error",
    label: "PSP error",
    description: "Payment gateway returned an error.",
    defaults: { email: true, push: true, in_app: true },
  },
  {
    key: "bonus_issued",
    label: "Bonus issued",
    description: "Rewards credit posted to a client.",
    defaults: { email: false, push: false, in_app: true },
  },
  {
    key: "trade_opened",
    label: "Trade opened",
    description: "Client opens a new position.",
    defaults: { email: false, push: false, in_app: false },
  },
  {
    key: "trade_closed",
    label: "Trade closed",
    description: "Position closed — PnL realized.",
    defaults: { email: false, push: false, in_app: false },
  },
];

export const NOTIFICATION_EVENT_KEYS = NOTIFICATION_EVENTS.map((e) => e.key);

export const DESK_DEFAULT_USER_ID = "__desk_default__";

export type NotificationPrefCell = {
  eventKey: string;
  channel: NotificationChannel;
  enabled: boolean;
};

export type NotificationMatrix = Record<string, Record<NotificationChannel, boolean>>;

export function isValidNotificationEvent(key: string): boolean {
  return NOTIFICATION_EVENT_KEYS.includes(key);
}

export function isValidNotificationChannel(ch: string): ch is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(ch);
}

export function buildDefaultMatrix(agentGetsEmail = true): NotificationMatrix {
  const matrix: NotificationMatrix = {};
  for (const ev of NOTIFICATION_EVENTS) {
    matrix[ev.key] = {
      email: agentGetsEmail ? ev.defaults.email : false,
      push: ev.defaults.push,
      in_app: ev.defaults.in_app,
    };
  }
  return matrix;
}

export function matrixToCells(matrix: NotificationMatrix): NotificationPrefCell[] {
  const cells: NotificationPrefCell[] = [];
  for (const ev of NOTIFICATION_EVENTS) {
    const row = matrix[ev.key] ?? buildDefaultMatrix()[ev.key];
    for (const ch of NOTIFICATION_CHANNELS) {
      cells.push({ eventKey: ev.key, channel: ch, enabled: Boolean(row[ch]) });
    }
  }
  return cells;
}

export function cellsToMatrix(cells: NotificationPrefCell[]): NotificationMatrix {
  const matrix = buildDefaultMatrix();
  for (const cell of cells) {
    if (!isValidNotificationEvent(cell.eventKey) || !isValidNotificationChannel(cell.channel)) continue;
    if (!matrix[cell.eventKey]) matrix[cell.eventKey] = { email: false, push: false, in_app: false };
    matrix[cell.eventKey][cell.channel] = Boolean(cell.enabled);
  }
  return matrix;
}
