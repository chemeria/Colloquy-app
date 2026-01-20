import React, { useState } from 'react';
import { Visualizer } from './Visualizer';
import { useGeminiLive } from '../hooks/useGeminiLive';

export const LiveInterface: React.FC = () => {
  const { connected, connect, disconnect, volume, analyzer } = useGeminiLive();
  const [activeTab, setActiveTab] = useState<'voice' | 'info'>('voice');

  return (
    <div className="flex flex-col h-[100dvh] text-white font-sans bg-slate-950">
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
            <div className="w-full max-w-md aspect-square flex items-center justify-center p-8">
              <Visualizer isConnected={connected} volume={volume} analyzer={analyzer} />
            </div>
            
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
              Strategic consulting for political, business, and non-profit sectors.
            </p>
          </div>
        )}
      </div>

      {/* Control Footer - Buttons moved directly here to avoid "Could Not Resolve" errors */}
      <div className="p-8 pb-12 bg-gradient-to-t from-slate-950 to-transparent flex justify-center">
        {!connected ? (
          <button 
            onClick={connect}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20"
          >
            START CONSULTATION
          </button>
        ) : (
          <button 
            onClick={disconnect}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-red-500/20"
          >
            END SESSION
          </button>
        )}
      </div>
    </div>
  );
};
