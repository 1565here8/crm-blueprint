import React, { useState } from "react";
import { UserRoundCog } from "lucide-react";
import { AgentAssignSelect } from "./AgentAssignSelect";
import { btnGreen } from "../CrmShell";

type Props = {
  agents: string[];
  selectedCount: number;
  busy?: boolean;
  onAssign: (agentName: string) => void;
};

/** Sticky bar when rows are checked — primary admin path to assign an owner agent. */
export function AssignAgentToolbar(props: Props) {
  const [agent, setAgent] = useState("");
  if (props.selectedCount === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-300/80 bg-gradient-to-r from-violet-50 via-white to-cyan-50/50 px-5 py-4 shadow-sm ring-1 ring-violet-200/60">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <UserRoundCog size={18} className="text-violet-600" />
        <span>
          Assign owner · {props.selectedCount.toLocaleString()} client
          {props.selectedCount === 1 ? "" : "s"} selected
        </span>
      </div>
      <div className="min-w-[12rem] flex-1 sm:max-w-xs">
        <AgentAssignSelect
          agents={props.agents}
          value={agent}
          onChange={setAgent}
          disabled={props.busy}
          allowEmpty={false}
          placeholder="Pick agent…"
        />
      </div>
      <button
        type="button"
        disabled={props.busy || !agent}
        className={btnGreen}
        onClick={() => {
          props.onAssign(agent);
          setAgent("");
        }}
      >
        {props.busy ? "Saving…" : "Assign agent"}
      </button>
      <p className="w-full text-[11px] text-slate-500 sm:w-auto sm:flex-1">
        Uses your bulk scope (checked rows, page, or all matching). Open Desk panel to change scope.
      </p>
    </div>
  );
}
