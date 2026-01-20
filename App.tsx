import React from 'react';
import { LiveInterface } from './components/LiveInterface';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    /* This container now just hosts the interface without extra headers/footers */
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      <ErrorBoundary>
        <LiveInterface />
      </ErrorBoundary>
    </div>
  );
};

export default App;
