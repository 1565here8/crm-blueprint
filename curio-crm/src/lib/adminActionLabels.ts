/** Human-readable labels for admin API actions — drives the global toast bubble. */

export type ActionLabel = { pending: string; success: string };

function mut(path: string, pending: string, success: string): [string, ActionLabel] {
  return [path, { pending, success }];
}

const EXACT: Record<string, ActionLabel> = Object.fromEntries([
  mut("POST /crm/users/import", "Uploading leads from CSV…", "Leads uploaded"),
  mut("POST /crm/users/bulk-delete", "Deleting selected clients…", "Clients deleted"),
  mut("POST /crm/users/bulk-update", "Applying bulk changes…", "Bulk changes saved"),
  mut("POST /crm/users/bulk-update-scoped", "Applying bulk changes…", "Bulk changes saved"),
  mut("POST /crm/users/bulk-status", "Updating client statuses…", "Statuses updated"),
  mut("POST /crm/users", "Creating new client…", "Client created"),
  mut("POST /users", "Creating new client…", "Client created"),
  mut("POST /ledger/credit", "Crediting account…", "Account credited"),
  mut("POST /ledger/debit", "Debiting account…", "Account debited"),
  mut("POST /crm/notes", "Saving note…", "Note saved"),
  mut("POST /crm/emails", "Sending email…", "Email sent"),
  mut("POST /deposit-requests/process", "Processing deposit…", "Deposit processed"),
  mut("POST /wire-requests/process", "Processing withdrawal…", "Withdrawal processed"),
  mut("POST /trades/open", "Opening trade…", "Trade opened"),
  mut("POST /trades/close", "Closing trade…", "Trade closed"),
  mut("PUT /system/common", "Saving branding settings…", "Settings saved"),
  mut("POST /desk/assist", "Wallstreet AI thinking…", "AI reply ready"),
  mut("POST /desk/assist/stream", "Wallstreet AI thinking…", "AI reply ready"),
  mut("POST /desk/ask", "Wallstreet AI thinking…", "AI reply ready"),
  mut("POST /desk/operator-brief", "Generating operator brief…", "Operator brief ready"),
  mut("POST /desk/agent-brief", "Generating agent brief…", "Agent brief ready"),
  mut("POST /desk/client-pitch", "Generating pitch script…", "Pitch script ready"),
  mut("POST /desk/collections-brief", "Generating collections brief…", "Collections brief ready"),
  mut("POST /desk/tasks/generate", "Generating tasks…", "Tasks generated"),
  mut("POST /desk/tasks", "Creating task…", "Task created"),
  mut("POST /system/team-permissions", "Saving staff permissions…", "Permissions saved"),
  mut("POST /vault/store", "Vaulting attachment…", "Attachment vaulted"),
  mut("POST /vault/assist", "Analyzing vault file…", "Vault analysis ready"),
  mut("POST /system/tenant-status", "Updating tenant status…", "Tenant status updated"),
]);

const PREFIX: Array<[RegExp, ActionLabel]> = [
  [/\/system\/permissions\/groups\/[^/]+$/, { pending: "Saving group permissions…", success: "Permissions saved" }],
  [/\/crm\/users\/[^/]+\/impersonate$/, { pending: "Opening client portal…", success: "Client portal opened" }],
  [/\/crm\/users\/[^/]+$/, { pending: "Saving client changes…", success: "Client updated" }],
  [/\/desk\/leads\/[^/]+\/assign$/, { pending: "Assigning lead…", success: "Lead assigned" }],
  [/\/desk\/leads\/[^/]+\/dismiss$/, { pending: "Dismissing lead…", success: "Lead dismissed" }],
  [/\/desk\/tasks\/[^/]+\/complete$/, { pending: "Completing task…", success: "Task completed" }],
  [/\/desk\/tasks\/[^/]+\/dismiss$/, { pending: "Dismissing task…", success: "Task dismissed" }],
  [/\/desk\/tasks\/[^/]+\/reopen$/, { pending: "Reopening task…", success: "Task reopened" }],
  [/\/desk\/tasks\/[^/]+\/assign$/, { pending: "Assigning task…", success: "Task assigned" }],
  [/\/commission\//, { pending: "Saving commission…", success: "Commission saved" }],
  [/\/marketing\//, { pending: "Saving marketing change…", success: "Marketing updated" }],
  [/\/vault\//, { pending: "Vault operation…", success: "Vault updated" }],
  [/\/desk\/house-rules/, { pending: "Saving house rule…", success: "House rule saved" }],
  [/\/desk\/drip/, { pending: "Saving drip campaign…", success: "Drip campaign saved" }],
  [/\/admin\/automation/, { pending: "Loading automations…", success: "Automation Studio ready" }],
  [/\/admin\/integrations\/metatrader/, { pending: "Loading MetaTrader bridge…", success: "MT4 / MT5 ready" }],
  [/\/admin\/integrations/, { pending: "Loading integrations…", success: "Integration Hub ready" }],
  [/\/marketing\/partners-hq/, { pending: "Loading partners…", success: "Partners HQ ready" }],
  [/\/desk\/instruction/, { pending: "Running instruction…", success: "Instruction complete" }],
];

export function describeAdminAction(path: string, method: string): ActionLabel | null {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD") return null;

  const bare = path.split("?")[0].replace(/^\/api\/admin/, "") || path;
  const key = `${m} ${bare}`;
  if (EXACT[key]) return EXACT[key];

  for (const [re, label] of PREFIX) {
    if (re.test(bare) && (m === "PATCH" || m === "POST" || m === "PUT" || m === "DELETE")) {
      return label;
    }
  }

  if (path.startsWith("/api/admin")) {
    return {
      pending: `${m === "DELETE" ? "Removing" : "Saving"} changes…`,
      success: "Change saved",
    };
  }
  return null;
}

export function enrichSuccessMessage(path: string, method: string, data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  if (path.includes("/crm/users/import") && typeof d.imported === "number") {
    const errs = Array.isArray(d.errors) ? d.errors.length : 0;
    return `Leads uploaded · ${d.imported} client(s) added${errs ? ` · ${errs} row error(s)` : ""}`;
  }
  if (path.includes("/bulk-delete") && typeof d.deleted === "number") {
    return `Deleted ${d.deleted} client(s)${d.skipped ? ` · ${d.skipped} skipped` : ""}`;
  }
  if (path.includes("/bulk-update") && typeof d.updated === "number") {
    const targeted = typeof d.targeted === "number" ? d.targeted : d.updated;
    return `Bulk changes saved · ${d.updated} of ${targeted} client(s) updated`;
  }
  if (path.includes("/bulk-status") && typeof d.updated === "number") {
    return `Statuses updated · ${d.updated} client(s)`;
  }
  if (d.user && typeof d.user === "object" && "displayId" in (d.user as object)) {
    return `Client #${(d.user as { displayId: number }).displayId} updated`;
  }
  if (typeof d.updated === "number") return `Updated ${d.updated} record(s)`;
  if (typeof d.deleted === "number") return `Deleted ${d.deleted} record(s)`;
  if (d.ok === true) return "Done";
  if (method.toUpperCase() === "POST" && d.task) return "Task saved";
  if (method.toUpperCase() === "POST" && d.lead) return "Lead updated";

  return null;
}
