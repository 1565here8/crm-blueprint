/**
 * Curioni Labs operator console — Apple-grade luxury (refined, precise, effortless)
 *
 * Design philosophy:
 * - Maximum whitespace, minimum visual noise
 * - Subtle gradients over flat colors for depth
 * - Micro-interactions on every hover/focus state
 * - Typography hierarchy with tight tracking for headings
 * - Glass morphism for overlays and panels
 */
export const curioni = {
  canvas: "bg-[#F5F5F7]",
  surface: "bg-white",
  ink: "text-[#1D1D1F]",
  muted: "text-[#6E6E73]",
  line: "border-[#E5E5EA]",

  /** Owner / command hero — deep plum → indigo → midnight (Apple-grade depth) */
  gradient: "bg-gradient-to-br from-[#2D1B4E] via-[#312E81] to-[#172554]",
  gradientSoft: "bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7]",
  gradientText:
    "bg-gradient-to-r from-[#312E81] via-indigo-700 to-[#172554] bg-clip-text text-transparent",

  ring: "ring-1 ring-indigo-500/10",
  accent: "text-indigo-600",
  accentBg: "bg-indigo-600",
  accentHover: "hover:bg-indigo-700",
  luxury: "text-[#9A8B6F]",
  luxuryRing: "ring-1 ring-[#9A8B6F]/35",

  navActive: "bg-indigo-500/10 text-indigo-200 ring-1 ring-indigo-400/25 rounded-xl",
  navIdle: "text-zinc-400 hover:bg-white/5 hover:text-white rounded-xl",
  tabActive: "bg-zinc-800 text-white shadow-inner",
  tabBar: "rounded-2xl border border-zinc-700/50 bg-zinc-900/30 p-1.5 backdrop-blur-xl",
  tabIdle: "text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg",

  chipOk: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 rounded-full",
  chipWarn: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 rounded-full",
  chipMuted: "bg-zinc-800/50 text-zinc-400 ring-1 ring-zinc-700/30 rounded-full",

  panel: "rounded-[20px] border border-zinc-200/60 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02]",
  panelInset: "rounded-xl border border-zinc-200/50 bg-[#F9FAFB]",
  panelGlow: "shadow-lg shadow-indigo-950/[0.04] ring-1 ring-zinc-200/60",
  panelLuxury:
    "rounded-[20px] border border-[#C9B896]/20 bg-gradient-to-br from-[#FDFCF8] to-white shadow-md ring-1 ring-[#C9B896]/10",

  link: "font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-3 transition-all hover:text-indigo-700 hover:decoration-indigo-500/60",

  heroShadow: "shadow-2xl shadow-black/10 ring-1 ring-white/10",
  heroBadge: "rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm",
} as const;

export const curioniAgent = {
  gradient: "bg-gradient-to-br from-emerald-900 via-teal-900 to-[#172554]",
  tabActive: "bg-emerald-800 text-white shadow-md",
  navActive: "bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-500/25 rounded-xl",
} as const;

export const curioniShell = {
  page: "flex min-h-screen bg-[#F5F5F7] text-[#1D1D1F] antialiased",
  header:
    "sticky top-0 z-20 border-b border-zinc-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl lg:px-6",
  sidebar: "hidden shrink-0 flex-col border-l border-[#1C1C1E]/50 bg-[#0A0A0C] transition-[width] duration-300 ease-in-out lg:flex",
  sidebarMobile: "absolute right-0 flex h-full w-[min(288px,88vw)] flex-col bg-[#0A0A0C] shadow-2xl",
  search:
    "w-full rounded-xl border border-zinc-200/60 bg-[#F9FAFB] py-2 pl-9 pr-3 text-sm text-[#1D1D1F] outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/15",
  avatar: "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#312E81] to-[#172554] text-xs font-bold text-white shadow-sm",
  bellBadge: "absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white shadow-sm",
} as const;

export const curioniKnowme = {
  heroOwner: curioni.gradient,
  heroAgent: curioniAgent.gradient,
  heroSupervisor: "bg-gradient-to-br from-teal-900 via-curioni-indigo to-curioni-midnight",
  statPill: "flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm",
  chatHeader: "from-curioni-plum via-curioni-indigo to-curioni-rail",
  chatHeaderAgent: "from-emerald-950 via-teal-950 to-curioni-rail",
  userBubble: "whitespace-pre-wrap bg-gradient-to-br from-curioni-indigo to-indigo-800 text-white shadow-md shadow-indigo-950/20",
  userBubbleAgent:
    "whitespace-pre-wrap bg-gradient-to-br from-emerald-700 to-teal-800 text-white shadow-md shadow-emerald-950/20",
  fastPathBadge: "bg-curioni-accent/20 text-indigo-100 ring-1 ring-curioni-accent/35",
  architectureSection: curioni.panelLuxury,
  architectureHighlight:
    "border-curioni-accent/30 bg-gradient-to-br from-indigo-50/80 to-curioni-surface shadow-sm ring-1 ring-curioni-accent/20",
  flowShell:
    "border-indigo-500/20 bg-gradient-to-br from-[#12101a] via-curioni-rail to-curioni-midnight shadow-indigo-950/25",
  flowHeader: "border-indigo-500/15 bg-curioni-rail/80",
  flowLabel: "text-indigo-300/85",
  flowStepBorder: "border-indigo-500/25 hover:border-curioni-champagne/40 hover:ring-curioni-champagne/20",
  flowStepIcon: "bg-curioni-accent/15 text-indigo-200 ring-1 ring-curioni-accent/30",
  flowArrow: "text-indigo-400/70",
  flowDot: "w-8 bg-curioni-accent",
  flowFooter: "border-indigo-500/10 bg-curioni-rail/60",
  flowCta: "text-curioni-champagne-light/90",
} as const;

export const DRIP_TRIGGER_META: Record<
  string,
  { label: string; steps: { kind: string; label: string }[] }
> = {
  kyc_chase: {
    label: "KYC chase",
    steps: [
      { kind: "trigger", label: "Docs pending > 48h" },
      { kind: "delay", label: "Wait 24h" },
      { kind: "action", label: "AI draft reminder email" },
      { kind: "condition", label: "Still pending?" },
      { kind: "branch", label: "Escalate to desk task" },
    ],
  },
  no_deposit: {
    label: "No first deposit",
    steps: [
      { kind: "trigger", label: "Registered, zero deposits" },
      { kind: "delay", label: "Wait 2 business days" },
      { kind: "action", label: "AI onboarding nudge" },
      { kind: "condition", label: "VIP tier?" },
      { kind: "branch", label: "Schedule agent call" },
    ],
  },
  dormant: {
    label: "Dormant trader",
    steps: [
      { kind: "trigger", label: "No trade for 7 days" },
      { kind: "delay", label: "Wait 2 business days" },
      { kind: "condition", label: "Is VIP client?" },
      { kind: "action", label: "AI re-engagement offer" },
      { kind: "branch", label: "SMS if email unopened" },
    ],
  },
  wire_pending: {
    label: "Wire pending",
    steps: [
      { kind: "trigger", label: "Wire request open" },
      { kind: "delay", label: "Wait 24h" },
      { kind: "action", label: "AI follow-up to client" },
    ],
  },
  failed_deposit: {
    label: "Failed deposit",
    steps: [
      { kind: "trigger", label: "PSP decline recorded" },
      { kind: "action", label: "AI recovery email + PSP hint" },
      { kind: "branch", label: "Route to Payment Radar" },
    ],
  },
  birthday: {
    label: "Birthday",
    steps: [
      { kind: "trigger", label: "Birthday today" },
      { kind: "action", label: "AI personalized greeting" },
    ],
  },
  custom: {
    label: "Custom rule",
    steps: [
      { kind: "trigger", label: "SQL / config match" },
      { kind: "action", label: "AI draft from prompt" },
    ],
  },
};
