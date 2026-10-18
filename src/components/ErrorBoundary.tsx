import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center w-full h-full p-6 bg-[#080c16] text-slate-200 select-none">
          <div className="max-w-md p-6 bg-[#0d1322] border border-rose-500/40 rounded-2xl shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Canvas Display Notice</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {this.state.error?.message || 'An unexpected rendering error occurred in the graph canvas.'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold rounded-lg shadow-lg shadow-sky-500/20 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recover Graph Canvas</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
