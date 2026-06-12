import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, AlertOctagon } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Execution Failure',
  message,
  details,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-red-100 dark:border-red-950 bg-red-50/20 dark:bg-red-950/10 rounded-2xl animate-fade-in font-sans min-h-[300px]">
      <div className="p-4 rounded-full bg-red-100 dark:bg-red-950 text-red-500 mb-4">
        <ShieldAlert className="h-8 w-8 stroke-[1.5]" />
      </div>
      <h3 className="font-display font-semibold text-slate-800 dark:text-white text-base">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-3 leading-relaxed">
        {message}
      </p>
      
      {details && (
        <pre className="text-[10px] text-left p-3 rounded-lg bg-slate-900 text-red-400 font-mono w-full max-w-lg overflow-x-auto border border-slate-800 mb-6">
          {details}
        </pre>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl transition-all shadow-md shadow-slate-950/10 hover:scale-[1.02]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload context</span>
        </button>
      )}
    </div>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React component error:', error, errorInfo);
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-red-500 shrink-0">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-semibold text-lg text-slate-800 dark:text-white">
                  Application Runtime Crash
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  A critical exception was caught in the component tree. Telemetry systems remain operational.
                </p>
                <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800 text-red-400 font-mono text-[10px] overflow-x-auto">
                  {this.state.error?.stack || this.state.error?.toString()}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={this.handleReload}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-semibold rounded-xl transition-all shadow-md"
                  >
                    Refresh application state
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
