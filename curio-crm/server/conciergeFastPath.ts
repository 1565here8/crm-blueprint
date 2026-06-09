/**
 * Instant Aria replies for common demo / visitor intents.
 * Zero LLM — sub-50ms. Falls through to Ollama only for unusual questions.
 */
import type { VisitorContext } from "./concierge";
import { withConciergeDisclaimer } from "./deskPrompts";

function geoPrefix(ctx: VisitorContext): string {
  if (ctx.city) return `Welcome from ${ctx.city} — `;
  return "";
}

export function conciergeFastPath(
  message: string,
  visitor: VisitorContext,
): { reply: string } | null {
  const m = message.toLowerCase().trim().replace(/[^\w\s'?]/g, " ");

  if (
    /^(hi|hello|hey|hiya|howdy|good morning|good afternoon|good evening)\b/.test(m) ||
    /^hi aria/.test(m) ||
    /who are you|what is aria|what are you/.test(m)
  ) {
    return {
      reply: withConciergeDisclaimer(
        `${geoPrefix(visitor)}Hello — I'm Aria, your concierge at Curioni Labs. Ask me anything about the platform, or leave your name, email and phone and a specialist will reach out personally.\n\nMay I ask your first name, so I can address you properly?`,
      ),
    };
  }

  if (
    /open\s*(an?\s*)?account|sign\s*up|register|create\s*account|get\s*started|how\s*(do\s*)?(i|we)\s*(open|start|join|sign)/.test(
      m,
    )
  ) {
    return {
      reply: withConciergeDisclaimer(
        `Of course. You can register on our website with your email — verification and funding steps are in your account dashboard once you're in.\n\nIf you'd like someone to walk you through it, leave your name, email and phone and we'll call you within one business day.`,
      ),
    };
  }

  if (/deposit|fund|add money|wire|transfer|minimum deposit|how.*deposit/.test(m)) {
    return {
      reply: withConciergeDisclaimer(
        `Happy to help. Once your account is open, deposits are made securely from your dashboard — bank transfer and card options are listed there with any minimums.\n\nWould you like a specialist to talk you through funding? Just leave your name, email and phone.`,
      ),
    };
  }

  if (/invest|trading|trade|stocks|forex|crypto|market|how.*trade/.test(m)) {
    return {
      reply: withConciergeDisclaimer(
        `Thank you for asking. Curioni Labs offers a range of instruments through your account — details are on our platform pages. I can't give personal investment advice here, but a licensed specialist can explain what fits you.\n\nMay I take your name, email and phone so someone can reach out?`,
      ),
    };
  }

  if (/fee|commission|spread|cost|charge|pricing/.test(m)) {
    return {
      reply: withConciergeDisclaimer(
        `Good question. Fees and spreads are published on our legal and product pages — they vary by instrument. A specialist can walk you through the exact numbers for what you want to trade.\n\nShall I arrange a callback? Your name, email and phone is all I need.`,
      ),
    };
  }

  if (/speak|call me|human|agent|person|someone|callback|contact|reach me|phone number/.test(m)) {
    return {
      reply: withConciergeDisclaimer(
        `Absolutely. Leave your name, email and phone here — or use the form below — and a specialist will call you back within one business day.\n\nWhat's the best name to use?`,
      ),
    };
  }

  if (/support|help|problem|issue|not working|can't login|password/.test(m)) {
    return {
      reply: withConciergeDisclaimer(
        `I'm sorry you're running into trouble. For account access issues, our support team can help securely — please don't share passwords in this chat.\n\nLeave your name, email and phone and someone will contact you shortly.`,
      ),
    };
  }

  if (/^(thanks|thank you|thx|cheers|ok|okay|great|perfect|sounds good)\b/.test(m)) {
    return {
      reply: withConciergeDisclaimer(
        `You're very welcome. I'm here if anything else comes up — or leave your details whenever you're ready and we'll take it from there.`,
      ),
    };
  }

  if (/hours|open|when.*available|business hours|weekend/.test(m)) {
    return {
      reply: withConciergeDisclaimer(
        `Our platform is available online around the clock. Specialist callbacks are typically within one business day — leave your name, email and phone and we'll be in touch.`,
      ),
    };
  }

  if (/safe|secure|regulated|trust|legit|scam/.test(m)) {
    return {
      reply: withConciergeDisclaimer(
        `Thank you for asking — security matters. Account funding and personal data are handled through standard encrypted channels described on our legal pages. For specifics about your situation, a specialist can walk you through everything on a call.\n\nMay I take your name, email and phone?`,
      ),
    };
  }

  if (/demo|try|practice|virtual|paper/.test(m)) {
    return {
      reply: withConciergeDisclaimer(
        `You can explore the platform after registering — demo or practice modes are available from your dashboard depending on your account type.\n\nWould you like someone to show you around? Leave your name, email and phone.`,
      ),
    };
  }

  // Short vague messages — instant helpful reply instead of slow LLM
  if (m.split(/\s+/).length <= 4 && m.length <= 40) {
    return {
      reply: withConciergeDisclaimer(
        `Thanks for reaching out. I can help with opening an account, deposits, fees, or arranging a callback with a specialist.\n\nWhat would you like to know?`,
      ),
    };
  }

  return null;
}
