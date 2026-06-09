import { BROKER_PITCH_INSTANT } from "./brokerPitch";
import { formatBrokerDeployTiersAnswer, matchesBrokerDeployQuery } from "./brokerDeployTiers";
import {
  GLOSSARY,
  formatDeepPageGuide,
  findLastGuideTopic,
  guideForTermId,
  instantCrmGuideReply,
  isFollowUpExpandRequest,
  resolvePageGuide,
  type GuideChatTurn,
  type PageGuideDef,
} from "./crmGuideKnowledge";
import { getPageTutorial } from "./crmPageTutorials";
import { matchKnowmeFlowSlide, formatFlowSlideAnswer } from "./knowmeFlows";
import {
  formatKnowmeArchitectureAnswer,
  matchesKnowmeArchitectureQuery,
} from "./knowmeAiArchitecture";
import { resolveKnowmeWiki } from "./crmWiki";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function guideForPath(path: string): PageGuideDef | null {
  return resolvePageGuide(path);
}

function answerForTerm(term: (typeof GLOSSARY)[string], expanded = false): string {
  const guide = guideForTermId(term.id) ?? guideForPath(term.path);
  return formatDeepPageGuide(term, guide ?? undefined, { expanded });
}

function answerForPath(path: string, expanded = false): string | null {
  const term = Object.values(GLOSSARY).find((t) => t.path === path);
  if (term) return answerForTerm(term, expanded);
  const guide = guideForPath(path);
  if (!guide) return null;
  return formatDeepPageGuide(
    { id: path, label: guide.title.split("—")[0]?.trim() ?? guide.title, path },
    guide,
    { expanded },
  );
}

/** Client-side KNOWME fallback when desk API is unavailable. */
export function knowmeLocalAnswer(question: string, history?: GuideChatTurn[]): string | null {
  const wiki = resolveKnowmeWiki(question, history);
  if (wiki) return wiki.markdown;

  const q = norm(question);
  if (!q) return null;

  if (isFollowUpExpandRequest(question)) {
    const topic = findLastGuideTopic(history);
    if (topic) return answerForTerm(topic, true);
    return (
      "Happy to go deeper — tell me which screen you mean (for example Balance Fixes, Hot Leads, or Pending In).\n\n" +
      "Or open Visual Flows for step-by-step diagrams."
    );
  }

  if (matchesKnowmeArchitectureQuery(question)) {
    return formatKnowmeArchitectureAnswer();
  }

  if (matchesBrokerDeployQuery(question) || /broker pack|desk pro|floor enterprise|agent elite/.test(q)) {
    return formatBrokerDeployTiersAnswer(isFollowUpExpandRequest(question));
  }

  if (/broker pitch|why curio|why curiocrm|vs salesforce|sovereign|white.label|ipo desk/.test(q)) {
    return BROKER_PITCH_INSTANT;
  }

  if (/knowme|what is this|help me|how do i use|visual flow/.test(q) && q.length < 50) {
    return "KNOWME has Visual Flows (5 slides) and Ask KNOWME chat. This page is the admin demo (management tier). Agents get preemptive Q&A only — instant verified answers, no live generation. Ask “AI architecture” for the 10 vs 90 split, or open Visual Flows first.";
  }

  if (/deposit|approve|pending/.test(q) && !/flow|slide|explain|how does|diagram|psp|webhook|gateway/.test(q)) {
    return answerForPath("/admin/cashier/deposit-requests");
  }

  const flowSlide = matchKnowmeFlowSlide(question);
  if (flowSlide) return formatFlowSlideAnswer(flowSlide);

  if (/nav|sidebar|menu|zone|users|money|agents|marketing|systems/.test(q)) {
    return `The admin sidebar is grouped by priority:\n• USERS — clients, leads, live floor, pipeline labels\n• MONEY — cashier, deposits, payouts, ledger\n• AGENTS — desk team, schedule, trading book, permissions\n• MARKETING — campaigns, tracking, promo codes\n• SYSTEMS — settings hub, commissions, spread, logs, access\n• KNOWME — this chat. Use section headers to jump fast.`;
  }

  for (const term of Object.values(GLOSSARY)) {
    const needles = [term.label, ...(term.aliases ?? [])].map(norm);
    if (needles.some((n) => q.includes(n))) {
      const guide = guideForTermId(term.id) ?? guideForPath(term.path);
      if (guide || getPageTutorial(term.path)) return answerForTerm(term);
      return `${term.label} lives at ${term.path}. Open it from the sidebar or paste that path in your browser.`;
    }
  }

  for (const term of Object.values(GLOSSARY)) {
    const guide = guideForPath(term.path);
    if (!guide) continue;
    const title = norm(guide.title);
    if (title && q.includes(title.split("—")[0]?.trim() ?? "")) {
      return answerForTerm(term);
    }
  }

  if (/withdraw|payout|wire/.test(q)) {
    return answerForPath("/admin/cashier/withdrawals");
  }
  if (/client|user|profile/.test(q)) {
    return answerForPath("/admin/crm/users");
  }
  if (/setting|config|brand/.test(q)) {
    return answerForPath("/admin/settings");
  }

  const instant = instantCrmGuideReply(question, history);
  if (instant) return instant;

  return null;
}
