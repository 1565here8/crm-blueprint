import { Brain, LayoutGrid, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";

import React, { useCallback, useRef, useState } from "react";

import { client } from "../../../api/client";
import { matchKnowmeFlowSlide, formatFlowSlideAnswer } from "../../../../shared/knowmeFlows";
import { knowmeLocalAnswer } from "../../../../shared/knowmeLocal";
import { hasWikiMarkup } from "../../../../shared/crmWiki";
import { AdminPageHeader, adminUi, Panel } from "../../../components/admin/CrmShell";
import { WikiRichMessage } from "../../../components/admin/knowme/WikiRichMessage";
import { isPrimaryAdmin } from "../../../components/admin/adminNavConfig";
import { useAuth } from "../../../context/AuthContext";

import { KnowmeFlowSlides, gotoKnowmeSlide } from "./KnowmeFlowSlides";



type Msg = { role: "user" | "assistant"; text: string };

type Tab = "flows" | "chat";

const STARTERS = [

  "Show me the client golden path",

  "How do affiliate trackers work?",

  "Explain PSP deposit flow",

  "How does click-to-call work?",

];



export function KnowmePage() {

  const { user } = useAuth();

  const canAsk = isPrimaryAdmin(user) || (user?.permissions ?? []).includes("desk.ask");

  const [tab, setTab] = useState<Tab>("flows");

  const [messages, setMessages] = useState<Msg[]>([

    {

      role: "assistant",

      text: "I'm KNOWME ΓÇö your CRM guide. Browse Visual Flows for diagrams, or ask anything about clients, money, desk work, and settings. Tap any teal underlined term to open that topic ΓÇö like Wikipedia.",

    },

  ]);

  const [input, setInput] = useState("");

  const [busy, setBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);



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

        if (!reply && canAsk) {
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
            /* use local fallback */
          }
        }

        if (!reply) {
          reply =
            "I couldn't match that yet. Open Visual Flows (five diagrams), or try: ΓÇ£Explain PSP deposit flowΓÇ¥ or ΓÇ£How do affiliates work?ΓÇ¥";
        }

        setMessages((m) => [...m, { role: "assistant", text: reply }]);

      } finally {

        setBusy(false);

        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));

      }

    },

    [busy, canAsk, messages],
  );

  const handleTermClick = useCallback((_termId, label) => { void send(`Explain ${label}`); }, [send]); // patched

 //

  );



  return (

    <div className="mx-auto flex max-w-5xl flex-col">

      <AdminPageHeader

        title="KNOWME"

        subtitle="Visual workflows + chat ΓÇö learn the platform without reading a manual."

        actions={

          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold text-teal-700">

            <Sparkles size={12} /> {canAsk ? "Visual flows + local guide (AI optional)" : "Visual flows + local guide"}

          </span>

        }

      />



      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1">

        <button

          type="button"

          onClick={() => setTab("flows")}

          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${

            tab === "flows"

              ? "bg-slate-900 text-teal-300 shadow-md"

              : "text-slate-600 hover:bg-white hover:text-slate-900"

          }`}

        >

          <LayoutGrid size={16} />

          Visual Flows

        </button>

        <button

          type="button"

          onClick={() => setTab("chat")}

          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${

            tab === "chat"

              ? "bg-teal-600 text-white shadow-md"

              : "text-slate-600 hover:bg-white hover:text-slate-900"

          }`}

        >

          <MessageSquare size={16} />

          Ask KNOWME

        </button>

      </div>



      {tab === "flows" ? (

        <KnowmeFlowSlides />

      ) : (

        <Panel className="flex min-h-[420px] flex-col overflow-hidden p-0">

          <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-teal-950 to-slate-900 px-4 py-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">

              <Brain size={18} />

            </div>

            <div>

              <p className="text-sm font-semibold text-white">KNOWME assistant</p>

              <p className="text-[11px] text-teal-200/60">CRM trainer ┬╖ routes ┬╖ plain English</p>

            </div>

          </div>



          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4" style={{ maxHeight: 480 }}>

            {messages.map((msg, i) => (

              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                <div

                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${

                    msg.role === "user"

                      ? "whitespace-pre-wrap bg-teal-600 text-white"

                      : "border border-slate-200/80 bg-white text-slate-700 shadow-sm"

                  }`}

                >

                  {msg.role === "assistant" && hasWikiMarkup(msg.text) ? (
                    <WikiRichMessage
                      text={msg.text}
                      onTermClick={(_termId, label) => void send(`explain ${label}`)}
                    />
                  ) : (
                    msg.text
                  )}

                </div>

              </div>

            ))}

            {busy ? (

              <div className="flex items-center gap-2 text-sm text-slate-400">

                <Loader2 size={14} className="animate-spin" /> ThinkingΓÇª

              </div>

            ) : null}

          </div>



          <div className="border-t border-slate-100 bg-white p-3">

            <div className="mb-2 flex flex-wrap gap-1.5">

              {STARTERS.map((s) => (

                <button

                  key={s}

                  type="button"

                  onClick={() => void send(s)}

                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"

                >

                  {s}

                </button>

              ))}

            </div>

            <form

              className="flex gap-2"

              onSubmit={(e) => {

                e.preventDefault();

                void send(input);

              }}

            >

              <input

                value={input}

                onChange={(e) => setInput(e.target.value)}

                placeholder="Ask about any CRM page or workflowΓÇª"

                className={adminUi.input}

                disabled={busy}

              />

              <button type="submit" disabled={busy || !input.trim()} className={adminUi.btnPrimary}>

                <Send size={16} />

              </button>

            </form>

          </div>

        </Panel>

      )}

    </div>

  );

}


