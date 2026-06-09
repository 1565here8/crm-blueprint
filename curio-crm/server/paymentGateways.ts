import { randomUUID } from "crypto";
import { getDb } from "./db";

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

type Row = {
  id: string;
  name: string;
  credentials_json: string;
  card_numbers: string;
  is_3d: number;
  description: string;
  created_at: string;
  updated_at: string;
};

function rowToConfig(row: Row, files: PaymentGatewayFile[]): PaymentGatewayConfig {
  let credentials: Record<string, string> = {};
  try {
    credentials = JSON.parse(row.credentials_json) as Record<string, string>;
  } catch {
    credentials = {};
  }
  return {
    id: row.id,
    name: row.name,
    credentials,
    card_numbers: row.card_numbers,
    is_3d: row.is_3d === 1,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
    files,
  };
}

function listFiles(gatewayId: string): PaymentGatewayFile[] {
  return getDb()
    .prepare("SELECT * FROM payment_gateway_files WHERE gateway_id = ? ORDER BY uploaded_at DESC")
    .all(gatewayId) as PaymentGatewayFile[];
}

export function initPaymentGatewayTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_gateway_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      credentials_json TEXT NOT NULL DEFAULT '{}',
      card_numbers TEXT NOT NULL DEFAULT '',
      is_3d INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payment_gateway_files (
      id TEXT PRIMARY KEY,
      gateway_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (gateway_id) REFERENCES payment_gateway_configs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_pg_files_gateway ON payment_gateway_files(gateway_id);

    CREATE TABLE IF NOT EXISTS payment_processors (
      id TEXT PRIMARY KEY,
      gateway_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      include_countries TEXT NOT NULL DEFAULT '*',
      exclude_countries TEXT NOT NULL DEFAULT '',
      tab_priority INTEGER NOT NULL DEFAULT 0,
      processor_priority INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payment_processors_priority ON payment_processors(tab_priority, processor_priority);
  `);
  seedPaymentGateways();
  seedPaymentProcessors();
}

function seedPaymentGateways(): void {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS n FROM payment_gateway_configs").get() as { n: number }).n;
  if (count > 0) return;

  const now = new Date().toISOString();
  const seeds: Array<Omit<PaymentGatewayConfig, "id" | "created_at" | "updated_at" | "files">> = [
    {
      name: "directPay",
      credentials: {
        directPay_merchantId: "21544",
        directPay_currency: "ALL",
        directPay_masterCardNum: "21544002",
        directPay_masterCardSign: "r0lX8X80",
        directPay_visaCardNum: "21544001",
        directPay_visaCardSign: "FzhDpzh0",
      },
      card_numbers: "598273647586984",
      is_3d: false,
      description: "",
    },
    {
      name: "payretailers",
      credentials: {
        payretailers_merchantId: "5145",
        payretailers_secretKey:
          "014ec611841c34165f5ced208d98b902a036856fdec0a9740da43fbb1de5531",
      },
      card_numbers:
        "no3D:4200000000000000, 4005550000000019\n3D:4012001037461114, 4012001037141112, 4012001038443335",
      is_3d: false,
      description:
        "For making new credentials go to backoffice.payretailers.com/merchants/sign_in. API Docs: docs.payretailers.com",
    },
    {
      name: "bitcoBrokers",
      credentials: {
        bitcoBrokers_url: "https://yourdomain/en/api/register",
      },
      card_numbers: "fibonatix: 4111111111111111, 05/20 test test 123",
      is_3d: false,
      description: "",
    },
  ];

  const insert = db.prepare(
    `INSERT INTO payment_gateway_configs (id, name, credentials_json, card_numbers, is_3d, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertFile = db.prepare(
    "INSERT INTO payment_gateway_files (id, gateway_id, file_name, uploaded_at) VALUES (?, ?, ?, ?)",
  );

  for (const s of seeds) {
    const id = randomUUID();
    insert.run(
      id,
      s.name,
      JSON.stringify(s.credentials),
      s.card_numbers,
      s.is_3d ? 1 : 0,
      s.description,
      now,
      now,
    );
    if (s.name === "directPay") {
      insertFile.run(randomUUID(), id, "test3.png", "2022-04-26T10:41:38.000Z");
    }
  }
}

export function listPaymentGatewayConfigs(): PaymentGatewayConfig[] {
  const rows = getDb()
    .prepare("SELECT * FROM payment_gateway_configs ORDER BY name ASC")
    .all() as Row[];
  return rows.map((r) => rowToConfig(r, listFiles(r.id)));
}

export function getPaymentGatewayConfig(id: string): PaymentGatewayConfig | null {
  const row = getDb().prepare("SELECT * FROM payment_gateway_configs WHERE id = ?").get(id) as Row | undefined;
  if (!row) return null;
  return rowToConfig(row, listFiles(row.id));
}

export function createPaymentGatewayConfig(args: {
  name: string;
  credentials: Record<string, string>;
  cardNumbers: string;
  is3d: boolean;
  description: string;
}): PaymentGatewayConfig {
  const now = new Date().toISOString();
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO payment_gateway_configs (id, name, credentials_json, card_numbers, is_3d, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      args.name.trim(),
      JSON.stringify(args.credentials),
      args.cardNumbers,
      args.is3d ? 1 : 0,
      args.description,
      now,
      now,
    );
  return getPaymentGatewayConfig(id)!;
}

export function updatePaymentGatewayConfig(
  id: string,
  args: {
    name?: string;
    credentials?: Record<string, string>;
    cardNumbers?: string;
    is3d?: boolean;
    description?: string;
  },
): PaymentGatewayConfig | null {
  const existing = getPaymentGatewayConfig(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE payment_gateway_configs
       SET name = ?, credentials_json = ?, card_numbers = ?, is_3d = ?, description = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      args.name?.trim() ?? existing.name,
      JSON.stringify(args.credentials ?? existing.credentials),
      args.cardNumbers ?? existing.card_numbers,
      (args.is3d ?? existing.is_3d) ? 1 : 0,
      args.description ?? existing.description,
      now,
      id,
    );
  return getPaymentGatewayConfig(id);
}

export function deletePaymentGatewayConfig(id: string): boolean {
  getDb().prepare("DELETE FROM payment_gateway_files WHERE gateway_id = ?").run(id);
  const r = getDb().prepare("DELETE FROM payment_gateway_configs WHERE id = ?").run(id);
  return r.changes > 0;
}

export function addPaymentGatewayFile(gatewayId: string, fileName: string): PaymentGatewayFile | null {
  if (!getPaymentGatewayConfig(gatewayId)) return null;
  const file: PaymentGatewayFile = {
    id: randomUUID(),
    gateway_id: gatewayId,
    file_name: fileName.trim(),
    uploaded_at: new Date().toISOString(),
  };
  getDb()
    .prepare("INSERT INTO payment_gateway_files (id, gateway_id, file_name, uploaded_at) VALUES (?, ?, ?, ?)")
    .run(file.id, file.gateway_id, file.file_name, file.uploaded_at);
  return file;
}

export function deletePaymentGatewayFile(fileId: string): boolean {
  const r = getDb().prepare("DELETE FROM payment_gateway_files WHERE id = ?").run(fileId);
  return r.changes > 0;
}

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

type ProcessorRow = {
  id: string;
  gateway_name: string;
  enabled: number;
  include_countries: string;
  exclude_countries: string;
  tab_priority: number;
  processor_priority: number;
  updated_at: string;
};

function rowToProcessor(row: ProcessorRow): PaymentProcessor {
  return {
    id: row.id,
    gateway_name: row.gateway_name,
    enabled: row.enabled === 1,
    include_countries: row.include_countries,
    exclude_countries: row.exclude_countries,
    tab_priority: row.tab_priority,
    processor_priority: row.processor_priority,
    updated_at: row.updated_at,
  };
}

function seedPaymentProcessors(): void {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS n FROM payment_processors").get() as { n: number }).n;
  if (count > 0) return;

  const now = new Date().toISOString();
  const seeds = [
    { gateway_name: "directPay", enabled: 1, include_countries: "*", exclude_countries: "", tab_priority: 1, processor_priority: 1 },
    { gateway_name: "payretailers", enabled: 1, include_countries: "*", exclude_countries: "", tab_priority: 2, processor_priority: 2 },
    { gateway_name: "bitcoBrokers", enabled: 0, include_countries: "US,GB,CA", exclude_countries: "", tab_priority: 3, processor_priority: 3 },
  ];
  const insert = db.prepare(
    `INSERT INTO payment_processors (id, gateway_name, enabled, include_countries, exclude_countries, tab_priority, processor_priority, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const s of seeds) {
    insert.run(randomUUID(), s.gateway_name, s.enabled, s.include_countries, s.exclude_countries, s.tab_priority, s.processor_priority, now);
  }
}

export function listPaymentProcessors(): PaymentProcessor[] {
  return (getDb()
    .prepare("SELECT * FROM payment_processors ORDER BY tab_priority ASC, processor_priority ASC")
    .all() as ProcessorRow[]).map(rowToProcessor);
}

export function savePaymentProcessors(
  rows: Array<{
    id?: string;
    gatewayName: string;
    enabled: boolean;
    includeCountries: string;
    excludeCountries: string;
    tabPriority: number;
    processorPriority: number;
  }>,
): PaymentProcessor[] {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = listPaymentProcessors();
  const keepIds = new Set(rows.map((r) => r.id).filter(Boolean) as string[]);

  for (const p of existing) {
    if (!keepIds.has(p.id)) {
      db.prepare("DELETE FROM payment_processors WHERE id = ?").run(p.id);
    }
  }

  const upsert = db.prepare(
    `INSERT INTO payment_processors (id, gateway_name, enabled, include_countries, exclude_countries, tab_priority, processor_priority, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       gateway_name = excluded.gateway_name,
       enabled = excluded.enabled,
       include_countries = excluded.include_countries,
       exclude_countries = excluded.exclude_countries,
       tab_priority = excluded.tab_priority,
       processor_priority = excluded.processor_priority,
       updated_at = excluded.updated_at`,
  );

  for (const row of rows) {
    const id = row.id ?? randomUUID();
    upsert.run(
      id,
      row.gatewayName.trim(),
      row.enabled ? 1 : 0,
      row.includeCountries.trim(),
      row.excludeCountries.trim(),
      row.tabPriority,
      row.processorPriority,
      now,
    );
  }

  return listPaymentProcessors();
}
