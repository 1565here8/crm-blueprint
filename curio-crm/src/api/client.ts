export type AccountCurrency = "USD" | "EUR" | "GBP";

export const ACCOUNT_CURRENCIES: AccountCurrency[] = ["USD", "EUR", "GBP"];

export type UserRole = "admin" | "user";

export type Quote = {
  symbol: string;
  assetClass: "us_equity" | "crypto";
  bid: number;
  ask: number;
  mid: number;
  source: "binance" | "yahoo" | "alpaca" | "demo";
  timestamp: string;
};

export type WatchlistItem = Quote & {
  series: number[];
  changePct: number;
};

export type MarketCategory =
  | "currencies"
  | "stocks"
  | "indexes"
  | "commodities"
  | "crypto_usdt"
  | "crypto_eurt";

export type ScreenerItem = WatchlistItem & {
  id: string;
  name: string;
  displaySymbol: string;
  category: MarketCategory;
  tvSymbol: string;
  tradable: boolean;
};

export type CatalogMeta = {
  categories: Array<{ id: MarketCategory; label: string; description: string }>;
  instruments: Array<{
    id: string;
    displaySymbol: string;
    name: string;
    category: MarketCategory;
    tvSymbol: string;
    tradable: boolean;
    assetClass: "us_equity" | "crypto";
  }>;
  totalInstruments: number;
};

export type PositionMark = {
  id: string;
  user_id: string;
  symbol: string;
  asset_class: "us_equity" | "crypto";
  qty: number;
  side: "long" | "short";
  entry_price: number;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  exit_price: number | null;
  pnl: number | null;
  mark: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
};

export type Execution = {
  id: string;
  symbol: string;
  asset_class: "us_equity" | "crypto";
  side: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT";
  qty: number;
  fill_price: number;
  notional: number;
  created_at: string;
};

export type PendingOrder = {
  id: string;
  user_id: string;
  username?: string;
  symbol: string;
  asset_class: "us_equity" | "crypto";
  side: "BUY" | "SELL";
  order_type: "MARKET" | "LIMIT";
  qty: number;
  limit_price: number | null;
  status: string;
  created_at: string;
  trade_number?: number;
};

export type ClosedPosition = {
  id: string;
  user_id: string;
  username?: string;
  trade_number?: number;
  displayTradeId?: string;
  symbol: string;
  asset_class: "us_equity" | "crypto";
  qty: number;
  side: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  commission?: number;
  status: "closed";
  opened_at: string;
  closed_at: string | null;
};

export type TradingDeskData = {
  userCount: number;
  openPositions: PositionMark[];
  pendingOrders: PendingOrder[];
  closedPositions: ClosedPosition[];
};

export type LedgerEntry = {
  id: string;
  user_id: string;
  amount_delta: number;
  reason: string;
  actor_id: string | null;
  created_at: string;
};

export type LedgerEntryRow = LedgerEntry & { username: string; actorName: string | null };

export type Depositor = {
  id: string;
  username: string;
  cashBalance: number;
  totalDeposits: number;
  depositCount: number;
  lastDepositAt: string | null;
  createdAt: string;
};

export type SalesReportRow = {
  username: string;
  deposits: number;
  withdrawals: number;
  net: number;
  depositTxCount: number;
};

export type AgentRow = { id: string; username: string; role: string; createdAt: string };

export type CrmNoteRow = {
  id: string;
  user_id: string | null;
  body: string;
  author_id: string;
  created_at: string;
  username?: string;
  authorName?: string;
};

export type CrmEmailRow = {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  author_id: string;
  sent_at: string;
  username?: string;
  authorName?: string;
};

export type CalendarEvent = {
  id: string;
  type: string;
  title: string;
  userId: string | null;
  username: string | null;
  at: string;
};

export type WireRequestRow = {
  id: string;
  user_id: string;
  username?: string;
  amount: number;
  bank_details: string;
  status: string;
  created_at: string;
  processed_at: string | null;
};

export type DepositRequestRow = {
  id: string;
  user_id: string;
  username?: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  processed_at: string | null;
};

export type MarketNewsItem = {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  link?: string;
};

export type AdminPosition = PositionMark & { username?: string; trade_number?: number };

export type MarketingApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  enabled: number;
  created_at: string;
  last_used_at: string | null;
};

export type MarketingTracker = {
  id: string;
  name: string;
  partner_name: string | null;
  platform: string;
  pixel_id: string | null;
  enabled: number;
  created_at: string;
};

export type MarketingCampaign = {
  id: string;
  name: string;
  partner_name: string | null;
  status: string;
  budget: number;
  created_at: string;
};

export type MarketingPartner = {
  id: string;
  name: string;
  contact_email: string | null;
  commission_pct: number;
  created_at: string;
};

export type DashboardStats = {
  period: { key: string; label: string };
  cards: { registrations: number; deposits: number; bonuses: number; withdrawals: number; adjustments: number };
  playerData: { activeUsers: number; inactiveUsers: number; avgPlayerValue: number; conversionRate: number; redepositRate: number };
  moneyIn: { netDeposits: number; ftds: number; avgFtd: number; avgRetentionDeposit: number; failedDeposits: number };
  trading: {
    trades: number;
    totalVolume: number;
    totalPnl: number;
    openForexPnl: number;
    openCryptoPnl: number;
    totalOpenPnl: number;
    closedForexPnl: number;
    closedCryptoPnl: number;
    totalClosedPnl: number;
    forexCommission: number;
    cryptoCommission: number;
    totalCommission: number;
  };
  moneyOut: { approvedWithdrawals: number; pendingWithdrawals: number };
};

export type UserSummary = {
  id: string;
  username: string;
  role: UserRole;
  cashBalance: number;
  buyingPower: number;
  portfolioValue: number;
  equity: number;
  unrealizedPnl: number;
  credits: number;
  openPositions: PositionMark[];
  createdAt: string;
  displayId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  currency?: string;
  phone?: string;
  countryCode?: string;
  crmStatus?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  nationality?: string;
  birthday?: string;
  extDocsRequired?: boolean;
  isAdmin?: boolean;
  isStaff?: boolean;
  permissions?: string[];
};

export type UserTransaction = {
  id: string;
  date: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "BONUS" | "ADJUSTMENT";
  method: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  amount: number;
  currency: string;
};

export type UserDocument = {
  id: string;
  user_id: string;
  doc_type: string;
  file_name: string;
  status: "pending" | "approved" | "rejected";
  notes: string;
  uploaded_at: string;
};

export type UserWireRequest = {
  id: string;
  user_id: string;
  amount: number;
  bank_details: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at: string | null;
};

export type PublicUser = {
  id: string;
  username: string;
  role: UserRole;
  cashBalance: number;
  credits: number;
  openPositionCount: number;
  createdAt: string;
};

export type OrderFill = {
  side: "BUY" | "SELL";
  symbol: string;
  qty: number;
  price: number;
  notional: number;
  orderType: "MARKET" | "LIMIT";
  filledAt: string;
};

import { describeAdminAction, enrichSuccessMessage } from "../lib/adminActionLabels";
import { pushAdminToast, updateAdminToast } from "../lib/adminToastBus";
import { messageForServerStatus } from "../../shared/maintenanceCopy";
import { sanitizeApiJsonForCurionilabs } from "../lib/curionilabsGuard";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const action = describeAdminAction(path, method);
  const toastId = action ? pushAdminToast(action.pending, "loading") : null;

  try {
    const res = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const raw = await res.text();
    let parsed: T & { error?: string };
    try {
      parsed = (raw ? JSON.parse(raw) : {}) as T & { error?: string };
    } catch {
      parsed = {} as T & { error?: string };
    }
    const data = sanitizeApiJsonForCurionilabs(parsed);
    if (!res.ok) {
      const errMsg =
        data.error ??
        (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504
          ? messageForServerStatus(res.status)
          : res.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : `Request failed (${res.status})`);
      if (toastId) updateAdminToast(toastId, errMsg, "error");
      else if (path.startsWith("/api/admin") && method !== "GET" && method !== "HEAD") {
        pushAdminToast(errMsg, "error");
      }
      throw new Error(errMsg);
    }
    if (toastId) {
      updateAdminToast(
        toastId,
        enrichSuccessMessage(path, method, data) ?? action!.success,
        "success",
      );
    }
    return data;
  } catch (err) {
    if (toastId && err instanceof Error && !err.message.includes("Request failed")) {
      updateAdminToast(toastId, err.message, "error");
    }
    throw err;
  }
}

export type MarketStatus = {
  usEquity: { session: string; label: string; tradable: boolean; hoursNote: string };
  crypto: { label: string; tradable: boolean; hoursNote: string };
  costModel: { perUserFee: 0; note: string };
};

export type CrmBranding = {
  goToSiteUrl: string;
  crmBrandName: string;
  goToSiteLabel: string;
};

export type OnlineVisitor = {
  sessionId: string;
  userId: string | null;
  username: string | null;
  role: string | null;
  ip: string;
  currentPage: string;
  activity: string;
  country: string;
  campaign: string | null;
  referrer: string | null;
  device: "desktop" | "mobile";
  authenticated: boolean;
};

export type OnlineStats = {
  total: number;
  authenticated: number;
  anonymous: number;
  desktop: number;
  mobile: number;
  organic: number;
  campaigns: number;
  byCountry: { country: string; count: number }[];
};

export type SpreadAssetClass =
  | "currencies"
  | "commodities"
  | "indices"
  | "stocks"
  | "crypto_usd"
  | "crypto_eur";

export type SpreadUnit = "pip" | "percent";

export type SpreadTier = {
  id: number;
  name: string;
  slug: string;
  trade_percent: number;
  is_positive: number;
  sort_order: number;
  account_type_id: number | null;
  account_type_name: string | null;
};

export type SpreadExchangeCell = {
  tier_id: number;
  asset_class: SpreadAssetClass;
  value: number;
  unit: SpreadUnit;
};

export type SpreadClientOverride = {
  id: number;
  user_id: string | null;
  is_demo: number;
  tier_id: number | null;
  overrides_json: string;
  updated_at: string;
};

export type SpreadBundle = {
  assetClasses: Array<{ id: SpreadAssetClass; label: string }>;
  tiers: SpreadTier[];
  exchange: SpreadExchangeCell[];
  override: SpreadClientOverride | null;
  defaults: Record<SpreadAssetClass, { value: number; unit: SpreadUnit }>;
};

export type SpreadPreviewPoint = {
  assetClass: SpreadAssetClass;
  label: string;
  effectivePercent: number;
  rawValue: number;
  unit: SpreadUnit;
};

export type SpreadOverridesJson = {
  tiers?: Record<string, { tradePercent?: number; isPositive?: boolean }>;
  cells?: Record<string, Partial<Record<SpreadAssetClass, { value: number; unit: SpreadUnit }>>>;
};

export type CommissionSetting = {
  asset_class: "us_equity" | "crypto";
  commission_type: "percent" | "fixed_per_trade" | "fixed_per_lot";
  value: number;
  min_commission: number;
  max_commission: number;
  enabled: number;
  updated_at: string;
};

export type CommissionMatrixCurrency =
  | "USD"
  | "EUR"
  | "AUD"
  | "GBP"
  | "RUB"
  | "CHF"
  | "CNY"
  | "JPY"
  | "BTC";

export type CommissionMatrixCell = {
  tier: number;
  currency: CommissionMatrixCurrency;
  amount: number;
};

export type CommissionMatrixTier = {
  tier: number;
  label: string;
  linkedAccountTypes: Array<{ id: number; name: string; slug: string }>;
};

export type CommissionMatrix = {
  tiers: CommissionMatrixTier[];
  currencies: CommissionMatrixCurrency[];
  cells: CommissionMatrixCell[];
  updatedAt: string | null;
};

export type CrmUser = {
  id: string;
  displayId: number;
  online: boolean;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  phone2: string;
  email: string;
  countryCode: string;
  agentName: string;
  crmStatus: string;
  tradingStatus: string;
  param1: string;
  partner: string;
  campaign: string;
  affiliate: string;
  campaignId: string;
  cpa: string;
  cpl: string;
  comments: string;
  funnel: string;
  conversionRate: string;
  playerValue: string;
  computedPlayerValue: number;
  computedConversionRate: string;
  importedSource: string;
  currency: string;
  desk: string;
  text1: string;
  address: string;
  address1: string;
  city: string;
  state: string;
  zipCode: string;
  nationality: string;
  birthday: string;
  role: UserRole;
  credits: number;
  cashBalance: number;
  createdAt: string;
  lastLoginAt: string | null;
  noteCount: number;
  lastNoteAt: string | null;
  totalDeposits: number;
  totalAdjustments: number;
  totalBonuses: number;
  approvedWithdrawals: number;
  pendingWithdrawals: number;
  totalVolume: number;
  totalClosedPnl: number;
  totalOpenPnl: number;
  equity: number;
  bonusBalance: number;
  extDocsRequired: boolean;
  exchangeSpread: number;
};

export type DripTriggerType =
  | "kyc_chase"
  | "no_deposit"
  | "dormant"
  | "wire_pending"
  | "failed_deposit"
  | "birthday"
  | "custom";

export type DripCampaign = {
  id: string;
  name: string;
  trigger_type: DripTriggerType;
  trigger_config: string | null;
  cadence_hours: string;
  prompt_template: string;
  auto_send: boolean;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DripHistoryItem = {
  id: string;
  campaign_id: string;
  user_id: string;
  attempt_number: number;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed" | "cancelled";
  scheduled_for: string | null;
  sent_at: string | null;
  approved_by: string | null;
  created_at: string;
};

export type CrmUserPatch = Partial<{
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  address1: string;
  city: string;
  state: string;
  zipCode: string;
  countryCode: string;
  nationality: string;
  birthday: string;
  currency: string;
  agentName: string;
  desk: string;
  crmStatus: string;
  tradingStatus: string;
  text1: string;
  partner: string;
  campaign: string;
  affiliate: string;
  campaignId: string;
  cpa: string;
  cpl: string;
  comments: string;
  funnel: string;
  conversionRate: string;
  playerValue: string;
  computedPlayerValue: number;
  computedConversionRate: string;
  importedSource: string;
  param1: string;
  extDocsRequired: boolean;
  exchangeSpread: number;
}>;

export const client = {
  session: () =>
    api<{
      authenticated: boolean;
      user?: UserSummary;
      impersonating?: boolean;
      impersonatorUsername?: string;
      freeLiveFeeds?: boolean;
      alpacaConfigured?: boolean;
      market?: MarketStatus;
      platform?: { paymentGateway: false; note: string };
    }>("/api/auth/session"),
  login: (username: string, password: string) =>
    api<{
      user: UserSummary;
      freeLiveFeeds: boolean;
      alpacaConfigured: boolean;
      market: MarketStatus;
      platform: { paymentGateway: false; note: string };
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => api<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  stopImpersonate: () =>
    api<{
      user: UserSummary;
      impersonating: false;
      freeLiveFeeds: boolean;
      alpacaConfigured: boolean;
      market: MarketStatus;
    }>("/api/auth/stop-impersonate", { method: "POST" }),

  getPublicBranding: () => api<{ branding: CrmBranding }>("/api/public/branding"),

  watchlist: () => api<{ quotes: WatchlistItem[] }>("/api/market/watchlist"),
  catalog: () => api<CatalogMeta>("/api/market/catalog"),
  screener: (category: MarketCategory) =>
    api<{ category: MarketCategory; instruments: ScreenerItem[]; market: MarketStatus }>(
      `/api/market/screener/${category}`,
    ),
  screenerAll: () =>
    api<{ screener: Record<MarketCategory, ScreenerItem[]>; market: MarketStatus }>(
      "/api/market/screener-all",
    ),
  instrument: (id: string) => api<{ instrument: ScreenerItem }>(`/api/market/instrument/${id}`),
  quotePreview: (symbol: string, assetClass: "us_equity" | "crypto") =>
    api<{ quote: Quote }>(
      `/api/user/quote-preview?symbol=${encodeURIComponent(symbol)}&assetClass=${assetClass}`,
    ),

  adminUsers: () => api<{ users: PublicUser[] }>("/api/admin/users"),
  adminCreateUser: (body: {
    username: string;
    password: string;
    initialBalance?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    countryCode?: string;
    agentName?: string;
    crmStatus?: string;
    param1?: string;
    currency?: AccountCurrency;
  }) => api<{ user: CrmUser }>("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
  adminCredit: (userId: string, amount: number) =>
    api("/api/admin/ledger/credit", { method: "POST", body: JSON.stringify({ userId, amount }) }),
  adminDebit: (userId: string, amount: number) =>
    api("/api/admin/ledger/debit", { method: "POST", body: JSON.stringify({ userId, amount }) }),
  adminOpenTrade: (body: {
    userId: string;
    symbol: string;
    assetClass: "us_equity" | "crypto";
    qty: number;
  }) => api("/api/admin/trades/open", { method: "POST", body: JSON.stringify(body) }),
  adminCloseTrade: (positionId: string, qty?: number) =>
    api("/api/admin/trades/close", {
      method: "POST",
      body: JSON.stringify({ positionId, ...(qty != null ? { qty } : {}) }),
    }),
  adminTradingDesk: (userIds: string[]) => {
    const qs = userIds.length ? `?userIds=${encodeURIComponent(userIds.join(","))}` : "";
    return api<TradingDeskData>(`/api/admin/trading/desk${qs}`);
  },

  me: () => api<{ user: UserSummary }>("/api/user/me"),
  pending: () => api<{ orders: PendingOrder[] }>("/api/user/pending"),
  history: () => api<{ closedPositions: ClosedPosition[] }>("/api/user/history"),
  executions: () => api<{ executions: Execution[] }>("/api/user/executions"),
  placeOrder: (body: {
    symbol: string;
    assetClass: "us_equity" | "crypto";
    qty: number;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT";
    limitPrice?: number;
    positionId?: string;
  }) =>
    api<{ fill?: OrderFill; pending?: boolean; order?: PendingOrder; account: UserSummary }>(
      "/api/user/orders",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),
  withdraw: (amount: number) =>
    api<{ creditsAdded: number; newCredits: number; user: UserSummary }>("/api/user/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),

  presenceHeartbeat: (body: {
    page: string;
    activity?: string;
    campaign?: string | null;
    referrer?: string | null;
  }) => api<{ ok: boolean }>("/api/presence/heartbeat", { method: "POST", body: JSON.stringify(body) }),

  adminOnline: () =>
    api<{ stats: OnlineStats; visitors: OnlineVisitor[] }>("/api/admin/online"),

  adminGetCommission: (assetClass: "us_equity" | "crypto") =>
    api<{ setting: CommissionSetting }>(`/api/admin/system/commissions/${assetClass === "crypto" ? "crypto" : "forex"}`),

  adminUpdateCommission: (
    assetClass: "us_equity" | "crypto",
    body: {
      commissionType: CommissionSetting["commission_type"];
      value: number;
      minCommission: number;
      maxCommission: number;
      enabled: boolean;
    },
  ) =>
    api<{ setting: CommissionSetting }>(`/api/admin/system/commissions/${assetClass === "crypto" ? "crypto" : "forex"}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  adminGetCryptoCommissionMatrix: () => api<CommissionMatrix>("/api/admin/system/crypto-commissions"),

  adminUpdateCryptoCommissionMatrix: (cells: CommissionMatrixCell[]) =>
    api<CommissionMatrix>("/api/admin/system/crypto-commissions", {
      method: "PUT",
      body: JSON.stringify({ cells }),
    }),

  adminGetSpread: (params?: { userId?: string; demo?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.userId) q.set("userId", params.userId);
    if (params?.demo) q.set("demo", "1");
    const qs = q.toString();
    return api<SpreadBundle>(`/api/admin/system/spread${qs ? `?${qs}` : ""}`);
  },

  adminPatchSpreadTier: (
    tierId: number,
    body: { tradePercent?: number; isPositive?: boolean; name?: string },
  ) =>
    api<{ tier: SpreadTier }>(`/api/admin/system/spread/tiers/${tierId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminPatchSpreadExchange: (
    body:
      | { tierId: number; assetClass: SpreadAssetClass; value: number; unit: SpreadUnit }
      | { tierId: number; cells: Array<{ assetClass: SpreadAssetClass; value: number; unit: SpreadUnit }> },
  ) =>
    api<{ cell?: SpreadExchangeCell; cells?: SpreadExchangeCell[] }>("/api/admin/system/spread/exchange", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminApplySpreadExchangeToAll: (body: { assetClass: SpreadAssetClass; value: number; unit: SpreadUnit }) =>
    api<{ updated: number }>("/api/admin/system/spread/exchange/apply-to-all", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminRestoreSpreadExchangeDefaults: () =>
    api<{ ok: boolean; exchange: SpreadExchangeCell[] }>("/api/admin/system/spread/exchange/restore-defaults", {
      method: "POST",
    }),

  adminGetSpreadPreview: (params?: { tierId?: number; tierSlug?: string; userId?: string; demo?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.tierId) q.set("tierId", String(params.tierId));
    if (params?.tierSlug) q.set("tierSlug", params.tierSlug);
    if (params?.userId) q.set("userId", params.userId);
    if (params?.demo) q.set("demo", "1");
    const qs = q.toString();
    return api<{ points: SpreadPreviewPoint[]; tierLabel: string }>(
      `/api/admin/system/spread/preview${qs ? `?${qs}` : ""}`,
    );
  },

  adminPatchSpreadOverride: (body: {
    userId?: string | null;
    demo?: boolean;
    tierId?: number | null;
    overrides?: SpreadOverridesJson;
  }) =>
    api<{ override: SpreadClientOverride | null }>("/api/admin/system/spread/override", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminGetBranding: () => api<{ branding: CrmBranding }>("/api/admin/system/common"),

  adminUpdateBranding: (body: CrmBranding) =>
    api<{ branding: CrmBranding }>("/api/admin/system/common", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  adminSuperAdminGroups: () =>
    api<{ groups: Array<{ id: string; name: string; allowed_ips: string; updated_at: string }> }>(
      "/api/admin/super-admin/groups",
    ),

  adminSuperAdminSetGroupsAll: () =>
    api<{ ok: boolean; message: string; groupsUpdated: number }>("/api/admin/super-admin/groups/set-all-ips", {
      method: "POST",
    }),

  adminSuperAdminRefreshPhones: () =>
    api<{ ok: boolean; message: string; agentsUpdated: number }>(
      "/api/admin/super-admin/refresh-agent-phones",
      { method: "POST" },
    ),

  adminSuperAdminPurgeCache: () =>
    api<{ ok: boolean; message: string; cachesCleared: string[] }>("/api/admin/super-admin/purge-cache", {
      method: "POST",
    }),

  adminSuperAdminEvents: (kind?: string) => {
    const q = kind ? `?kind=${encodeURIComponent(kind)}` : "";
    return api<{
      events: Array<{ id: number; kind: string; message: string; actor: string | null; created_at: string }>;
    }>(`/api/admin/super-admin/events${q}`);
  },

  adminCrmUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    agent?: string;
    deskId?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    if (params?.agent) q.set("agent", params.agent);
    if (params?.deskId) q.set("deskId", String(params.deskId));
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortDir) q.set("sortDir", params.sortDir);
    const qs = q.toString();
    return api<{
      users: CrmUser[];
      total: number;
      page: number;
      limit: number;
      dateRange: { from: string | null; to: string | null };
      agents: string[];
    }>(`/api/admin/crm/users${qs ? `?${qs}` : ""}`);
  },

  adminCrmStatuses: () => api<{ statuses: string[] }>("/api/admin/crm/statuses"),

  adminBulkCrmStatus: (userIds: string[], crmStatus: string) =>
    api<{ users: CrmUser[]; updated: number }>("/api/admin/crm/users/bulk-status", {
      method: "POST",
      body: JSON.stringify({ userIds, crmStatus }),
    }),

  adminBulkCrmUpdate: (userIds: string[], patch: CrmUserPatch) =>
    api<{ updated: number; targeted?: number }>("/api/admin/crm/users/bulk-update", {
      method: "POST",
      body: JSON.stringify({ userIds, patch }),
    }),

  adminBulkCrmUpdateScoped: (body: {
    scope: "checked" | "page" | "all";
    userIds?: string[];
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    agent?: string;
    patch: CrmUserPatch;
  }) =>
    api<{ updated: number; targeted: number }>("/api/admin/crm/users/bulk-update-scoped", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminBulkCrmDelete: (userIds: string[]) =>
    api<{ deleted: number; skipped: number }>("/api/admin/crm/users/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ userIds, confirm: true }),
    }),

  adminCrmUserIds: (params?: { search?: string; status?: string; agent?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.agent) qs.set("agent", params.agent);
    const q = qs.toString();
    return api<{ ids: string[]; total: number }>(`/api/admin/crm/users/ids${q ? `?${q}` : ""}`);
  },

  adminCrmUser: (id: string) =>
    api<{ user: CrmUser; adjacent: { prevId: string | null; nextId: string | null } }>(
      `/api/admin/crm/users/${id}`,
    ),

  adminImpersonateUser: (id: string) =>
    api<{ user: UserSummary; impersonating: true; impersonatorUsername: string }>(
      `/api/admin/crm/users/${id}/impersonate`,
      { method: "POST" },
    ),

  adminUpdateCrmUser: (id: string, patch: CrmUserPatch) =>
    api<{ user: CrmUser }>(`/api/admin/crm/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  adminImportCrmUsers: (csv: string) =>
    api<{
      imported: number;
      users: CrmUser[];
      errors: { line: number; error: string }[];
      columnMapping?: Record<string, string>;
    }>("/api/admin/crm/users/import", { method: "POST", body: JSON.stringify({ csv }) }),

  adminCreateCrmNote: (body: { userId: string; body: string }) =>
    api("/api/admin/crm/notes", { method: "POST", body: JSON.stringify(body) }),

  adminCreateCrmEmail: (body: { userId: string; subject: string; body: string }) =>
    api("/api/admin/crm/emails", { method: "POST", body: JSON.stringify(body) }),

  register: (body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    countryCode: string;
    phone: string;
    promoCode?: string;
    currency?: AccountCurrency;
    acceptedTerms: true;
    notUsCitizen: true;
    campaign?: string;
  }) =>
    api<{
      user: UserSummary;
      freeLiveFeeds: boolean;
      alpacaConfigured: boolean;
      market: MarketStatus;
    }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),

  ledger: () => api<{ entries: LedgerEntry[] }>("/api/user/ledger"),
  transactions: () => api<{ transactions: UserTransaction[] }>("/api/user/transactions"),
  userDocuments: () => api<{ documents: UserDocument[] }>("/api/user/documents"),
  uploadDocument: (body: { docType: string; fileName: string; notes?: string }) =>
    api<{ document: UserDocument }>("/api/user/documents", { method: "POST", body: JSON.stringify(body) }),
  wireRequests: () => api<{ requests: UserWireRequest[] }>("/api/user/wire-requests"),
  createWireRequest: (body: { amount: number; bankDetails: string }) =>
    api<{ request: UserWireRequest; user: UserSummary }>("/api/user/wire-requests", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createDepositRequest: (body: {
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
  }) =>
    api<{ request: DepositRequestRow; user: UserSummary }>("/api/user/deposit-requests", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  marketNews: (symbol: string) =>
    api<{ symbol: string; items: MarketNewsItem[] }>(`/api/market/news?symbol=${encodeURIComponent(symbol)}`),
  cancelPending: (id: string) =>
    api<{ order: PendingOrder; account: UserSummary }>(`/api/user/pending/${id}`, { method: "DELETE" }),

  adminDashboard: (period?: string) =>
    api<DashboardStats>(`/api/admin/dashboard${period ? `?period=${period}` : ""}`),

  adminDepositors: () => api<{ depositors: Depositor[] }>("/api/admin/crm/depositors"),
  adminSalesReport: (period?: string) =>
    api<{ rows: SalesReportRow[]; period: string }>(`/api/admin/crm/sales-report${period ? `?period=${period}` : ""}`),
  adminAgents: () => api<{ agents: AgentRow[] }>("/api/admin/crm/agents"),
  adminAgentRoster: () =>
    api<{ agents: Array<{ name: string; clientCount: number }>; totalClients: number }>(
      "/api/admin/crm/agents/roster",
    ),
  adminNotes: () => api<{ notes: CrmNoteRow[] }>("/api/admin/crm/notes"),
  adminEmails: () => api<{ emails: CrmEmailRow[] }>("/api/admin/crm/emails"),
  adminCalendar: (month?: string) =>
    api<{ events: CalendarEvent[] }>(`/api/admin/crm/calendar${month ? `?month=${month}` : ""}`),

  adminCashierDeposits: () => api<{ entries: LedgerEntryRow[] }>("/api/admin/cashier/deposits"),
  adminCashierBonuses: () => api<{ entries: LedgerEntryRow[] }>("/api/admin/cashier/bonuses"),
  adminCashierAdjustments: () => api<{ entries: LedgerEntryRow[] }>("/api/admin/cashier/adjustments"),
  adminCashierWithdrawals: () => api<{ entries: LedgerEntryRow[] }>("/api/admin/cashier/withdrawals"),
  adminCashierLedger: () => api<{ entries: LedgerEntryRow[] }>("/api/admin/cashier/ledger"),
  adminWireRequests: () => api<{ requests: WireRequestRow[] }>("/api/admin/cashier/wire-req"),
  adminCreateWireRequest: (body: { userId: string; amount: number; bankDetails: string }) =>
    api("/api/admin/cashier/wire-req", { method: "POST", body: JSON.stringify(body) }),
  adminProcessWire: (id: string, status: "approved" | "rejected") =>
    api(`/api/admin/cashier/wire-req/${id}/process`, { method: "POST", body: JSON.stringify({ status }) }),
  adminDepositRequests: () => api<{ requests: DepositRequestRow[] }>("/api/admin/cashier/deposit-requests"),
  adminProcessDeposit: (id: string, status: "approved" | "rejected") =>
    api(`/api/admin/cashier/deposit-requests/${id}/process`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  adminBonus: (body: { userId: string; amount: number }) =>
    api("/api/admin/cashier/bonus", { method: "POST", body: JSON.stringify(body) }),
  adminAdjustment: (body: { userId: string; amount: number }) =>
    api("/api/admin/cashier/adjustment", { method: "POST", body: JSON.stringify(body) }),

  adminPositions: (status?: "open" | "closed", userId?: string) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (userId) q.set("userId", userId);
    const qs = q.toString();
    return api<{ positions: AdminPosition[] }>(`/api/admin/trading/positions${qs ? `?${qs}` : ""}`);
  },
  adminPendingOrders: (userId?: string) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return api<{ orders: PendingOrder[] }>(`/api/admin/trading/pending${qs}`);
  },
  adminCancelPending: (id: string) =>
    api<{ order: PendingOrder }>(`/api/admin/trading/pending/${id}`, { method: "DELETE" }),
  adminSetPositionStops: (
    positionId: string,
    body: { userId: string; stopLoss?: number | null; takeProfit?: number | null },
  ) =>
    api<{ position: AdminPosition }>(`/api/admin/trading/positions/${positionId}/stops`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  setPositionStops: (positionId: string, body: { stopLoss?: number | null; takeProfit?: number | null }) =>
    api<{ position: PositionMark; user: UserSummary }>(`/api/user/positions/${positionId}/stops`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  adminDeleteTrade: (tradeNumber: number) =>
    api(`/api/admin/trading/trades/${tradeNumber}`, { method: "DELETE" }),

  adminMarketingApiKeys: () => api<{ keys: MarketingApiKey[] }>("/api/admin/marketing/api-keys"),
  adminCreateApiKey: (name: string) =>
    api("/api/admin/marketing/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
  adminRevokeApiKey: (id: string) =>
    api(`/api/admin/marketing/api-keys/${id}/revoke`, { method: "POST" }),
  adminMarketingTrackers: () => api<{ trackers: MarketingTracker[] }>("/api/admin/marketing/trackers"),
  adminCreateTracker: (body: Record<string, unknown>) =>
    api("/api/admin/marketing/trackers", { method: "POST", body: JSON.stringify(body) }),
  adminDeleteTracker: (id: string) =>
    api(`/api/admin/marketing/trackers/${id}`, { method: "DELETE" }),
  adminMarketingCampaigns: () => api<{ campaigns: MarketingCampaign[] }>("/api/admin/marketing/campaigns"),
  adminCreateCampaign: (body: { name: string; partnerName?: string; budget?: number }) =>
    api("/api/admin/marketing/campaigns", { method: "POST", body: JSON.stringify(body) }),
  adminMarketingPartners: () => api<{ partners: MarketingPartner[] }>("/api/admin/marketing/partners"),
  adminCreatePartner: (body: { name: string; contactEmail?: string; commissionPct?: number }) =>
    api("/api/admin/marketing/partners", { method: "POST", body: JSON.stringify(body) }),

  /* ----------------------------- THE DESK (AI) ----------------------------- */

  deskStatus: () =>
    api<{
      available: boolean;
      model: string;
      baseUrl: string;
      installedModels: string[];
      error?: string;
      setup?: {
        mode: "hosted" | "local";
        ollamaDownloadUrl: string;
        headline: string;
        steps: string[];
      };
    }>("/api/admin/desk/status"),

  deskConnect: async (body?: { host?: string; tunnel?: boolean }) => {
    type R = { ok: boolean; connected: boolean; message: string; restarted: boolean };
    const payload = JSON.stringify(body ?? {});
    const curioni =
      typeof window !== "undefined" && window.location.hostname.includes("curionilabs");
    const paths = curioni
      ? ["/api/mac-bridge/connect", "/api/admin/desk/connect", "/api/desk/connect"]
      : ["/api/admin/desk/connect"];
    let last = "Connect failed.";
    for (const path of paths) {
      try {
        return await api<R>(path, { method: "POST", body: payload });
      } catch (e) {
        last = e instanceof Error ? e.message : String(e);
        if (!last.includes("404") && !last.includes("(404)")) throw e;
      }
    }
    throw new Error(last);
  },

  deskAudit: () =>
    api<{ report: DeskAuditReport; warning?: string }>("/api/admin/desk/audit"),

  deskMarketBrief: () =>
    api<{ brief: DeskMarketBrief; warning?: string }>("/api/admin/desk/market-brief"),

  deskOperatorBrief: () =>
    api<DeskLlmReply>("/api/admin/desk/operator-brief", { method: "POST", body: "{}" }),

  deskAgentBrief: () =>
    api<DeskLlmReply & { snapshot?: DeskMarketBrief }>("/api/admin/desk/agent-brief", {
      method: "POST",
      body: "{}",
    }),

  deskClientPitch: (userId: string) =>
    api<DeskLlmReply>("/api/admin/desk/client-pitch", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  deskAsk: (body: {
    message: string;
    includeAudit?: boolean;
    includeMarket?: boolean;
    category?: DeskAuditCategoryKey;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  }) => api<DeskLlmReply>("/api/admin/desk/ask", { method: "POST", body: JSON.stringify(body) }),

  /**
   * Admin-wide floating bubble. Accepts free-form text + optional attachments
   * (each `contentText` for pre-extracted text, or `contentBase64` for PDFs /
   * audio / images) and routes through ASSIST_MODE or SALES_CALL_REVIEW.
   */
  deskAssist: (body: {
    message: string;
    mode?: "assist" | "sales_call";
    callTranscript?: string;
    includeAudit?: boolean;
    includeMarket?: boolean;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    attachments?: Array<{
      name: string;
      mime: string;
      size: number;
      contentText?: string | null;
      contentBase64?: string | null;
    }>;
  }) =>
    api<
      DeskLlmReply & {
        mode: "assist" | "sales_call";
        attachments: Array<{
          name: string;
          mime: string;
          sizeBytes: number;
          kind: "text" | "pdf" | "audio" | "image" | "binary";
          extractedChars: number;
          preview: string;
          note?: string;
        }>;
      }
    >("/api/admin/desk/assist", { method: "POST", body: JSON.stringify(body) }),

  /**
   * Streaming variant of deskAssist — SSE tokens then done + disclaimer.
   */
  deskAssistStream: async (
    body: {
      message: string;
      mode?: "assist" | "sales_call";
      callTranscript?: string;
      includeAudit?: boolean;
      includeMarket?: boolean;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      attachments?: Array<{
        name: string;
        mime: string;
        size: number;
        contentText?: string | null;
        contentBase64?: string | null;
      }>;
    },
    handlers: { onToken: (token: string) => void },
  ): Promise<{ ok: boolean; degraded?: string; disclaimer?: string }> => {
    let toastId: string | null = null;
    const toastTimer = setTimeout(() => {
      toastId = pushAdminToast("Wallstreet AI thinking…", "loading");
    }, 500);
    try {
    const res = await fetch("/api/admin/desk/assist/stream", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        degraded?: string;
        ok?: boolean;
      };
      if (data.reply) handlers.onToken(data.reply.replace(/\n\n——————————————[\s\S]*$/, "").trimEnd());
      if (!res.ok) {
        const errMsg = data.error ?? `Request failed (${res.status})`;
        if (toastId) updateAdminToast(toastId, errMsg, "error");
        throw new Error(errMsg);
      }
      if (toastId) updateAdminToast(toastId, data.degraded ? "AI reply (degraded)" : "AI reply ready", data.degraded ? "error" : "success");
      clearTimeout(toastTimer);
      return { ok: data.ok ?? false, degraded: data.degraded };
    }

    if (!res.ok || !res.body) {
      const errMsg = `Stream failed (${res.status})`;
      if (toastId) updateAdminToast(toastId, errMsg, "error");
      clearTimeout(toastTimer);
      throw new Error(errMsg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let degraded: string | undefined;
    let disclaimer: string | undefined;
    let ok = true;
    let gotToken = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const j = JSON.parse(line.slice(6)) as {
              t?: string;
              done?: boolean;
              disclaimer?: string;
              degraded?: string;
              ping?: number;
            };
            if (j.ping) continue;
            if (typeof j.t === "string" && j.t) {
              gotToken = true;
              clearTimeout(toastTimer);
              handlers.onToken(j.t);
            }
            if (j.done) {
              if (j.disclaimer) disclaimer = j.disclaimer;
              if (j.degraded) {
                degraded = j.degraded;
                ok = false;
              }
            }
          } catch {
            /* skip malformed SSE chunk */
          }
        }
      }
    }

    if (!gotToken) {
      const sync = await fetch("/api/admin/desk/assist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await sync.json().catch(() => ({}))) as {
        reply?: string;
        degraded?: string;
        ok?: boolean;
      };
      if (data.reply) {
        gotToken = true;
        handlers.onToken(data.reply.replace(/\n\n——————————————[\s\S]*$/, "").trimEnd());
        if (data.degraded) {
          degraded = data.degraded;
          ok = data.ok ?? false;
        }
      }
    }

    if (toastId) updateAdminToast(toastId, degraded ? "AI reply (degraded)" : "AI reply ready", degraded ? "error" : "success");
    clearTimeout(toastTimer);
    return { ok: gotToken && ok, degraded, disclaimer };
    } catch (err) {
      clearTimeout(toastTimer);
      if (err instanceof Error && toastId) updateAdminToast(toastId, err.message, "error");
      throw err;
    }
  },

  /* ---- desk: my permissions ---- */
  deskMyPermissions: () =>
    api<{
      role: "admin" | "staff" | "user" | "anon";
      isAdmin: boolean;
      isStaff: boolean;
      permissions: string[];
    }>("/api/admin/desk/me/permissions"),

  /* ---- desk: lead inbox ---- */
  deskLeadList: (status?: "new" | "assigned" | "dismissed" | "converted") =>
    api<{ leads: ChatLead[]; stats: Record<string, number> }>(
      `/api/admin/desk/leads${status ? `?status=${status}` : ""}`,
    ),
  deskLeadGet: (id: string) =>
    api<{ lead: ChatLead }>(`/api/admin/desk/leads/${id}`),
  deskLeadAssign: (id: string, agentName: string) =>
    api<{ lead: ChatLead }>(`/api/admin/desk/leads/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ agentName }),
    }),
  deskLeadDismiss: (id: string) =>
    api<{ lead: ChatLead }>(`/api/admin/desk/leads/${id}/dismiss`, { method: "POST", body: "{}" }),
  deskLeadRecommend: (id: string) =>
    api<{ reply: string; ok: boolean; degraded?: string }>(
      `/api/admin/desk/leads/${id}/recommend`,
      { method: "POST", body: "{}" },
    ),

  /* ---- desk: psp health ---- */
  deskPspHealth: () =>
    api<{ report: DeskPspHealthReport; warning?: string }>(`/api/admin/desk/psp-health`),

  /* ---- desk: collections brief ---- */
  deskCollectionsBrief: () =>
    api<DeskLlmReply>(`/api/admin/desk/collections-brief`, { method: "POST", body: "{}" }),

  /* ---- desk: tasks ---- */
  deskTaskList: (status: "open" | "completed" | "dismissed" = "open") =>
    api<{ tasks: DeskTask[]; stats: { open: number; completed: number; dismissed: number } }>(
      `/api/admin/desk/tasks?status=${status}`,
    ),
  deskTaskCreate: (body: {
    kind?: string;
    title: string;
    body?: string;
    userId?: string;
    leadId?: string;
    priority?: number;
    assignedTo?: string;
  }) => api<{ task: DeskTask }>(`/api/admin/desk/tasks`, { method: "POST", body: JSON.stringify(body) }),
  deskTaskComplete: (id: string) =>
    api<{ task: DeskTask }>(`/api/admin/desk/tasks/${id}/complete`, { method: "POST", body: "{}" }),
  deskTaskDismiss: (id: string) =>
    api<{ task: DeskTask }>(`/api/admin/desk/tasks/${id}/dismiss`, { method: "POST", body: "{}" }),
  deskTaskReopen: (id: string) =>
    api<{ task: DeskTask }>(`/api/admin/desk/tasks/${id}/reopen`, { method: "POST", body: "{}" }),
  deskTaskAssign: (id: string, assignedTo: string | null) =>
    api<{ task: DeskTask }>(`/api/admin/desk/tasks/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ assignedTo }),
    }),
  deskTaskGenerate: () =>
    api<{ created: number; skipped: number; warning?: string }>(
      `/api/admin/desk/tasks/generate`,
      { method: "POST", body: "{}" },
    ),

  adminDripCampaigns: () =>
    api<{ campaigns: DripCampaign[] }>(`/api/admin/desk/drip/campaigns`),

  adminDripUpsertCampaign: (body: {
    id?: string;
    name: string;
    trigger_type: DripCampaign["trigger_type"];
    trigger_config?: string | null;
    cadence_hours: string;
    prompt_template: string;
    auto_send: boolean;
    enabled: boolean;
  }) =>
    api<{ campaign: DripCampaign }>(`/api/admin/desk/drip/campaigns`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminDripDeleteCampaign: (id: string) =>
    api<{ ok: boolean }>(`/api/admin/desk/drip/campaigns/${id}`, { method: "DELETE" }),

  adminDripRunCampaign: (id: string) =>
    api<{ result: unknown }>(`/api/admin/desk/drip/campaigns/${id}/run`, { method: "POST", body: "{}" }),

  adminDripQueue: (status: "queued" | "sent" | "failed" | "cancelled" = "queued") =>
    api<{ items: DripHistoryItem[] }>(`/api/admin/desk/drip/queue?status=${status}`),

  adminDripApprove: (id: string) =>
    api<{ item: DripHistoryItem }>(`/api/admin/desk/drip/queue/${id}/approve`, { method: "POST", body: "{}" }),

  adminDripCancel: (id: string) =>
    api<{ ok: boolean }>(`/api/admin/desk/drip/queue/${id}/cancel`, { method: "POST", body: "{}" }),

  /* ---- admin: team & permissions ---- */
  adminTeamPermissionCatalog: () =>
    api<{
      permissions: string[];
      groups: Array<{ label: string; keys: string[] }>;
      presets: Record<string, { label: string; description: string; permissions: string[] }>;
    }>(`/api/admin/team/permissions/catalog`),
  adminTeamStaffList: () => api<{ staff: AdminStaffMember[] }>(`/api/admin/team/staff`),
  adminTeamStaffUpdate: (body: { userId: string; isStaff: boolean; permissions: string[] }) =>
    api<{ ok: true }>(`/api/admin/team/staff`, { method: "POST", body: JSON.stringify(body) }),

  adminPermissionGroups: () =>
    api<{ groups: Array<{ id: string; name: string }> }>(`/api/admin/system/permissions/groups`),

  adminSystemGroups: (q?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }) => {
    const params = new URLSearchParams();
    if (q?.search) params.set("search", q.search);
    if (q?.page) params.set("page", String(q.page));
    if (q?.limit) params.set("limit", String(q.limit));
    if (q?.sortBy) params.set("sortBy", q.sortBy);
    if (q?.sortDir) params.set("sortDir", q.sortDir);
    const qs = params.toString();
    return api<{ rows: DeskGroupRow[]; total: number; page: number; limit: number }>(
      `/api/admin/system/groups${qs ? `?${qs}` : ""}`,
    );
  },

  adminDeskStats: () => api<CrmDeskStats>(`/api/admin/system/desks/stats`),

  adminSystemDesks: (q?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    activeOnly?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (q?.search) params.set("search", q.search);
    if (q?.page) params.set("page", String(q.page));
    if (q?.limit) params.set("limit", String(q.limit));
    if (q?.sortBy) params.set("sortBy", q.sortBy);
    if (q?.sortDir) params.set("sortDir", q.sortDir);
    if (q?.activeOnly) params.set("activeOnly", "1");
    const qs = params.toString();
    return api<CrmDesksResponse>(`/api/admin/system/desks${qs ? `?${qs}` : ""}`);
  },

  adminDesk: (id: number) => api<{ desk: CrmDeskDetail }>(`/api/admin/system/desks/${id}`),

  adminCreateDesk: (body: CrmDeskInput) =>
    api<{ desk: CrmDeskDetail }>(`/api/admin/system/desks`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUpdateDesk: (id: number, body: Partial<CrmDeskInput>) =>
    api<{ desk: CrmDeskDetail }>(`/api/admin/system/desks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminDeleteDesk: (id: number) =>
    api<{ ok: true }>(`/api/admin/system/desks/${id}`, { method: "DELETE" }),

  adminGroupPermissions: (groupId: string, scope: "crm" | "api") =>
    api<{
      groupId: string;
      scope: string;
      permissions: string[];
      catalog: {
        scope: string;
        categories: Array<{ id: string; label: string; navGroup: string; legacyHint?: string }>;
        permissions: Array<{ key: string; label: string; description: string; categoryId: string; staffKey?: string }>;
      };
    }>(`/api/admin/system/permissions/groups/${encodeURIComponent(groupId)}?scope=${scope}`),

  adminGroupPermissionsPatch: (groupId: string, scope: "crm" | "api", permissions: string[]) =>
    api<{ ok: true; permissions: string[] }>(
      `/api/admin/system/permissions/groups/${encodeURIComponent(groupId)}?scope=${scope}`,
      { method: "PATCH", body: JSON.stringify({ permissions }) },
    ),

  adminCreateSubAdmin: (body: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    email: string;
    preset: "desk" | "subadmin" | "platform";
  }) =>
    api<{ member: AdminStaffMember }>(`/api/admin/team/subadmins`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminMemberNotifications: () => api<MemberNotificationsListResponse>(`/api/admin/system/notifications`),

  adminMemberNotificationsPatch: (
    userId: string,
    cells: Array<{ eventKey: string; channel: MemberNotificationChannel; enabled: boolean }>,
  ) =>
    api<{ ok: true; userId: string; matrix: MemberNotificationMatrix }>(
      `/api/admin/system/notifications/${encodeURIComponent(userId)}`,
      { method: "PATCH", body: JSON.stringify({ cells }) },
    ),

  adminMemberNotificationsCopy: (fromUserId: string, toUserId: string) =>
    api<{ ok: true; matrix: MemberNotificationMatrix }>(`/api/admin/system/notifications/copy`, {
      method: "POST",
      body: JSON.stringify({ fromUserId, toUserId }),
    }),

  adminMemberNotificationsApplyDefault: (userId: string) =>
    api<{ ok: true; matrix: MemberNotificationMatrix }>(`/api/admin/system/notifications/apply-default`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  adminDeskCrmCatalog: () => api<{ catalog: string; zones: string[] }>(`/api/admin/desk/crm-catalog`),

  /* ---- concierge (public) ---- */
  conciergeChat: (body: {
    sessionId: string;
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    page?: string;
  }) =>
    api<{
      reply: string;
      ok: boolean;
      degraded?: string;
      visitor: { city: string | null; countryCode: string | null; language: string | null };
    }>(`/api/concierge/chat`, { method: "POST", body: JSON.stringify(body) }),
  conciergeLead: (body: {
    sessionId: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    conversation?: Array<{ role: "user" | "assistant"; content: string }>;
    page?: string;
    source?: string;
  }) =>
    api<{ ok: boolean; leadId?: string; message: string }>(`/api/concierge/lead`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /* ----------------------------- VAULT (E2E) ---------------------------- */
  /**
   * Zero-knowledge ciphertext storage. The server cannot decrypt these
   * blobs without the session key that lives in the broker's browser.
   * See src/lib/cryptoVault.ts for the cryptographic side.
   */
  vaultList: (kind?: VaultRecordKind) =>
    api<{ records: VaultRecordSummary[] }>(
      `/api/admin/vault/records${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`,
    ),

  vaultGet: (id: string) =>
    api<{ record: VaultRecordCiphertext }>(`/api/admin/vault/records/${id}`),

  vaultCreate: (body: {
    kind: VaultRecordKind;
    alg: "AES-GCM-256";
    v: 1;
    ciphertext: string;
    iv: string;
  }) =>
    api<{ record: VaultRecordSummary }>(`/api/admin/vault/records`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  vaultDelete: (id: string) =>
    api<{ ok: boolean }>(`/api/admin/vault/records/${id}`, { method: "DELETE" }),

  vaultSummary: () =>
    api<{ summary: { total: number; bytes: number } }>(`/api/admin/vault/summary`),

  /**
   * AI audit bridge. The browser forwards a SINGLE-USE session JWK
   * scoped to this one request. The server decrypts in RAM, runs the
   * LLM, zeroizes, then re-encrypts the reply with the same key.
   */
  vaultAudit: (body: {
    message: string;
    mode?: "assist" | "sales_call";
    recordIds: string[];
    sessionJwk: JsonWebKey;
  }) =>
    api<{
      ok: boolean;
      degraded?: string;
      model?: string;
      mode: "assist" | "sales_call";
      sealed: { ciphertext: string; iv: string } | null;
      plain?: string;
    }>(`/api/admin/vault/audit`, { method: "POST", body: JSON.stringify(body) }),

  /* ------------------------ TENANT KILL-SWITCH ------------------------ */
  tenantStatus: () =>
    api<{ status: TenantStatus; vendorLicense?: VendorLicenseStatus }>(`/api/admin/system/tenant-status`),

  tenantSetActive: (body: { isActive: boolean; reason?: string }) =>
    api<{ status: TenantStatus }>(`/api/admin/system/tenant-status`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminSecurityViewLogs: (params?: { userId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.userId) q.set("userId", params.userId);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api<SecurityViewLogsResponse>(
      `/api/admin/system/common/security/view-logs${qs ? `?${qs}` : ""}`,
    );
  },

  adminSecurityDashboard: () => api<SecurityDashboard>(`/api/admin/security/dashboard`),

  adminSecurityPerimeter: () => api<PerimeterSnapshot>(`/api/admin/security/perimeter`),

  adminSecurityDns: (domain: string) => {
    const q = new URLSearchParams({ domain });
    return api<DnsLookupResult>(`/api/admin/security/dns?${q}`);
  },

  adminSecuritySsl: (host: string, port?: number) => {
    const q = new URLSearchParams({ host });
    if (port) q.set("port", String(port));
    return api<TlsCheckResult>(`/api/admin/security/ssl?${q}`);
  },

  adminSecurityAuditSnapshot: (limit?: number) => {
    const q = limit ? `?limit=${limit}` : "";
    return api<SecurityAuditSnapshot>(`/api/admin/security/audit-snapshot${q}`);
  },

  adminSecurityExport: () => api<Record<string, unknown>>(`/api/admin/security/export`),

  adminSecurityAutoAuditLatest: () =>
    api<{ run: AutoAuditRun | null; message?: string }>(`/api/admin/security/auto-audits/latest`),

  adminSecurityAutoAudits: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api<AutoAuditsResponse>(`/api/admin/security/auto-audits${qs ? `?${qs}` : ""}`);
  },

  adminSecurityRunAutoAudit: () =>
    api<{ run: AutoAuditRun }>(`/api/admin/security/auto-audits/run`, { method: "POST" }),

  adminSecurityUserBehavior: () => api<UserBehaviorReport>(`/api/admin/security/user-behavior`),

  adminSecurityThreats: () => api<ThreatDashboard>(`/api/admin/security/threats`),

  adminSecurityBehaviorAlerts: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api<SecurityEventsResponse>(`/api/admin/security/behavior-alerts${qs ? `?${qs}` : ""}`);
  },

  adminSecurityVisitorWatch: (unwantedOnly?: boolean) => {
    const q = unwantedOnly ? "?unwanted=1" : "";
    return api<{ rows: IpWatchRow[] }>(`/api/admin/security/visitor-watch${q}`);
  },

  adminSecuritySetIpWatch: (body: { ip: string; unwanted: boolean; label?: string; notes?: string }) =>
    api<IpWatchRow>(`/api/admin/security/visitor-watch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  adminSecurityEndpointEvents: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api<EndpointEventsResponse>(`/api/admin/security/endpoint-events${qs ? `?${qs}` : ""}`);
  },

  adminHistoryLogs: (params?: {
    from?: string;
    to?: string;
    action?: string;
    agent?: string;
    user?: string;
    search?: string;
    comment?: string;
    changedStatus?: string;
    crmId?: string;
    flagged?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.action && params.action !== "all") q.set("action", params.action);
    if (params?.agent) q.set("agent", params.agent);
    if (params?.user) q.set("user", params.user);
    if (params?.search) q.set("search", params.search);
    if (params?.comment) q.set("comment", params.comment);
    if (params?.changedStatus) q.set("changedStatus", params.changedStatus);
    if (params?.crmId) q.set("crmId", params.crmId);
    if (params?.flagged) q.set("flagged", "1");
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortDir) q.set("sortDir", params.sortDir);
    const qs = q.toString();
    return api<HistoryLogsResponse>(`/api/admin/super-admin/history-logs${qs ? `?${qs}` : ""}`);
  },

  adminHistoryLogAnnotate: (id: number, body: { operatorNote?: string | null; flagged?: boolean }) =>
    api<{ row: HistoryLogRow }>(`/api/admin/super-admin/history-logs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminBalanceEvents: (params?: {
    from?: string;
    to?: string;
    type?: string;
    user?: string;
    search?: string;
    flagged?: boolean;
    negativeOnly?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    if (params?.type && params.type !== "all") q.set("type", params.type);
    if (params?.user) q.set("user", params.user);
    if (params?.search) q.set("search", params.search);
    if (params?.flagged) q.set("flagged", "1");
    if (params?.negativeOnly) q.set("negativeOnly", "1");
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortDir) q.set("sortDir", params.sortDir);
    const qs = q.toString();
    return api<BalanceEventsResponse>(`/api/admin/super-admin/balance-events${qs ? `?${qs}` : ""}`);
  },

  adminBalanceEventAnnotate: (id: number, body: { operatorNote?: string | null; flagged?: boolean }) =>
    api<{ row: BalanceEventRow }>(`/api/admin/super-admin/balance-events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminBalanceEventCreate: (body: BalanceEventUpsertBody) =>
    api<{ row: BalanceEventRow }>("/api/admin/super-admin/balance-events", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminBalanceEventUpdate: (id: number, body: BalanceEventUpsertBody) =>
    api<{ row: BalanceEventRow }>(`/api/admin/super-admin/balance-events/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  adminTrackPixels: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortDir) q.set("sortDir", params.sortDir);
    const qs = q.toString();
    return api<TrackPixelsResponse>(`/api/admin/system/tracking/pixels${qs ? `?${qs}` : ""}`);
  },

  adminCountries: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortDir) q.set("sortDir", params.sortDir);
    const qs = q.toString();
    return api<{ rows: PlatformCountryRow[]; total: number; page: number; limit: number }>(
      `/api/admin/system/countries${qs ? `?${qs}` : ""}`,
    );
  },

  adminUpdateCountry: (
    id: number,
    body: Partial<{ name: string; allowVisits: boolean; allowReg: boolean; allowTrading: boolean; phonePrefix: string }>,
  ) =>
    api<{ country: PlatformCountryRow }>(`/api/admin/system/countries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminOAuthClients: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortDir) q.set("sortDir", params.sortDir);
    const qs = q.toString();
    return api<OAuthClientsResponse>(`/api/admin/system/oauth-clients${qs ? `?${qs}` : ""}`);
  },

  adminOAuthClient: (id: number) =>
    api<{ client: OAuthClientRow }>(`/api/admin/system/oauth-clients/${id}`),

  adminCreateOAuthClient: (body: { name: string; campaignIds?: string; disabled?: boolean }) =>
    api<{ client: OAuthClientRow; clientSecret: string }>("/api/admin/system/oauth-clients", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUpdateOAuthClient: (
    id: number,
    body: Partial<{ name: string; campaignIds: string; disabled: boolean }>,
  ) =>
    api<{ client: OAuthClientRow }>(`/api/admin/system/oauth-clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminToggleOAuthClientDisabled: (id: number) =>
    api<{ client: OAuthClientRow }>(`/api/admin/system/oauth-clients/${id}/toggle-disabled`, {
      method: "POST",
      body: "{}",
    }),

  adminAccountTypes: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    activeOnly?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortDir) q.set("sortDir", params.sortDir);
    if (params?.activeOnly) q.set("activeOnly", "1");
    const qs = q.toString();
    return api<AccountTypesResponse>(`/api/admin/system/account-types${qs ? `?${qs}` : ""}`);
  },

  adminAccountType: (id: number) =>
    api<{ accountType: AccountTypeRow }>(`/api/admin/system/account-types/${id}`),

  adminCreateAccountType: (body: AccountTypeInput) =>
    api<{ accountType: AccountTypeRow }>("/api/admin/system/account-types", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUpdateAccountType: (id: number, body: Partial<AccountTypeInput>) =>
    api<{ accountType: AccountTypeRow }>(`/api/admin/system/account-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminToggleAccountTypeActive: (id: number) =>
    api<{ accountType: AccountTypeRow }>(`/api/admin/system/account-types/${id}/toggle-active`, {
      method: "POST",
      body: "{}",
    }),

  adminClientStatuses: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: "asc" | "desc";
    activeOnly?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.sortBy) qs.set("sortBy", params.sortBy);
    if (params?.sortDir) qs.set("sortDir", params.sortDir);
    if (params?.activeOnly) qs.set("activeOnly", "1");
    const q = qs.toString();
    return api<ClientStatusesResponse>(`/api/admin/system/statuses${q ? `?${q}` : ""}`);
  },

  adminClientStatusAnalytics: () =>
    api<ClientStatusAnalyticsResponse>("/api/admin/system/statuses/analytics"),

  adminClientStatus: (id: number) =>
    api<{ status: ClientStatusRow }>(`/api/admin/system/statuses/${id}`),

  adminCreateClientStatus: (body: ClientStatusInput) =>
    api<{ status: ClientStatusRow }>("/api/admin/system/statuses", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUpdateClientStatus: (id: number, body: Partial<ClientStatusInput>) =>
    api<{ status: ClientStatusRow }>(`/api/admin/system/statuses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminToggleClientStatusActive: (id: number) =>
    api<{ status: ClientStatusRow }>(`/api/admin/system/statuses/${id}/toggle-active`, {
      method: "POST",
      body: "{}",
    }),

  adminAutoAssignRules: () => api<AutoAssignRulesResponse>("/api/admin/system/auto-assign"),

  adminAutoAssignOptions: () => api<AutoAssignOptionsResponse>("/api/admin/system/auto-assign/options"),

  adminAutoAssignRule: (id: number) =>
    api<{ rule: AutoAssignRuleRow }>(`/api/admin/system/auto-assign/${id}`),

  adminCreateAutoAssignRule: (body: AutoAssignRuleInput) =>
    api<{ rule: AutoAssignRuleRow }>("/api/admin/system/auto-assign", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUpdateAutoAssignRule: (id: number, body: Partial<AutoAssignRuleInput>) =>
    api<{ rule: AutoAssignRuleRow }>(`/api/admin/system/auto-assign/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminReorderAutoAssignRules: (orderedIds: number[]) =>
    api<AutoAssignRulesResponse>("/api/admin/system/auto-assign/reorder", {
      method: "PATCH",
      body: JSON.stringify({ orderedIds }),
    }),

  adminDeleteAutoAssignRule: (id: number) =>
    api<{ ok: boolean }>(`/api/admin/system/auto-assign/${id}`, { method: "DELETE" }),

  adminPromoCodes: () => api<PromoCodesResponse>("/api/admin/system/promo-codes"),

  adminPromoCodeOptions: () => api<PromoCodeOptionsResponse>("/api/admin/system/promo-codes/options"),

  adminPromoCode: (id: number) => api<{ promoCode: PromoCodeRow }>(`/api/admin/system/promo-codes/${id}`),

  adminCreatePromoCode: (body: PromoCodeInput) =>
    api<{ promoCode: PromoCodeRow }>("/api/admin/system/promo-codes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminDeletePromoCode: (id: number) =>
    api<{ ok: boolean }>(`/api/admin/system/promo-codes/${id}`, { method: "DELETE" }),

  adminDepositLimits: (params?: {
    search?: string;
    currency?: string;
    limitType?: DepositLimitType;
    ftdOnly?: boolean;
    pspProcessorId?: string;
    activeOnly?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.currency) q.set("currency", params.currency);
    if (params?.limitType) q.set("limitType", params.limitType);
    if (params?.ftdOnly === true) q.set("ftdOnly", "1");
    if (params?.ftdOnly === false) q.set("ftdOnly", "0");
    if (params?.pspProcessorId) q.set("pspProcessorId", params.pspProcessorId);
    if (params?.activeOnly === true) q.set("activeOnly", "1");
    if (params?.activeOnly === false) q.set("activeOnly", "0");
    const qs = q.toString();
    return api<DepositLimitsResponse>(`/api/admin/system/deposit-limits${qs ? `?${qs}` : ""}`);
  },

  adminDepositLimitOptions: () =>
    api<DepositLimitOptionsResponse>("/api/admin/system/deposit-limits/options"),

  adminDepositLimit: (id: number) =>
    api<{ row: DepositLimitRow; explanation: string }>(`/api/admin/system/deposit-limits/${id}`),

  adminCreateDepositLimit: (body: DepositLimitInput) =>
    api<{ row: DepositLimitRow; explanation: string }>("/api/admin/system/deposit-limits", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUpdateDepositLimit: (id: number, body: Partial<DepositLimitInput>) =>
    api<{ row: DepositLimitRow; explanation: string }>(`/api/admin/system/deposit-limits/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  adminDeleteDepositLimit: (id: number) =>
    api<{ ok: boolean }>(`/api/admin/system/deposit-limits/${id}`, { method: "DELETE" }),

  adminCommonSettings: () => api<{ settings: Record<string, string> }>("/api/admin/system/common-settings"),

  adminUpdateCommonSettings: (body: Record<string, string>) =>
    api<{ settings: Record<string, string> }>("/api/admin/system/common-settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  adminPreferences: () => api<{ settings: Record<string, string> }>("/api/admin/system/preferences"),

  adminUpdatePreferences: (body: Record<string, string>) =>
    api<{ settings: Record<string, string> }>("/api/admin/system/preferences", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  adminMetaTraderBridge: () =>
    api<{ settings: Record<string, string> }>("/api/admin/integrations/metatrader"),

  adminUpdateMetaTraderBridge: (body: Record<string, string>) =>
    api<{ settings: Record<string, string> }>("/api/admin/integrations/metatrader", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  adminPaymentGateways: () =>
    api<{ gateways: PaymentGatewayConfig[] }>("/api/admin/system/payment-gateways"),

  adminCreatePaymentGateway: (body: {
    name: string;
    credentials: Record<string, string>;
    cardNumbers: string;
    is3d: boolean;
    description: string;
  }) =>
    api<{ gateway: PaymentGatewayConfig }>("/api/admin/system/payment-gateways", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminUpdatePaymentGateway: (
    id: string,
    body: {
      name?: string;
      credentials?: Record<string, string>;
      cardNumbers?: string;
      is3d?: boolean;
      description?: string;
    },
  ) =>
    api<{ gateway: PaymentGatewayConfig }>(`/api/admin/system/payment-gateways/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  adminDeletePaymentGateway: (id: string) =>
    api<{ ok: boolean }>(`/api/admin/system/payment-gateways/${id}`, { method: "DELETE" }),

  adminAddPaymentGatewayFile: (gatewayId: string, fileName: string) =>
    api<{ file: PaymentGatewayFile }>(`/api/admin/system/payment-gateways/${gatewayId}/files`, {
      method: "POST",
      body: JSON.stringify({ fileName }),
    }),

  adminDeletePaymentGatewayFile: (gatewayId: string, fileId: string) =>
    api<{ ok: boolean }>(`/api/admin/system/payment-gateways/${gatewayId}/files/${fileId}`, {
      method: "DELETE",
    }),

  adminPaymentProcessors: () =>
    api<{ processors: PaymentProcessor[] }>("/api/admin/system/payment-processors"),

  adminSavePaymentProcessors: (body: {
    processors: Array<{
      id?: string;
      gatewayName: string;
      enabled: boolean;
      includeCountries: string;
      excludeCountries: string;
      tabPriority: number;
      processorPriority: number;
    }>;
  }) =>
    api<{ processors: PaymentProcessor[] }>("/api/admin/system/payment-processors", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

/* ----------------------------- VAULT types ----------------------------- */

export type VaultRecordKind =
  | "kyc_document"
  | "call_transcript"
  | "client_note"
  | "id_number"
  | "source_of_funds"
  | "wire_detail"
  | "free_text";

export type VaultRecordSummary = {
  id: string;
  kind: VaultRecordKind;
  size_bytes: number;
  created_at: string;
  updated_at: string;
};

export type VaultRecordCiphertext = VaultRecordSummary & {
  alg: "AES-GCM-256";
  v: 1;
  ciphertext: string;
  iv: string;
};

export type PaymentProcessor = {
  id: string;
  gateway_name: string;
  enabled: boolean;
  include_countries: string;
  exclude_countries: string;
  tab_priority: number;
  processor_priority: number;
  updated_at: string;
};

export type PaymentGatewayFile = {
  id: string;
  gateway_id: string;
  file_name: string;
  uploaded_at: string;
};

export type PaymentGatewayConfig = {
  id: string;
  name: string;
  credentials: Record<string, string>;
  card_numbers: string;
  is_3d: boolean;
  description: string;
  created_at: string;
  updated_at: string;
  files: PaymentGatewayFile[];
};

export type TenantStatus = {
  tenant_id: string;
  is_active: boolean;
  reason: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type VendorLicenseStatus = {
  configured: boolean;
  mode: "off" | "ok" | "grace" | "revoked" | "offline";
  reason: string | null;
  lastOkAt: string | null;
  lastCheckAt: string | null;
  tenantActive: boolean;
  heartbeatUrl: string | null;
  tenantId: string | null;
  buildVersion: string;
  graceHours: number;
};

/* ----------------------------- DESK types ----------------------------- */

export type DeskAuditCategoryKey =
  | "bad_leads"
  | "fake_or_dead_investors"
  | "uncalled"
  | "unanswered"
  | "document_gaps"
  | "pipeline_stalled"
  | "agent_silence"
  | "duplicates";

export type DeskLeadFlag =
  | "bad_email"
  | "bad_phone"
  | "no_phone"
  | "no_email"
  | "duplicate_email"
  | "duplicate_phone"
  | "disposable_email"
  | "gibberish_name"
  | "dead_investor"
  | "deposited_no_docs"
  | "never_logged_in"
  | "no_contact_since_signup"
  | "no_recent_contact"
  | "no_agent_assigned"
  | "high_value_no_followup"
  | "uncalled"
  | "unanswered_emails";

export type DeskAuditFinding = {
  userId: string;
  displayId: number;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  agentName: string;
  crmStatus: string;
  totalDeposits: number;
  signupDays: number;
  lastContactDays: number | null;
  online: boolean;
  flags: DeskLeadFlag[];
  severity: number;
};

export type DeskAuditCategory = {
  key: DeskAuditCategoryKey;
  label: string;
  description: string;
  count: number;
  findings: DeskAuditFinding[];
};

export type DeskAuditReport = {
  generatedAt: string;
  totals: {
    users: number;
    online: number;
    depositors: number;
    silentAgents: number;
    flaggedLeads: number;
  };
  agentLoad: Array<{ agent: string; count: number }>;
  categories: DeskAuditCategory[];
};

export type DeskMover = {
  category: string;
  displaySymbol: string;
  name: string;
  changePct: number;
  mid: number;
  headline?: string;
};

export type DeskMarketBrief = {
  generatedAt: string;
  fx: DeskMover[];
  stocks: DeskMover[];
  crypto: DeskMover[];
  commodities: DeskMover[];
  indices: DeskMover[];
};

export type DeskLlmReply = {
  reply: string;
  ok: boolean;
  model?: string;
  degraded?: string;
};

export function fmtUsd(n: number) {
  return fmtMoney("USD", n);
}

export function fmtMoney(currency: string, n: number) {
  const code = ACCOUNT_CURRENCIES.includes(currency as AccountCurrency) ? currency : "USD";
  const locale = code === "EUR" ? "de-DE" : code === "GBP" ? "en-GB" : "en-US";
  return n.toLocaleString(locale, { style: "currency", currency: code });
}

export function fmtPrice(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return fmtUsd(n);
  if (Math.abs(n) >= 1) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });
}

export function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/* ---------------------- Concierge / Leads / PSP / Tasks ---------------------- */

export type ChatLead = {
  id: string;
  session_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  country_code: string | null;
  city: string | null;
  timezone: string | null;
  language: string | null;
  source: string | null;
  page: string | null;
  status: "new" | "assigned" | "dismissed" | "converted";
  assigned_agent: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  conversation: string | null;
  created_at: string;
  updated_at: string;
};

export type DeskPspMethodHealth = {
  method: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  successRate: number;
  avgSettleHours: number | null;
  slowestSettleHours: number | null;
  pendingOlderThan24h: number;
  pendingOlderThan72h: number;
  last7dVolume: number;
  last30dVolume: number;
  recentStalled: number;
  health: "ok" | "watch" | "bad";
  reasons: string[];
};

export type DeskPspStuckDeposit = {
  id: string;
  userId: string;
  username: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  ageHours: number;
};

export type DeskPspHealthReport = {
  generatedAt: string;
  totals: {
    methods: number;
    pendingTotal: number;
    pendingAmount: number;
    last7dVolume: number;
    last30dVolume: number;
    overallSuccessRate: number;
  };
  methods: DeskPspMethodHealth[];
  stuckDeposits: DeskPspStuckDeposit[];
};

export type DeskTask = {
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

export type DeskGroupRow = {
  id: string;
  name: string;
  allowed_ips: string;
  updated_at: string;
};

export type CrmDeskListRow = {
  id: number;
  name: string;
  slug: string;
  region_code: string;
  timezone: string;
  language: string;
  active: number;
  created_at: string;
  updated_at: string;
  agent_count: number;
  client_count: number;
};

export type CrmDeskAgent = {
  userId: string;
  displayId: number;
  name: string;
  username: string;
  email: string;
  online: boolean;
};

export type CrmDeskDetail = CrmDeskListRow & {
  agents: CrmDeskAgent[];
};

export type CrmDeskStats = {
  totalDesks: number;
  activeDesks: number;
  agentsOnline: number;
  clientsAssigned: number;
};

export type CrmDesksResponse = {
  rows: CrmDeskListRow[];
  total: number;
  page: number;
  limit: number;
};

export type CrmDeskInput = {
  name: string;
  slug?: string;
  regionCode?: string;
  timezone?: string;
  language?: string;
  active?: boolean;
  agentIds?: string[];
};

export type AdminStaffMember = {
  userId: string;
  displayId: number;
  username: string;
  name: string;
  email: string;
  isStaff: boolean;
  permissions: string[];
};

export type MemberNotificationChannel = "email" | "push" | "in_app";

export type MemberNotificationMatrix = Record<
  string,
  Record<MemberNotificationChannel, boolean>
>;

export type MemberNotificationStaffRow = {
  userId: string;
  displayId: number;
  username: string;
  name: string;
  email: string;
  matrix: MemberNotificationMatrix;
  hasCustomPrefs: boolean;
};

export type MemberNotificationsListResponse = {
  catalog: {
    events: Array<{ key: string; label: string; description: string; defaults: Record<MemberNotificationChannel, boolean> }>;
    channels: MemberNotificationChannel[];
  };
  deskDefault: MemberNotificationMatrix;
  staff: MemberNotificationStaffRow[];
};

export type SecurityViewLogRow = {
  id: number;
  agentId: string;
  counter: number;
  action: string;
  ip: string | null;
  dateCreated: string;
};

export type PerimeterSnapshot = {
  clientIp: string;
  forwardedFor: string | null;
  realIp: string | null;
  userAgent: string | null;
  vpsPublicIp: string | null;
  adminAllowlist: string[];
  staffAllowlist: string[];
  staffIpLock: boolean;
  adminAccess: { allowed: boolean; reason?: string };
  staffAccess: { allowed: boolean; reason?: string };
  envOverrides: { adminIpAllowlist: boolean; staffIpAllowlist: boolean };
};

export type DnsLookupResult =
  | { ok: true; domain: string; records: Record<string, string[]>; hints: string[]; queriedAt: string }
  | { ok: false; error: string };

export type TlsCheckResult =
  | {
      ok: true;
      host: string;
      valid: boolean;
      issuer: string | null;
      subject: string | null;
      validFrom: string | null;
      validTo: string | null;
      daysRemaining: number | null;
      altNames: string[];
      protocol: string | null;
    }
  | { ok: false; error: string };

export type SecurityDashboard = {
  generatedAt: string;
  health: { ok: boolean; service: string };
  ready: { ok: boolean; ollama: boolean; ollamaError?: string };
  vendorLicense: VendorLicenseStatus;
  tenant: TenantStatus;
  publicSiteOffline: boolean;
  maintenanceMessage: string | null;
  rateLimits: { apiPerMinute: number; loginPer15Min: number; note: string };
  domains: {
    adminUrl: string | null;
    publicSiteUrl: string | null;
    adminHost: string | null;
    publicHost: string | null;
  };
  session: { staffIpLock: boolean; sessionTimeoutHours: string; loginAttemptLimit: string };
};

export type SecurityAuditSnapshot = {
  rows: SecurityViewLogRow[];
  total: number;
  generatedAt: string;
};

export type ThreatSeverity = "critical" | "high" | "medium" | "low";

export type SecurityEventRow = {
  id: number;
  category: "threat" | "behavior" | "visitor";
  severity: ThreatSeverity;
  ruleId: string;
  actor: string | null;
  action: string;
  reason: string;
  ip: string | null;
  userAgent: string | null;
  metaJson: string | null;
  fingerprintBrowser: string | null;
  fingerprintOs: string | null;
  createdAt: string;
  dedupeKey: string;
};

export type ThreatDashboard = {
  generatedAt: string;
  safetyScore: number;
  scoreBreakdown: Array<{ label: string; points: number; max: number; note: string }>;
  activeThreats: SecurityEventRow[];
  threatCounts: Record<ThreatSeverity, number>;
  offHours: { enabled: boolean; startHour: number; endHour: number };
  endpointAgentRequired: boolean;
};

export type SecurityEventsResponse = { rows: SecurityEventRow[]; total: number };

export type IpWatchRow = {
  ip: string;
  unwanted: boolean;
  label: string | null;
  notes: string | null;
  visitCount: number;
  firstSeen: string;
  lastSeen: string;
  userAgentSample: string | null;
  browserClass: string | null;
  osClass: string | null;
  lastActor: string | null;
};

export type EndpointEventRow = {
  id: number;
  agentId: string;
  eventType: string;
  deviceLabel: string | null;
  workstationId: string | null;
  metaJson: string | null;
  createdAt: string;
};

export type EndpointEventsResponse = { rows: EndpointEventRow[]; total: number };

export type AutoAuditFinding = {
  id: string;
  category: "website" | "crm" | "staff" | "client" | "perimeter";
  severity: ThreatSeverity;
  title: string;
  detail: string;
  target?: string | null;
};

export type WebsiteProbe = {
  label: string;
  url: string;
  ok: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
};

export type UserBehaviorInsight = {
  userId: string;
  role: "staff" | "client";
  riskScore: number;
  flags: string[];
  summary: string;
  actionCount24h: number;
  distinctIps24h: number;
  lastSeen: string | null;
  meta?: Record<string, unknown>;
};

export type AutoAuditRun = {
  id: number;
  startedAt: string;
  finishedAt: string;
  status: "ok" | "warn" | "fail";
  overallScore: number;
  summary: string;
  websiteChecks: WebsiteProbe[];
  findings: AutoAuditFinding[];
  staffBehavior: UserBehaviorInsight[];
  clientBehavior: UserBehaviorInsight[];
  forensicsTotals: { scanned: number; highRiskCount: number; kycCriticalCount: number; badActorCount: number } | null;
  nextRunAt: string | null;
  intervalHours: number;
};

export type AutoAuditsResponse = { rows: AutoAuditRun[]; total: number };

export type UserBehaviorReport = {
  generatedAt: string;
  staff: UserBehaviorInsight[];
  clients: UserBehaviorInsight[];
};

export type SecurityViewLogsResponse = {
  rows: SecurityViewLogRow[];
  total: number;
  page: number;
  limit: number;
};

export type HistoryLogRow = {
  id: number;
  action_type: string;
  executed_by: string | null;
  route_name: string | null;
  actioned_on: string | null;
  actioned_on_id: string | null;
  current_owner: string | null;
  prev_owner: string | null;
  prev_status: string | null;
  new_status: string | null;
  detail: string | null;
  meta_json: string | null;
  operator_note: string | null;
  amount: number | null;
  currency: string | null;
  prev_value: string | null;
  new_value: string | null;
  comments: string | null;
  changed_status: string | null;
  crm_id: string | null;
  flagged: number;
  created_at: string;
};

export type HistoryLogsResponse = {
  rows: HistoryLogRow[];
  total: number;
  page: number;
  limit: number;
  actionTypes: string[];
  stats: { total: number; flagged: number; logins: number; statusChanges: number; uniqueAgents: number };
};

export type BalanceEventRow = {
  id: number;
  event_type: string;
  user_id: string;
  user_email: string | null;
  user_label: string | null;
  prev_cash: number;
  new_cash: number;
  prev_bonus: number;
  new_bonus: number;
  ledger_ref: string | null;
  ref_note: string | null;
  operator_note: string | null;
  flagged: number;
  actor_id: string | null;
  created_at: string;
};

export type BalanceEventUpsertBody = {
  eventType: string;
  userId: string;
  prevCash: number;
  newCash: number;
  prevBonus?: number;
  newBonus?: number;
  ledgerRef?: string | null;
  refNote?: string | null;
  operatorNote?: string | null;
  createdAt?: string;
};

export type BalanceEventsResponse = {
  rows: BalanceEventRow[];
  total: number;
  page: number;
  limit: number;
  eventTypes: string[];
  stats: { total: number; flagged: number; deposits: number; trades: number; netCashDelta: number };
};

export type TrackPixelRow = {
  id: number;
  url: string | null;
  post_fields: string | null;
  created_at: string;
  type: string | null;
  pixel_type: string | null;
  pixel_function: string | null;
  response: string | null;
  response_status: string | null;
  deposit_id: string | null;
  transaction_id: string | null;
  user_id: string | null;
  tracking_type: string | null;
};

export type TrackPixelsResponse = {
  rows: TrackPixelRow[];
  total: number;
  page: number;
  limit: number;
};

export type PlatformCountryRow = {
  id: number;
  iso: string;
  name: string;
  allow_visits: number;
  allow_reg: number;
  allow_trading: number;
  phone_prefix: string;
  updated_at: string;
};

export type OAuthClientRow = {
  id: number;
  name: string;
  public_id: string;
  campaign_ids: string;
  disabled: number;
  secret_hash: string | null;
  created_at: string;
  meta_json: string | null;
};

export type OAuthClientsResponse = {
  rows: OAuthClientRow[];
  total: number;
  page: number;
  limit: number;
};

export type AutoAssignRuleType =
  | "promo_code"
  | "campaign"
  | "country"
  | "language"
  | "all_leads";

export type AutoAssignRuleRow = {
  id: number;
  ruleType: AutoAssignRuleType;
  targetKey: string;
  agentId: string;
  agentLabel: string;
  active: boolean;
  precedence: number;
  createdAt: string;
  autoAssignedFor: string;
};

export type AutoAssignRulesResponse = { rows: AutoAssignRuleRow[] };

export type AutoAssignRuleInput = {
  ruleType: AutoAssignRuleType;
  targetKey: string;
  agentId: string;
  agentLabel: string;
  active?: boolean;
  precedence?: number;
};

export type AutoAssignOptionsResponse = {
  campaigns: Array<{ id: string; name: string }>;
  promoCodes: Array<{ code: string; label: string }>;
  staff: AdminStaffMember[];
  desks?: Array<{ id: number; name: string; slug: string; language: string; regionCode: string }>;
  ruleTypes: AutoAssignRuleType[];
};

export type AccountTypeRow = {
  id: number;
  name: string;
  slug: string;
  active: number;
  leverage_default: number;
  min_deposit: number;
  max_deposit: number;
  spread_markup_bps: number;
  bonus_eligible: number;
  vip_tier: number;
  description: string;
  settings_json: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountTypeInput = {
  name: string;
  slug?: string;
  active?: boolean;
  leverageDefault?: number;
  minDeposit?: number;
  maxDeposit?: number;
  spreadMarkupBps?: number;
  bonusEligible?: boolean;
  vipTier?: number;
  description?: string;
  settings?: Record<string, unknown>;
};

export type AccountTypesResponse = {
  rows: AccountTypeRow[];
  total: number;
  page: number;
  limit: number;
};

export type ClientStatusRow = {
  id: number;
  name: string;
  slug: string;
  color_hex: string;
  sort_order: number;
  is_system: number;
  active: number;
  created_at: string;
  updated_at: string;
  client_count?: number;
};

export type ClientStatusInput = {
  name: string;
  slug?: string;
  colorHex?: string;
  sortOrder?: number;
  active?: boolean;
};

export type ClientStatusesResponse = {
  rows: ClientStatusRow[];
  total: number;
  page: number;
  limit: number;
};

export type ClientStatusAnalyticsResponse = {
  rows: Array<{
    id: number;
    name: string;
    slug: string;
    color_hex: string;
    active: number;
    client_count: number;
  }>;
  totalClients: number;
  unassigned: number;
};

export type PromoPurpose = "investor" | "affiliate" | "bonus" | "demo" | "custom";

export type PromoCodeRow = {
  id: number;
  code: string;
  purpose: PromoPurpose;
  label: string;
  bonus_amount: number | null;
  bonus_percent: number | null;
  assign_group_id: string | null;
  assign_account_type_id: number | null;
  max_uses: number | null;
  use_count: number;
  active: number;
  expires_at: string | null;
  created_at: string;
  used_in_auto_assign: boolean;
  assign_group_name: string | null;
  assign_account_type_name: string | null;
};

export type PromoCodeInput = {
  code: string;
  purpose?: PromoPurpose;
  label?: string;
  bonusAmount?: number | null;
  bonusPercent?: number | null;
  assignGroupId?: string | null;
  assignAccountTypeId?: number | null;
  maxUses?: number | null;
  active?: boolean;
  expiresAt?: string | null;
};

export type PromoCodesResponse = {
  rows: PromoCodeRow[];
};

export type PromoCodeOptionsResponse = {
  deskGroups: Array<{ id: string; name: string }>;
  accountTypes: Array<{ id: number; name: string }>;
  purposes: PromoPurpose[];
};

export type DepositLimitType = "min" | "max";

export type DepositLimitRow = {
  id: number;
  limit_type: DepositLimitType;
  ftd_only: number;
  currency: string;
  amount: number;
  visual_amount: string;
  psp_processor_id: string | null;
  country_codes: string | null;
  campaign_id: string | null;
  active: number;
  created_at: string;
  updated_at: string;
  psp_processor_name: string | null;
  country_codes_list: string[];
};

export type DepositLimitInput = {
  limitType: DepositLimitType;
  ftdOnly?: boolean;
  currency: string;
  amount: number;
  visualAmount?: string;
  pspProcessorId?: string | null;
  countryCodes?: string[] | null;
  campaignId?: string | null;
  active?: boolean;
};

export type DepositLimitsResponse = {
  rows: DepositLimitRow[];
};

export type DepositLimitOptionsResponse = {
  processors: Array<{ id: string; gatewayName: string }>;
  currencies: string[];
  campaigns: Array<{ id: string; name: string }>;
  countries: Array<{ iso: string; name: string }>;
};
