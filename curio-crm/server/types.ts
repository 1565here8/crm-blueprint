export type UserRole = "admin" | "user";
export type AssetClass = "us_equity" | "crypto";
export type PositionSide = "long" | "short";
export type PositionStatus = "open" | "closed";

export type User = {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  credits: number;
  created_at: string;
};

export type LedgerEntry = {
  id: string;
  user_id: string;
  amount_delta: number;
  reason: string;
  actor_id: string | null;
  created_at: string;
};

export type Position = {
  id: string;
  trade_number: number;
  user_id: string;
  symbol: string;
  asset_class: AssetClass;
  qty: number;
  side: PositionSide;
  entry_price: number;
  status: PositionStatus;
  opened_at: string;
  closed_at: string | null;
  exit_price: number | null;
  pnl: number | null;
  opened_by: string | null;
  stop_loss?: number | null;
  take_profit?: number | null;
};

export type PendingOrder = {
  id: string;
  trade_number: number;
  user_id: string;
  symbol: string;
  asset_class: AssetClass;
  qty: number;
  side: OrderSide;
  order_type: OrderType;
  limit_price: number | null;
  position_id: string | null;
  status: "pending" | "cancelled" | "filled";
  created_at: string;
};

export type Quote = {
  symbol: string;
  assetClass: AssetClass;
  bid: number;
  ask: number;
  mid: number;
  source: "binance" | "yahoo" | "alpaca" | "demo";
  timestamp: string;
};

export type SessionUser = {
  id: string;
  username: string;
  role: UserRole;
  /** When set, an admin is viewing the app as this client user. */
  impersonatorId?: string;
};

export type OrderType = "MARKET" | "LIMIT";
export type OrderSide = "BUY" | "SELL";

export type Execution = {
  id: string;
  user_id: string;
  position_id: string | null;
  symbol: string;
  asset_class: AssetClass;
  side: OrderSide;
  order_type: OrderType;
  qty: number;
  fill_price: number;
  notional: number;
  created_at: string;
  actor_id: string | null;
};

export type PositionMark = Position & {
  mark: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
};

export type AccountSummary = {
  cashBalance: number;
  buyingPower: number;
  portfolioValue: number;
  equity: number;
  unrealizedPnl: number;
  credits: number;
  openPositions: PositionMark[];
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
