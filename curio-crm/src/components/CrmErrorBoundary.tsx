import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { children: ReactNode; scope?: string };
type State = { error: Error | null };

/** Prevents a single React render fault from blanking the whole admin shell. */
export class CrmErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[crm${this.props.scope ? `/${this.props.scope}` : ""}]`, error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error.message || "Unknown error";

    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-12 text-center text-slate-300">
        <p className="text-lg font-semibold text-white">This page hit an error</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          The rest of the CRM is still running. Reload or use the sidebar to go back to the dashboard.
        </p>
        <p className="mt-4 w-full break-words rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-left text-xs font-mono text-rose-200">
          {msg}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
          >
            Try again
          </button>
          <Link
            to="/admin"
            className="rounded-xl border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
