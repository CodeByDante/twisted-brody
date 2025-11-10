import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-surface p-6 rounded-lg max-w-md w-full text-center">
            <AlertTriangle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Algo salió mal</h1>
            <p className="text-gray-400 mb-4">
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </p>
            <div className="space-y-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Recargar página
              </button>
              <a
                href="/"
                className="block w-full bg-surface-light hover:bg-surface-light/80 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Volver al inicio
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}