/** CRM status values — re-export broker pipeline for admin UI fallbacks. */
export {
  BROKER_PIPELINE_STATUSES,
  BROKER_PIPELINE_STATUS_NAMES,
  type BrokerPipelineStatus,
} from "../shared/crmPipelineStatuses";

export const CRM_STATUSES = [
  "New",
  "Create",
  "No Answer",
  "Deposited",
  "Not Ready",
  "No Cash",
  "Wrong Number",
  "Bad Line",
  "Voicemail",
  "Call Back",
  "Email FUP",
  "Email Only",
  "High Potential",
  "Med Potential",
  "FUT",
  "Registered",
  "Depositor",
  "Verified",
  "Blocked",
] as const;

export type CrmStatus = (typeof CRM_STATUSES)[number];

export const CRM_SORT_FIELDS = ["display_id", "name", "registration", "status"] as const;
export type CrmSortField = (typeof CRM_SORT_FIELDS)[number];

/** Account / deposit currency options (admin selects on user creation). */
export const ACCOUNT_CURRENCIES = ["USD", "EUR", "GBP"] as const;
export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

export function isAccountCurrency(v: string): v is AccountCurrency {
  return (ACCOUNT_CURRENCIES as readonly string[]).includes(v);
}
