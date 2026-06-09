/**
 * Universal CSV column mapper — accepts any header labels and column order.
 * Maps by header meaning (Name, Surname, Email, Phone Number, …) not position.
 */

export type CrmImportField =
  | "first_name"
  | "last_name"
  | "name"
  | "email"
  | "phone"
  | "username"
  | "password"
  | "country_code"
  | "agent_name"
  | "crm_status"
  | "initial_balance"
  | "currency"
  | "param1"
  | "partner"
  | "campaign";

const FIELD_PRIORITY: CrmImportField[] = [
  "email",
  "username",
  "phone",
  "last_name",
  "first_name",
  "name",
  "password",
  "initial_balance",
  "country_code",
  "agent_name",
  "crm_status",
  "currency",
  "param1",
  "partner",
  "campaign",
];

function headerTokens(raw: string): string {
  return raw
    .replace(/\ufeff/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLastNameHeader(raw: string): boolean {
  const t = headerTokens(raw);
  return /\b(surname|sur name|last name|family name|lname|second name|lastname)\b/.test(t);
}

function isFirstNameHeader(raw: string): boolean {
  const t = headerTokens(raw);
  return /\b(first name|given name|fname|forename|firstname|christian name)\b/.test(t);
}

function isEmailHeader(raw: string): boolean {
  const t = headerTokens(raw);
  return /\b(e mail|email|mail address|email address|e-mail)\b/.test(t) || t === "mail";
}

function isPhoneHeader(raw: string): boolean {
  const t = headerTokens(raw);
  return /\b(phone|mobile|tel|cell|whatsapp|contact number|phone number|telephone|cellphone|cell phone|msisdn)\b/.test(
    t,
  );
}

function isNameHeader(raw: string): boolean {
  const t = headerTokens(raw);
  if (/\b(user name|username|login|account)\b/.test(t)) return false;
  return (
    t === "name" ||
    /\b(full name|client name|customer name|lead name|contact name|account name|display name)\b/.test(t) ||
    (/\bname\b/.test(t) && !isFirstNameHeader(raw) && !isLastNameHeader(raw))
  );
}

function isUsernameHeader(raw: string): boolean {
  const t = headerTokens(raw);
  return /\b(user name|username|login|user id|userid|account name)\b/.test(t) || t === "user";
}

function isBalanceHeader(raw: string): boolean {
  const t = headerTokens(raw);
  return /\b(balance|deposit|initial balance|starting balance|initial deposit|credit|amount|fund|equity|cash)\b/.test(
    t,
  );
}

function classifyHeader(raw: string, allRawHeaders: string[]): CrmImportField | null {
  const t = headerTokens(raw);
  if (!t) return null;

  if (isEmailHeader(raw)) return "email";
  if (isUsernameHeader(raw)) return "username";
  if (isPhoneHeader(raw)) return "phone";
  if (isLastNameHeader(raw)) return "last_name";
  if (isFirstNameHeader(raw)) return "first_name";
  if (isNameHeader(raw)) {
    const hasSeparateLast = allRawHeaders.some((h) => h !== raw && isLastNameHeader(h));
    return hasSeparateLast ? "first_name" : "name";
  }
  if (/\b(country|nation|geo|location)\b/.test(t)) return "country_code";
  if (/\b(agent|broker|manager|owner|assigned)\b/.test(t)) return "agent_name";
  if (/\b(status|stage|state|crm status|lead status)\b/.test(t)) return "crm_status";
  if (isBalanceHeader(raw)) return "initial_balance";
  if (/\b(currency|ccy|account currency)\b/.test(t)) return "currency";
  if (/\b(password|pass|pwd)\b/.test(t)) return "password";
  if (/\b(partner|affiliate|ib|introducer)\b/.test(t)) return "partner";
  if (/\b(campaign|source|utm|channel|medium)\b/.test(t)) return "campaign";
  if (/\b(param1|param 1|param|tag|ref|reference|promo|promo code)\b/.test(t)) return "param1";

  return null;
}

function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function looksLikePersonName(v: string): boolean {
  const t = v.trim();
  if (t.length < 2 || t.length > 80) return false;
  if (looksLikeEmail(t) || looksLikePhone(t) || looksLikeMoney(t)) return false;
  return /^[\p{L}\p{M}\s'.-]+$/u.test(t);
}

function looksLikePhone(v: string): boolean {
  const d = v.replace(/\D/g, "");
  return d.length >= 7 && d.length <= 15 && /[\d+(-]/.test(v);
}

function looksLikeMoney(v: string): boolean {
  const cleaned = v.replace(/[^\d.,-]/g, "");
  const n = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 && /[\d]/.test(v);
}

/** Build index → field map from headers + optional sample rows for headerless/ambiguous files. */
export function buildCsvColumnMap(
  rawHeaders: string[],
  sampleRows: string[][],
): { map: Map<number, CrmImportField>; labels: Record<string, string> } {
  const map = new Map<number, CrmImportField>();
  const usedFields = new Set<CrmImportField>();
  const labels: Record<string, string> = {};

  for (let col = 0; col < rawHeaders.length; col++) {
    const field = classifyHeader(rawHeaders[col] ?? "", rawHeaders);
    if (!field || usedFields.has(field)) continue;
    map.set(col, field);
    usedFields.add(field);
    labels[field] = rawHeaders[col]?.trim() || `Column ${col + 1}`;
  }

  const contentScores = new Map<number, Map<CrmImportField, number>>();
  const bump = (col: number, field: CrmImportField, n = 1) => {
    if (!contentScores.has(col)) contentScores.set(col, new Map());
    const m = contentScores.get(col)!;
    m.set(field, (m.get(field) ?? 0) + n);
  };

  for (const row of sampleRows.slice(0, 8)) {
    for (let col = 0; col < Math.max(rawHeaders.length, row.length); col++) {
      const v = (row[col] ?? "").trim();
      if (!v) continue;
      if (looksLikeEmail(v)) bump(col, "email", 3);
      else if (looksLikePhone(v)) bump(col, "phone", 2);
      else if (looksLikeMoney(v)) bump(col, "initial_balance", 2);
      else if (looksLikePersonName(v)) bump(col, "first_name", 1);
    }
  }

  for (const field of FIELD_PRIORITY) {
    if (usedFields.has(field)) continue;
    let bestCol = -1;
    let bestScore = 0;
    for (const [col, scores] of contentScores) {
      if (map.has(col)) continue;
      const s = scores.get(field) ?? 0;
      if (s > bestScore) {
        bestScore = s;
        bestCol = col;
      }
    }
    if (bestCol >= 0 && bestScore > 0) {
      map.set(bestCol, field);
      usedFields.add(field);
      labels[field] = rawHeaders[bestCol]?.trim() || `Column ${bestCol + 1} (detected)`;
    }
  }

  const unmappedNameCols: number[] = [];
  for (let col = 0; col < rawHeaders.length; col++) {
    if (map.has(col)) continue;
    const h = headerTokens(rawHeaders[col] ?? "");
    if (!h || /^(col|column|field|data|value|info)\s*\d*$/.test(h)) continue;
    if (/\b(name|surname|client|contact|lead)\b/.test(h)) unmappedNameCols.push(col);
  }

  if (!usedFields.has("first_name") && !usedFields.has("name") && unmappedNameCols.length > 0) {
    map.set(unmappedNameCols[0], "first_name");
    usedFields.add("first_name");
    labels.first_name = rawHeaders[unmappedNameCols[0]]?.trim() ?? "Column";
    if (unmappedNameCols.length > 1 && !usedFields.has("last_name")) {
      map.set(unmappedNameCols[1], "last_name");
      usedFields.add("last_name");
      labels.last_name = rawHeaders[unmappedNameCols[1]]?.trim() ?? "Column";
    }
  }

  // Remaining text columns that look like person names (any header / column order)
  const nameCandidateCols: number[] = [];
  for (let col = 0; col < Math.max(rawHeaders.length, ...sampleRows.map((r) => r.length)); col++) {
    if (map.has(col)) continue;
    let nameHits = 0;
    for (const row of sampleRows.slice(0, 6)) {
      if (looksLikePersonName(row[col] ?? "")) nameHits += 1;
    }
    if (nameHits >= 2) nameCandidateCols.push(col);
  }
  if (!usedFields.has("first_name") && nameCandidateCols.length > 0) {
    map.set(nameCandidateCols[0], "first_name");
    usedFields.add("first_name");
    labels.first_name = rawHeaders[nameCandidateCols[0]]?.trim() || `Column ${nameCandidateCols[0] + 1}`;
  }
  if (!usedFields.has("last_name") && nameCandidateCols.length > 1) {
    map.set(nameCandidateCols[1], "last_name");
    usedFields.add("last_name");
    labels.last_name = rawHeaders[nameCandidateCols[1]]?.trim() || `Column ${nameCandidateCols[1] + 1}`;
  }

  return { map, labels };
}

/** Turn a raw CSV row into normalized CRM fields using the column map. */
export function rowToCrmFields(
  values: string[],
  colMap: Map<number, CrmImportField>,
): Record<CrmImportField, string> {
  const out = {} as Record<CrmImportField, string>;
  for (const [col, field] of colMap) {
    const v = (values[col] ?? "").trim();
    if (v) out[field] = v;
  }
  return out;
}

export function parsePersonNames(fields: Record<CrmImportField, string>): {
  firstName: string;
  lastName: string;
} {
  let firstName = fields.first_name ?? "";
  let lastName = fields.last_name ?? "";

  if (fields.name && !firstName && !lastName) {
    const parts = fields.name.trim().split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ");
  } else if (fields.name && !firstName) {
    firstName = fields.name.trim();
  }

  if (!lastName && fields.last_name) lastName = fields.last_name;

  return { firstName, lastName };
}

export function parseCsvMoney(raw: string | undefined): number {
  if (!raw?.trim()) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
