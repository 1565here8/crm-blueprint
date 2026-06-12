import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-8 text-center">
          <div>
            <h1 className="mb-4 font-serif text-2xl font-bold text-white">Something went wrong</h1>
            <p className="mb-4 text-zinc-400">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-purple-600 px-6 py-3 text-sm font-medium text-white"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
