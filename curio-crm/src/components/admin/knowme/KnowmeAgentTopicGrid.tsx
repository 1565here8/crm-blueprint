import { KNOWME_AGENT_TOPIC_GROUPS } from "../../../../shared/knowmeExperience";

type Props = { onPick: (prompt: string) => void; disabled?: boolean };

/** Agent-tier topic launcher — preemptive Q&A categories. */
export function KnowmeAgentTopicGrid({ onPick, disabled }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {KNOWME_AGENT_TOPIC_GROUPS.map((g) => (
        <div
          key={g.id}
          className="rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 p-3 shadow-sm ring-1 ring-emerald-100/80"
        >
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <span aria-hidden>{g.emoji}</span>
            {g.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {g.prompts.map((p) => (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => onPick(p)}
                className="rounded-lg border border-emerald-200/60 bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
