import React from 'react';
import { LiveInterface } from './components/LiveInterface';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Header Section: Title and Description */}
      <header className="pt-12 pb-6 px-6 text-center z-10">
        <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">
          COLLOQUY
        </h1>
        <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
          The advanced AI voice representative for Chemeria Consultancy. 
          Professional. Articulate. Available 24/7.
        </p>
      </header>

      {/* Main Interface: The Orb and Phone Button */}
      <main className="flex-1 flex items-center justify-center">
        <LiveInterface />
      </main>

      {/* Footer Branding */}
      <footer className="pb-8 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-600">
          Powered by Gemini 2.0 Flash
        </span>
      </footer>
    </div>
  );
};

export default App;
