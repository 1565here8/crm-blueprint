export type PrefFieldType = "toggle" | "text" | "number" | "textarea" | "select";

export type PrefFieldDef = {
  key: string;
  label: string;
  type: PrefFieldType;
  defaultValue: string;
  group: string;
  options?: string[];
  help?: string;
};

export const PREFERENCE_FIELDS: PrefFieldDef[] = [
  { key: "pref.system_active", label: "System active", type: "toggle", defaultValue: "1", group: "Platform & trading" },
  { key: "pref.trading_active", label: "Trading active", type: "toggle", defaultValue: "1", group: "Platform & trading" },
  {
    key: "pref.system_asset_types",
    label: "System Asset Types",
    type: "textarea",
    defaultValue: "Currencies, Commodities, Indices, Stocks, Crypto USD, Crypto EUR",
    group: "Platform & trading",
  },
  {
    key: "pref.system_send_emails",
    label: "System Send Emails",
    type: "textarea",
    defaultValue:
      "Success Deposit, Failed Deposit, Withdrawal, Reset Password, Confirmation, Stop Out, F T D, Margin Call",
    group: "Email & SMTP",
  },
  { key: "pref.spread_management_active", label: "Spread management active", type: "toggle", defaultValue: "1", group: "Risk & spike" },
  { key: "pref.spike_protection_active", label: "Spike protection active", type: "toggle", defaultValue: "0", group: "Risk & spike" },
  {
    key: "pref.spike_protection_strategy",
    label: "Spike protection strategy",
    type: "select",
    defaultValue: "All",
    options: ["All", "Forex", "Crypto", "Stocks"],
    group: "Risk & spike",
  },
  { key: "pref.spike_protection_tolerance", label: "Spike protection tolerance", type: "text", defaultValue: "0.000000", group: "Risk & spike" },
  {
    key: "pref.spike_protection_tolerance_unit",
    label: "Spike protection tolerance unit",
    type: "select",
    defaultValue: "Percentage",
    options: ["Percentage", "Points", "Pips"],
    group: "Risk & spike",
  },
  { key: "pref.forex_allowed", label: "Forex Allowed", type: "toggle", defaultValue: "1", group: "Platform & trading" },
  { key: "pref.call_center", label: "Call Center", type: "toggle", defaultValue: "0", group: "Platform & trading" },
  { key: "pref.lot_count_min", label: "Lot Count Min", type: "number", defaultValue: "0.1", group: "Platform & trading" },
  { key: "pref.lot_count_max", label: "Lot Count Max", type: "number", defaultValue: "100", group: "Platform & trading" },
  { key: "pref.show_credit_card", label: "Show Credit Card", type: "toggle", defaultValue: "1", group: "Client deposit UI" },
  { key: "pref.show_resident_file", label: "Show Resident File", type: "toggle", defaultValue: "1", group: "Client deposit UI" },
  { key: "pref.show_identity_file", label: "Show IdentityFile", type: "toggle", defaultValue: "1", group: "Client deposit UI" },
  { key: "pref.show_verification", label: "Show Verification", type: "toggle", defaultValue: "1", group: "Client deposit UI" },
  { key: "pref.show_neteller", label: "Show Neteller", type: "toggle", defaultValue: "0", group: "Client deposit UI" },
  { key: "pref.show_skrill", label: "Show Skrill", type: "toggle", defaultValue: "0", group: "Client deposit UI" },
  { key: "pref.show_bank_details", label: "Show Bank Details", type: "toggle", defaultValue: "0", group: "Client deposit UI" },
  { key: "pref.show_verification_email_section", label: "Show Verification Email Section", type: "toggle", defaultValue: "0", group: "Client deposit UI" },
  { key: "pref.show_questionnaire_score", label: "Show Questionnaire Score", type: "toggle", defaultValue: "0", group: "Client deposit UI" },
  { key: "pref.show_exchange", label: "Show Exchange", type: "toggle", defaultValue: "1", group: "Client deposit UI" },
  { key: "pref.host_email", label: "Host Email", type: "text", defaultValue: "mail.privateemail.com", group: "Email & SMTP" },
  {
    key: "pref.smtp_provider",
    label: "Smtp Provider",
    type: "select",
    defaultValue: "Default",
    options: ["Default", "SendGrid", "Postmark", "SMTP"],
    group: "Email & SMTP",
  },
  { key: "pref.platform_sound", label: "Platform Sound", type: "toggle", defaultValue: "0", group: "Desk alerts" },
  { key: "pref.sound_for_assigned_agent", label: "Sound For Assigned Agent", type: "toggle", defaultValue: "0", group: "Desk alerts" },
  { key: "pref.default_withdrawal_limit", label: "Default Withdrawal Limit", type: "text", defaultValue: "all", group: "Limits & security" },
  { key: "pref.default_table_rows", label: "Default Table Rows Number", type: "number", defaultValue: "10", group: "Limits & security" },
  { key: "pref.limit_of_attempts", label: "Limit Of Attempts", type: "number", defaultValue: "5", group: "Limits & security" },
  { key: "pref.failed_attempt_login_time", label: "Failed Attempt Login Time", type: "number", defaultValue: "15", group: "Limits & security" },
  { key: "pref.enable_limit_of_attempts", label: "Enable Limit Of Attempts", type: "toggle", defaultValue: "1", group: "Limits & security" },
  { key: "pref.show_trading_bar", label: "Show Trading Bar", type: "toggle", defaultValue: "1", group: "Trading terminal UI" },
  { key: "pref.show_closed_pnl", label: "Show Closed PNL", type: "toggle", defaultValue: "1", group: "Trading terminal UI" },
  { key: "pref.show_pnl", label: "Show PNL", type: "toggle", defaultValue: "1", group: "Trading terminal UI" },
  { key: "pref.show_available_margin", label: "Show Available Margin", type: "toggle", defaultValue: "1", group: "Trading terminal UI" },
  { key: "pref.show_equity", label: "Show Equity", type: "toggle", defaultValue: "1", group: "Trading terminal UI" },
  { key: "pref.show_used_margin", label: "Show Used Margin", type: "toggle", defaultValue: "1", group: "Trading terminal UI" },
  { key: "pref.show_equity_margin_ratio", label: "Show Equity Margin Ratio", type: "toggle", defaultValue: "1", group: "Trading terminal UI" },
  { key: "pref.show_balance", label: "Show Balance", type: "toggle", defaultValue: "1", group: "Trading terminal UI" },
  { key: "pref.show_cash_balance", label: "Show Cash Balance", type: "toggle", defaultValue: "1", group: "Trading terminal UI" },
  { key: "pref.title_closed_pnl", label: "Title Closed PNL", type: "text", defaultValue: "", group: "Terminal column titles" },
  { key: "pref.title_used_margin", label: "Title Used Margin", type: "text", defaultValue: "", group: "Terminal column titles" },
  { key: "pref.title_equity", label: "Title Equity", type: "text", defaultValue: "", group: "Terminal column titles" },
  { key: "pref.title_pnl", label: "Title PNL", type: "text", defaultValue: "", group: "Terminal column titles" },
  { key: "pref.title_available_margin", label: "Title Available Margin", type: "text", defaultValue: "", group: "Terminal column titles" },
  { key: "pref.title_equity_margin_ratio", label: "Title Equity Margin Ratio", type: "text", defaultValue: "", group: "Terminal column titles" },
  { key: "pref.title_balance", label: "Title Balance", type: "text", defaultValue: "", group: "Terminal column titles" },
  { key: "pref.title_cash_balance", label: "Title Cash Balance", type: "text", defaultValue: "", group: "Terminal column titles" },
  { key: "common.default_currency", label: "Default currency", type: "text", defaultValue: "USD", group: "Desk defaults" },
  { key: "common.default_timezone", label: "Default timezone", type: "text", defaultValue: "UTC", group: "Desk defaults" },
  { key: "common.date_format", label: "Date format", type: "text", defaultValue: "DD/MM/YYYY", group: "Desk defaults" },
];

export const PREFERENCE_DEFAULTS: Record<string, string> = Object.fromEntries(
  PREFERENCE_FIELDS.map((f) => [f.key, f.defaultValue]),
);

export const PREFERENCE_GROUPS = [...new Set(PREFERENCE_FIELDS.map((f) => f.group))];
