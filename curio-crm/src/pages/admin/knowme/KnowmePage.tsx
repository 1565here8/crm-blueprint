import {
  BookOpen,
  Brain,
  LayoutGrid,
  MessageSquare,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

import { client } from "../../../api/client";
import { matchKnowmeFlowSlide, formatFlowSlideAnswer } from "../../../../shared/knowmeFlows";
import { knowmeLocalAnswer } from "../../../../shared/knowmeLocal";
import {
  knowmeAgentNoMatchReply,
  knowmePageSubtitle,
  knowmeStarters,
  knowmeWelcome,
  resolveKnowmeMode,
} from "../../../../shared/knowmeExperience";
import { KnowmeAgentTopicGrid } from "../../../components/admin/knowme/KnowmeAgentTopicGrid";
import { KnowmeAiArchitecturePanel } from "../../../components/admin/knowme/KnowmeAiArchitecturePanel";
import { KnowmeBrokerDeployPanel } from "../../../components/admin/knowme/KnowmeBrokerDeployPanel";
import { KnowmeChatPanel } from "../../../components/admin/knowme/KnowmeChatPanel";
import { isPrimaryAdmin } from "../../../components/admin/adminNavConfig";
import { useAuth } from "../../../context/AuthContext";

import { curioni, curioniAgent, curioniKnowme } from "../../../lib/curioniDesign";
import { KnowmeFlowSlides, gotoKnowmeSlide } from "./KnowmeFlowSlides";

type Tab = "guide" | "broker" | "flows" | "chat";

export function KnowmePage() {
  const { user } = useAuth();
  const isOwner = isPrimaryAdmin(user);
  const hasDeskAsk = (user?.permissions ?? []).includes("desk.ask");
  const canLiveAi = isOwner || hasDeskAsk;
  const mode = resolveKnowmeMode({ isPrimaryAdmin: isOwner, hasDeskAsk });
  const isAgent = mode === "agent";

  const [tab, setTab] = useState<Tab>(isAgent ? "guide" : "flows");
  const [messages, setMessages] = useState(() => [
    { role: "assistant" as const, text: knowmeWelcome(mode) },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const starters = useMemo(() => knowmeStarters(mode), [mode]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      const priorHistory = messages.map((m) => ({ role: m.role, content: m.text }));
      setInput("");
      setMessages((m) => [...m, { role: "user", text: q }]);
      setBusy(true);
      try {
        const flowSlide = matchKnowmeFlowSlide(q);
        let reply: string | undefined;

        if (flowSlide) {
          reply = formatFlowSlideAnswer(flowSlide);
          setTab("flows");
          gotoKnowmeSlide(flowSlide.slideNumber);
        } else {
          reply = knowmeLocalAnswer(q, priorHistory) ?? undefined;
        }

        if (!reply && canLiveAi && !isAgent) {
          try {
            const res = await Promise.race([
              client.deskAsk({
                message: q,
                history: [...priorHistory, { role: "user", content: q }],
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 12_000),
              ),
            ]);
            const ai = res.reply?.replace(/\n\nEND\s*$/i, "").trim();
            if (ai) reply = ai;
          } catch {
            /* encyclopedia only */
          }
        }

        if (!reply) {
          reply = isAgent
            ? knowmeAgentNoMatchReply()
            : 'No match yet â€” try Visual Flows, or ask: "Explain PSP deposit flow" Â· "Demo tour".';
        }

        setMessages((m) => [...m, { role: "assistant", text: reply }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, canLiveAi, isAgent, messages],
  );

  const heroClass = isAgent
    ? curioniKnowme.heroAgent
    : isOwner
      ? curioniKnowme.heroOwner
      : curioniKnowme.heroSupervisor;

  const showBrokerPacks = isOwner || hasDeskAsk;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = isOwner
    ? [
        { id: "guide", label: "Platform", icon: <Sparkles size={16} /> },
        { id: "broker", label: "Broker packs", icon: <Server size={16} /> },
        { id: "flows", label: "Visual Flows", icon: <LayoutGrid size={16} /> },
        { id: "chat", label: "Ask KNOWME", icon: <MessageSquare size={16} /> },
      ]
    : isAgent
      ? [
          { id: "guide", label: "Quick help", icon: <Zap size={16} /> },
          { id: "flows", label: "Visual Flows", icon: <LayoutGrid size={16} /> },
          { id: "chat", label: "Ask", icon: <MessageSquare size={16} /> },
        ]
      : [
          { id: "broker", label: "Broker packs", icon: <Server size={16} /> },
          { id: "flows", label: "Visual Flows", icon: <LayoutGrid size={16} /> },
          { id: "chat", label: "Ask KNOWME", icon: <MessageSquare size={16} /> },
        ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col pb-8">
      <section
        className={`mb-6 overflow-hidden rounded-2xl p-6 text-white ${heroClass} ${curioni.heroShadow}`}
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Brain size={28} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">KNOWME</h1>
              <span className={curioni.heroBadge}>
                {isAgent ? "Agent tier" : isOwner ? "Owner demo" : "Supervisor"}
              </span>
            </div>
            <p className="max-w-2xl text-sm text-white/85">{knowmePageSubtitle(mode)}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <StatPill
            icon={<Zap size={14} />}
            label={isAgent ? "Response" : "Fast-path"}
            value={isAgent ? "< 100 ms" : "Instant wiki"}
          />
          <StatPill
            icon={<BookOpen size={14} />}
            label="Visual flows"
            value="5 diagrams"
          />
          <StatPill
            icon={<ShieldCheck size={14} />}
            label="Compliance"
            value={isAgent ? "Pre-approved only" : canLiveAi ? "Wiki + live AI" : "Verified encyclopedia"}
          />
        </div>
      </section>

      <div className={`mb-5 flex gap-1 ${curioni.tabBar}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? isAgent
                  ? curioniAgent.tabActive
                  : curioni.tabActive
                : curioni.tabIdle
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "guide" && isOwner ? (
        <div className="space-y-6">
          <KnowmeAiArchitecturePanel />
          <div className={`p-5 ${curioni.panelLuxury}`}>
            <p className="mb-3 text-sm font-bold text-curioni-ink">Broker demo script</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-curioni-muted">
              <li>Broker packs tab — Desk Pro vs Floor Enterprise.</li>
              <li>Show AI tiers — 10 live vs 90 preemptive.</li>
              <li>Visual Flows slide 1 — golden path.</li>
              <li>Ask KNOWME — &quot;Demo tour&quot; then Pending In.</li>
              <li>WALLSTREET AI — morning routine (if Ollama online).</li>
            </ol>
          </div>
        </div>
      ) : null}

      {tab === "broker" && showBrokerPacks ? <KnowmeBrokerDeployPanel /> : null}

      {tab === "guide" && isAgent ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-950">
            <strong>Your tier:</strong> instant answers from the verified CRM encyclopedia. No live AI
            generation â€” supervisors handle custom drafts via WALLSTREET AI.
          </div>
          <KnowmeAgentTopicGrid onPick={(p) => void send(p)} disabled={busy} />
        </div>
      ) : null}

      {tab === "flows" ? <KnowmeFlowSlides variant={isAgent ? "agent" : "default"} /> : null}

      {tab === "chat" ? (
        <KnowmeChatPanel
          mode={mode}
          messages={messages}
          starters={starters}
          input={input}
          busy={busy}
          canLiveAi={canLiveAi}
          onInputChange={setInput}
          onSend={(t) => void send(t)}
        />
      ) : null}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={curioniKnowme.statPill}>
      <span className="text-white/80">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
