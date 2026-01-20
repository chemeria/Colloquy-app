import React, { useState } from 'react';
import { Visualizer } from './Visualizer';
import { Controls } from './Controls';
import { useGeminiLive } from '../hooks/useGeminiLive';

export const LiveInterface: React.FC = () => {
  const { connected, connect, disconnect, volume, analyzer } = useGeminiLive();
  const [activeTab, setActiveTab] = useState<'voice' | 'info'>('voice');

  return (
    <div className="flex flex-col h-[100dvh] text-white font-sans">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/50">
        <button 
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'voice' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
        >
          AI CONSULTANT
        </button>
        <button 
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'info' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
        >
          ABOUT CHEMERIA
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
        {activeTab === 'voice' ? (
          <>
            {/* The Orb/Visualizer */}
            <div className="w-full max-w-md aspect-square flex items-center justify-center p-8">
              <Visualizer isConnected={connected} volume={volume} analyzer={analyzer} />
            </div>
            
            {/* Status Indicator */}
            <div className="mt-4 text-center">
              <div className={`text-xs uppercase tracking-widest mb-2 ${connected ? 'text-blue-400' : 'text-slate-500'}`}>
                {connected ? 'Line Active' : 'System Ready'}
              </div>
              <h2 className="text-xl font-light">
                {connected ? 'Chemeria AI is Listening' : 'Secure Voice Channel'}
              </h2>
            </div>
          </>
        ) : (
          <div className="p-8 max-w-md text-center">
            <h3 className="text-blue-400 font-semibold mb-2">Chemeria Consultancy</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              We specialize in strategic consulting for political, business, and non-profit sectors. 
              Speak to our AI agent to schedule a follow-up or learn about our services.
            </p>
          </div>
        )}
      </div>

      {/* Control Footer */}
      <div className="p-8 pb-12 bg-gradient-to-t from-slate-950 to-transparent">
        <Controls 
          connected={connected} 
          onConnect={connect} 
          onDisconnect={disconnect} 
        />
      </div>
    </div>
  );
};
