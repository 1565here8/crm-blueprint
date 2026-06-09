/**
 * Platform country registry — visits, registration, trading gates + dial prefix.
 */
import { getDb } from "./db";
import { dialPrefixFor } from "../shared/countryDialPrefixes";

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

const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AD: "Andorra", AO: "Angola",
  AG: "Antigua and Barbuda", AR: "Argentina", AM: "Armenia", AU: "Australia", AT: "Austria",
  AZ: "Azerbaijan", BS: "Bahamas", BH: "Bahrain", BD: "Bangladesh", BB: "Barbados",
  BY: "Belarus", BE: "Belgium", BZ: "Belize", BJ: "Benin", BT: "Bhutan", BO: "Bolivia",
  BA: "Bosnia and Herzegovina", BW: "Botswana", BR: "Brazil", BN: "Brunei", BG: "Bulgaria",
  BF: "Burkina Faso", BI: "Burundi", KH: "Cambodia", CM: "Cameroon", CA: "Canada",
  CV: "Cabo Verde", CF: "Central African Republic", TD: "Chad", CL: "Chile", CN: "China",
  CO: "Colombia", KM: "Comoros", CG: "Congo", CD: "DR Congo", CR: "Costa Rica",
  CI: "Côte d'Ivoire", HR: "Croatia", CU: "Cuba", CY: "Cyprus", CZ: "Czechia",
  DK: "Denmark", DJ: "Djibouti", DM: "Dominica", DO: "Dominican Republic", EC: "Ecuador",
  EG: "Egypt", SV: "El Salvador", GQ: "Equatorial Guinea", ER: "Eritrea", EE: "Estonia",
  SZ: "Eswatini", ET: "Ethiopia", FJ: "Fiji", FI: "Finland", FR: "France", GA: "Gabon",
  GM: "Gambia", GE: "Georgia", DE: "Germany", GH: "Ghana", GR: "Greece", GD: "Grenada",
  GT: "Guatemala", GN: "Guinea", GW: "Guinea-Bissau", GY: "Guyana", HT: "Haiti",
  HN: "Honduras", HK: "Hong Kong", HU: "Hungary", IS: "Iceland", IN: "India",
  ID: "Indonesia", IR: "Iran", IQ: "Iraq", IE: "Ireland", IL: "Israel", IT: "Italy",
  JM: "Jamaica", JP: "Japan", JO: "Jordan", KZ: "Kazakhstan", KE: "Kenya", KI: "Kiribati",
  KW: "Kuwait", KG: "Kyrgyzstan", LA: "Laos", LV: "Latvia", LB: "Lebanon", LS: "Lesotho",
  LR: "Liberia", LY: "Libya", LI: "Liechtenstein", LT: "Lithuania", LU: "Luxembourg",
  MO: "Macao", MG: "Madagascar", MW: "Malawi", MY: "Malaysia", MV: "Maldives",
  ML: "Mali", MT: "Malta", MH: "Marshall Islands", MR: "Mauritania", MU: "Mauritius",
  MX: "Mexico", FM: "Micronesia", MD: "Moldova", MC: "Monaco", MN: "Mongolia",
  ME: "Montenegro", MA: "Morocco", MZ: "Mozambique", MM: "Myanmar", NA: "Namibia",
  NR: "Nauru", NP: "Nepal", NL: "Netherlands", NZ: "New Zealand", NI: "Nicaragua",
  NE: "Niger", NG: "Nigeria", MK: "North Macedonia", NO: "Norway", OM: "Oman",
  PK: "Pakistan", PW: "Palau", PS: "Palestine", PA: "Panama", PG: "Papua New Guinea",
  PY: "Paraguay", PE: "Peru", PH: "Philippines", PL: "Poland", PT: "Portugal",
  QA: "Qatar", RO: "Romania", RU: "Russia", RW: "Rwanda", KN: "Saint Kitts and Nevis",
  LC: "Saint Lucia", VC: "Saint Vincent", WS: "Samoa", SM: "San Marino",
  ST: "São Tomé and Príncipe", SA: "Saudi Arabia", SN: "Senegal", RS: "Serbia",
  SC: "Seychelles", SL: "Sierra Leone", SG: "Singapore", SK: "Slovakia", SI: "Slovenia",
  SB: "Solomon Islands", SO: "Somalia", ZA: "South Africa", SS: "South Sudan",
  KR: "South Korea", ES: "Spain", LK: "Sri Lanka", SD: "Sudan", SR: "Suriname",
  SE: "Sweden", CH: "Switzerland", SY: "Syria", TW: "Taiwan", TJ: "Tajikistan",
  TZ: "Tanzania", TH: "Thailand", TL: "Timor-Leste", TG: "Togo", TO: "Tonga",
  TT: "Trinidad and Tobago", TN: "Tunisia", TR: "Turkey", TM: "Turkmenistan",
  TV: "Tuvalu", UG: "Uganda", UA: "Ukraine", AE: "United Arab Emirates",
  GB: "United Kingdom", US: "United States", UY: "Uruguay", UZ: "Uzbekistan",
  VU: "Vanuatu", VA: "Vatican City", VE: "Venezuela", VN: "Vietnam", YE: "Yemen",
  ZM: "Zambia", ZW: "Zimbabwe",
};

let schemaReady = false;

function ensureCountrySchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_countries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      iso TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      allow_visits INTEGER NOT NULL DEFAULT 1,
      allow_reg INTEGER NOT NULL DEFAULT 1,
      allow_trading INTEGER NOT NULL DEFAULT 1,
      phone_prefix TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_platform_countries_iso ON platform_countries(iso);
    CREATE INDEX IF NOT EXISTS idx_platform_countries_name ON platform_countries(name);
  `);

  const count = db.prepare("SELECT COUNT(*) AS c FROM platform_countries").get() as { c: number };
  if (count.c === 0) {
    const now = new Date().toISOString();
    const ins = db.prepare(
      `INSERT INTO platform_countries
       (iso, name, allow_visits, allow_reg, allow_trading, phone_prefix, updated_at)
       VALUES (?, ?, 1, 1, 1, ?, ?)`,
    );
    for (const iso of Object.keys(COUNTRY_NAMES).sort((a, b) => COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b]))) {
      ins.run(iso, COUNTRY_NAMES[iso], dialPrefixFor(iso), now);
    }
  }
  schemaReady = true;
}

export function listPlatformCountries(q: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}): { rows: PlatformCountryRow[]; total: number; page: number; limit: number } {
  ensureCountrySchema();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(100, Math.max(10, q.limit ?? 10));
  const offset = (page - 1) * limit;
  const sortMap: Record<string, string> = { id: "id", name: "name", iso: "iso", phone_prefix: "phone_prefix" };
  const sortCol = sortMap[q.sortBy ?? ""] ?? "name";
  const sortDir = q.sortDir === "desc" ? "DESC" : "ASC";

  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (q.search?.trim()) {
    where.push("(name LIKE ? OR iso LIKE ? OR phone_prefix LIKE ?)");
    const like = `%${q.search.trim()}%`;
    params.push(like, like, like);
  }
  const whereSql = where.join(" AND ");
  const total = (getDb().prepare(`SELECT COUNT(*) AS c FROM platform_countries WHERE ${whereSql}`).get(...params) as { c: number }).c;
  const rows = getDb()
    .prepare(
      `SELECT id, iso, name, allow_visits, allow_reg, allow_trading, phone_prefix, updated_at
       FROM platform_countries WHERE ${whereSql}
       ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as PlatformCountryRow[];

  return { rows, total, page, limit };
}

export function getPlatformCountry(id: number): PlatformCountryRow | null {
  ensureCountrySchema();
  return (
    (getDb()
      .prepare(
        `SELECT id, iso, name, allow_visits, allow_reg, allow_trading, phone_prefix, updated_at
         FROM platform_countries WHERE id = ?`,
      )
      .get(id) as PlatformCountryRow | undefined) ?? null
  );
}

export function updatePlatformCountry(
  id: number,
  patch: Partial<{ name: string; allowVisits: boolean; allowReg: boolean; allowTrading: boolean; phonePrefix: string }>,
): PlatformCountryRow | null {
  ensureCountrySchema();
  const cur = getPlatformCountry(id);
  if (!cur) return null;
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE platform_countries
       SET name = ?, allow_visits = ?, allow_reg = ?, allow_trading = ?, phone_prefix = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.name !== undefined ? patch.name.slice(0, 120) : cur.name,
      patch.allowVisits !== undefined ? (patch.allowVisits ? 1 : 0) : cur.allow_visits,
      patch.allowReg !== undefined ? (patch.allowReg ? 1 : 0) : cur.allow_reg,
      patch.allowTrading !== undefined ? (patch.allowTrading ? 1 : 0) : cur.allow_trading,
      patch.phonePrefix !== undefined ? patch.phonePrefix.replace(/\D/g, "").slice(0, 8) : cur.phone_prefix,
      now,
      id,
    );
  return getPlatformCountry(id);
}
