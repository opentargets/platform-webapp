import { Component, type ReactNode } from "react";

interface Props {
  fallback?: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error) => void;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps one failing widget from taking the rest of the report down with it. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") return fallback(error);
      return fallback ?? null;
    }
    return this.props.children;
  }
}
