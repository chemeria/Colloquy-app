import React from 'react';
import { LiveInterface } from './components/LiveInterface';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      <ErrorBoundary>
        <LiveInterface />
      </ErrorBoundary>
    </div>
  );
};

export default App;
