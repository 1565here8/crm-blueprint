CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    domain_name VARCHAR(255) UNIQUE NOT NULL,
    brand_colors JSONB DEFAULT '{"primary": "#0c1017", "secondary": "#14b8a6"}',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    hashed_email VARCHAR(64) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    phone VARCHAR(64),
    country_code VARCHAR(10) NOT NULL,
    kyc_status VARCHAR(50) DEFAULT 'pending',
    external_user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_email UNIQUE (tenant_id, hashed_email)
);

CREATE TABLE IF NOT EXISTS trading_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    account_group VARCHAR(100) NOT NULL DEFAULT 'Live_USD_1:500',
    balance NUMERIC(20, 4) DEFAULT 0.0000,
    equity NUMERIC(20, 4) DEFAULT 0.0000,
    leverage INT NOT NULL DEFAULT 500,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'active',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_platform_account UNIQUE (platform, account_number)
);

CREATE TABLE IF NOT EXISTS transaction_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    trading_account_id UUID REFERENCES trading_accounts(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount NUMERIC(20, 4) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    gateway_used VARCHAR(100) DEFAULT 'system_onboard',
    status VARCHAR(50) DEFAULT 'completed',
    prev_block_hash TEXT,
    crypto_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_lookup ON users (tenant_id, hashed_email);
CREATE INDEX IF NOT EXISTS idx_accounts_lookup ON trading_accounts (account_number, platform);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON transaction_ledger (tenant_id, status);

INSERT INTO tenants (company_name, domain_name, brand_colors)
VALUES ('EtoroPros', 'etoropros.com', '{"primary": "#0c1017", "secondary": "#14b8a6"}')
ON CONFLICT (domain_name) DO NOTHING;
