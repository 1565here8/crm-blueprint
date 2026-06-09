/**
 * Wikipedia-style KNOWME rendering — [[term-id|label]] markup + auto-linking.
 */
import {
  findLastGuideTopic,
  guideForTermId,
  isFollowUpExpandRequest,
  type GuideChatTurn,
} from "./crmGuideKnowledge";
import {
  buildKnowledgeAliasIndex,
  getKnowledgeArticle,
  labelForArticleId,
  allKnowledgeArticles,
  type CrmKnowledgeArticle,
} from "./crmKnowledgeGraph";

export type KnowmeWikiResponse = {
  articleId: string;
  title: string;
  path: string;
  paragraphs: string[];
  seeAlso: { id: string; label: string }[];
  linkedTerms: string[];
  markdown: string;
};

const WIKI_LINK_RE = /\[\[([\w]+)\|([^\]]+)\]\]/g;
const WIKI_LINK_ID_ONLY_RE = /\[\[([\w]+)\]\]/g;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wrap known CRM terms in [[id|label]] — longest alias wins, word boundaries. */
export function autoLinkText(text: string, skipId?: string): string {
  const index = buildKnowledgeAliasIndex();
  const needles = [...index.entries()]
    .filter(([needle, id]) => id !== skipId && needle.length >= 3)
    .sort((a, b) => b[0].length - a[0].length);

  let out = text;
  for (const [needle, id] of needles) {
    if (out.includes(`[[${id}|`)) continue;
    const re = new RegExp(`(?<!\\[\\[)\\b(${escapeRegex(needle)})\\b(?![^\\[]*\\]\\])`, "gi");
    out = out.replace(re, (_m, matched: string) => `[[${id}|${matched}]]`);
  }
  return out;
}

function expandLegacyGuideLinks(text: string): string {
  return text.replace(/\[\[(\w+)\]\]/g, (_, id: string) => `[[${id}|${labelForArticleId(id)}]]`);
}

function deepGuideParagraphs(articleId: string): string[] {
  const guide = guideForTermId(articleId);
  if (!guide) return [];
  const out: string[] = [];
  if (guide.whoUses) {
    out.push(autoLinkText(expandLegacyGuideLinks(`Who uses it: ${guide.whoUses}`), articleId));
  }
  if (guide.whenToUse) {
    out.push(autoLinkText(expandLegacyGuideLinks(`When to use it: ${guide.whenToUse}`), articleId));
  }
  const steps = (guide.steps ?? []).filter(Boolean);
  if (steps.length) {
    steps.forEach((s, i) => {
      out.push(autoLinkText(expandLegacyGuideLinks(`${i + 1}. ${s}`), articleId));
    });
  }
  if (guide.commonMistakes) {
    out.push(autoLinkText(expandLegacyGuideLinks(`Common mistakes: ${guide.commonMistakes}`), articleId));
  }
  return out;
}

function linkifyParagraphs(article: CrmKnowledgeArticle): string[] {
  return article.bodyParagraphs.map((p) => autoLinkText(p, article.id));
}

function seeAlsoBlock(article: CrmKnowledgeArticle): { id: string; label: string }[] {
  const ids = [...new Set([...article.seeAlso, ...article.relatedIds.slice(0, 4)])].filter(
    (id) => id !== article.id && getKnowledgeArticle(id),
  );
  return ids.slice(0, 5).map((id) => ({ id, label: labelForArticleId(id) }));
}

export function formatWikiArticle(article: CrmKnowledgeArticle, opts?: { expanded?: boolean }): KnowmeWikiResponse {
  const paragraphs = linkifyParagraphs(article);
  if (opts?.expanded && article.summary) {
    paragraphs.unshift(autoLinkText(article.summary, article.id));
  }
  if (opts?.expanded) {
    paragraphs.push(...deepGuideParagraphs(article.id));
  }
  const seeAlso = seeAlsoBlock(article);
  const linkedTerms = [...new Set(paragraphs.flatMap((p) => extractLinkedTermIds(p)))];
  const lines = [article.title, `Route: ${article.path}`, "", ...paragraphs];
  if (seeAlso.length) {
    lines.push("", "See also: " + seeAlso.map((s) => `[[${s.id}|${s.label}]]`).join(" · "));
  }
  return {
    articleId: article.id,
    title: article.title,
    path: article.path,
    paragraphs,
    seeAlso,
    linkedTerms,
    markdown: lines.join("\n\n"),
  };
}

export function extractLinkedTermIds(text: string): string[] {
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  const re = /\[\[([\w]+)(?:\|[^\]]+)?\]\]/g;
  while ((m = re.exec(text)) !== null) ids.push(m[1]!);
  return ids;
}

export function wikiResponseToPlainText(res: KnowmeWikiResponse): string {
  return res.markdown
    .replace(WIKI_LINK_RE, (_, _id, label) => label)
    .replace(WIKI_LINK_ID_ONLY_RE, (_, id) => labelForArticleId(id));
}

function matchArticlesInMessage(message: string): CrmKnowledgeArticle[] {
  const m = message.toLowerCase().trim().replace(/[^\w\s'?/-]/g, " ");
  const index = buildKnowledgeAliasIndex();
  const hits = new Set<string>();
  const sorted = [...index.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [needle, id] of sorted) {
    if (needle.length < 3) continue;
    if (m.includes(needle)) hits.add(id);
  }
  return [...hits].map((id) => getKnowledgeArticle(id)).filter(Boolean) as CrmKnowledgeArticle[];
}

/** Structured KNOWME answer — zero LLM. */
export function resolveKnowmeWiki(message: string, history?: GuideChatTurn[]): KnowmeWikiResponse | null {
  const m = message.toLowerCase().trim();

  if (/^explain\s+/.test(m)) {
    const rest = message.replace(/^explain\s+/i, "").trim();
    const hits = matchArticlesInMessage(rest);
    if (hits.length === 1) return formatWikiArticle(hits[0]!, { expanded: true });
    const byId = getKnowledgeArticle(rest.replace(/\s+/g, "_").toLowerCase());
    if (byId) return formatWikiArticle(byId, { expanded: true });
  }

  if (isFollowUpExpandRequest(message)) {
    const topic = findLastGuideTopic(history);
    if (topic) {
      const article = getKnowledgeArticle(topic.id);
      if (article) return formatWikiArticle(article, { expanded: true });
    }
    return null;
  }

  if (
    /demo tour|full tour|every page|every aspect|all modules|teach me everything|walk me through crm|onboarding tour/.test(
      m.replace(/[^\w\s]/g, " "),
    )
  ) {
    return formatDemoTourWiki();
  }

  const hits = matchArticlesInMessage(message);
  if (hits.length === 1) return formatWikiArticle(hits[0]!);
  if (hits.length > 1) return formatMultiMatchWiki(hits);

  return null;
}

function formatMultiMatchWiki(articles: CrmKnowledgeArticle[]): KnowmeWikiResponse {
  const lines = articles.slice(0, 6).map((a) => `• [[${a.id}|${a.title}]] — ${a.summary}`);
  const markdown = [
    "I matched several CRM topics — pick one to read the full article:",
    "",
    ...lines,
    "",
    "Click a highlighted term or ask about one topic at a time.",
  ].join("\n\n");
  return {
    articleId: "multi",
    title: "Multiple matches",
    path: "/admin/knowme",
    paragraphs: lines,
    seeAlso: articles.slice(0, 5).map((a) => ({ id: a.id, label: a.title })),
    linkedTerms: articles.map((a) => a.id),
    markdown,
  };
}

function formatDemoTourWiki(): KnowmeWikiResponse {
  const zones: Array<{ title: string; ids: string[] }> = [
    { title: "Daily ops", ids: ["mission_control", "hot_leads", "pending_in", "payment_radar"] },
    { title: "Clients & money", ids: ["all_clients", "funded_accounts", "credits_in", "payouts", "full_ledger", "balance_fixes"] },
    { title: "Desk & platform", ids: ["desk_team", "live_book", "spread", "permissions", "auto_assign", "knowme"] },
  ];
  const paragraphs: string[] = [
    autoLinkText(
      "CurioCRM demo tour — click any highlighted term for a full article. Golden path: Visitor → Aria → Hot Leads → assign Desk Team → All Clients → Pending In → Funded Accounts → Live Book.",
    ),
  ];
  for (const z of zones) {
    const items = z.ids
      .map((id) => {
        const a = getKnowledgeArticle(id);
        return a ? `[[${id}|${a.title}]]` : null;
      })
      .filter(Boolean);
    paragraphs.push(`**${z.title}:** ${items.join(" · ")}`);
  }
  const linkedTerms = paragraphs.flatMap((p) => extractLinkedTermIds(p));
  return {
    articleId: "demo_tour",
    title: "CRM demo tour",
    path: "/admin/knowme",
    paragraphs,
    seeAlso: [
      { id: "knowme", label: "KNOWME" },
      { id: "balance_fixes", label: "Balance Fixes" },
      { id: "hot_leads", label: "Hot Leads" },
    ],
    linkedTerms,
    markdown: ["CRM demo tour", "", ...paragraphs].join("\n\n"),
  };
}

export type WikiSegment =
  | { type: "text"; value: string }
  | { type: "link"; id: string; label: string };

/** Parse paragraph text into render segments. */
export function parseWikiSegments(text: string): WikiSegment[] {
  const segments: WikiSegment[] = [];
  let last = 0;
  const re = /\[\[([\w]+)\|([^\]]+)\]\]|\[\[([\w]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: "text", value: text.slice(last, m.index) });
    const id = m[1] ?? m[3]!;
    const label = m[2] ?? labelForArticleId(id);
    segments.push({ type: "link", id, label });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments.length ? segments : [{ type: "text", value: text }];
}

/** All linkable term ids (for client prefetch). */
export function allWikiTermIds(): string[] {
  return allKnowledgeArticles().map((a) => a.id);
}

export function hasWikiMarkup(text: string): boolean {
  return /\[\[[\w]+(?:\|[^\]]+)?\]\]/.test(text);
}
