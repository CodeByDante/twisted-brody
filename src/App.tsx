import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import AppContent from './AppContent';
import { useStore } from './lib/store';

function App() {
  const { initialize } = useStore();

  useEffect(() => {
    initialize().catch(console.error);
  }, [initialize]);

  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;