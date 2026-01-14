import React, { useState } from 'react';
import { LiveInterface } from './components/LiveInterface';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Bot, FileText, X, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [showIdentity, setShowIdentity] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center relative overflow-hidden font-sans">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto p-6 flex justify-between items-center z-10 relative">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
             <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Colloquy</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">By Chemeria Consultancy</p>
          </div>
        </div>
        <div>
           <button 
             onClick={() => setShowIdentity(true)}
             className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 transition-all text-slate-400 hover:text-white group"
             aria-label="View Identity"
           >
             <FileText className="w-4 h-4" />
             <span className="text-xs font-medium">System Identity</span>
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4 z-10 relative">
        
        <div className="text-center mb-10 max-w-lg">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Voice of the Future.
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed antialiased">
            Experience our advanced conversational AI. <br className="hidden sm:block"/>
            Talk naturally. Ask about our history, our tools, or our schedule.
          </p>
        </div>

        {/* Main Interface Card */}
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl relative z-20 overflow-hidden">
          <ErrorBoundary>
            <LiveInterface />
          </ErrorBoundary>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full p-6 text-center text-slate-600 text-xs z-10 relative">
        <p>&copy; 2024 Chemeria Consultancy. All rights reserved.</p>
      </footer>

      {/* Identity Modal */}
      {showIdentity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Bot className="w-5 h-5 mr-2 text-indigo-400" />
                System Persona
              </h3>
              <button 
                onClick={() => setShowIdentity(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-slate-300 space-y-4">
              <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/30">
                <p className="font-medium text-indigo-300 mb-1">Role</p>
                <p>"Colloquy" - Advanced AI Voice Representative</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-100 flex items-center">
                  <ChevronRight className="w-4 h-4 mr-1 text-slate-500" />
                  Key Objectives
                </h4>
                <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
                  <li>Assist callers and screen inquiries</li>
                  <li>Promote "Colloquy Convo-Chat AI Tool" ($35/mo)</li>
                  <li>Book callbacks with senior consultants</li>
                  <li>Identify political candidates for campaign services</li>
                </ul>
              </div>

              <div className="space-y-3">
                 <h4 className="font-semibold text-slate-100 flex items-center">
                  <ChevronRight className="w-4 h-4 mr-1 text-slate-500" />
                  Company Data
                </h4>
                <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
                  <li>Est. 1973, San Diego County</li>
                  <li>Pioneers in automation (Debt collection, Robo-polls)</li>
                  <li>Hours: Mon-Sat, 6:00 a.m. - 8:00 p.m.</li>
                </ul>
              </div>

              <div className="mt-4 p-3 bg-slate-800 rounded text-xs text-slate-500 italic border border-slate-700">
                This context is injected into the Gemini model system instructions to govern behavior.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;