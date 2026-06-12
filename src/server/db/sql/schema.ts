export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  token_balance INTEGER NOT NULL,
  tokens_updated_at TEXT NOT NULL,
  created_from_ip TEXT
);

CREATE TABLE IF NOT EXISTS text_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  finished_at TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS admin_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tokens_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ip_bootstrap (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti TEXT PRIMARY KEY,
  revoked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_mode_status ON jobs(mode, status);
CREATE INDEX IF NOT EXISTS idx_jobs_finished_at ON jobs(finished_at);
CREATE INDEX IF NOT EXISTS idx_text_history_user_created ON text_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_revoked_at ON revoked_tokens(revoked_at);
`;
