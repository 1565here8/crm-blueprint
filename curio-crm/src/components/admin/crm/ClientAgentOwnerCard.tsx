import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UserRoundCog } from "lucide-react";
import type { CrmUser } from "../../../api/client";
import { AgentAssignSelect } from "./AgentAssignSelect";

type Props = {
  user: CrmUser;
  agents: string[];
  saving?: boolean;
  onAssign: (agentName: string) => void;
};

/** Prominent owner-agent control on Client File — admin assign path. */
export function ClientAgentOwnerCard(props: Props) {
  const [agent, setAgent] = useState(props.user.agentName);
  const dirty = agent !== props.user.agentName;

  return (
    <div className="mb-6 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm ring-1 ring-violet-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-800">
            <UserRoundCog size={14} />
            Owner agent (desk assignment)
          </p>
          <p className="mt-1 text-sm text-teal-950">
            This client is owned by <strong>{props.user.agentName || "—"}</strong> on the scoreboard and reports.
          </p>
        </div>
        <Link
          to={`/admin/crm/users?agent=${encodeURIComponent(props.user.agentName)}`}
          className="text-xs font-semibold text-teal-700 hover:underline"
        >
          All clients for this agent →
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="min-w-[14rem] flex-1 sm:max-w-xs">
          <AgentAssignSelect
            agents={props.agents}
            value={agent}
            onChange={setAgent}
            disabled={props.saving}
            allowEmpty={false}
          />
        </div>
        <button
          type="button"
          disabled={!dirty || props.saving}
          onClick={() => props.onAssign(agent)}
          className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {props.saving ? "Saving…" : "Save assignment"}
        </button>
      </div>
    </div>
  );
}
