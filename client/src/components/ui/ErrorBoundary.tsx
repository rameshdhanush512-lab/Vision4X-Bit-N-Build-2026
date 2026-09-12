import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PRIVEX ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-64 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <h2 className="text-sm font-semibold text-white mb-1">
          {this.props.fallbackTitle ?? 'Something went wrong'}
        </h2>
        <p className="text-xs text-gray-500 max-w-xs mb-4">{this.state.message}</p>
        <button
          onClick={() => this.setState({ hasError: false, message: '' })}
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    );
  }
}
