import React from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { ConnectionStatus } from '../types';
import Visualizer from './Visualizer';
import { Phone, PhoneOff, AlertCircle } from 'lucide-react';

export const LiveInterface: React.FC = () => {
  const { 
    connect, 
    disconnect, 
    status, 
    volume, 
    errorMessage 
  } = useGeminiLive();

  const isConnected = status === ConnectionStatus.CONNECTED;
  const isConnecting = status === ConnectionStatus.CONNECTING;

  return (
    /* 1. THE MASTER WRAPPER - Fixes the "Bleeding" on Mobile */
    <div className="flex flex-col w-full h-[100dvh] bg-slate-950 overflow-hidden text-white">
      
      {/* 2. PRIORITY #3: THE TABS */}
      <div className="flex w-full border-b border-slate-800 bg-slate-900/50">
        <button className="flex-1 py-4 text-xs font-black tracking-widest text-indigo-400 border-b-2 border-indigo-500">
          VOICE
        </button>
        <button className="flex-1 py-4 text-xs font-black tracking-widest text-slate-500 hover:text-slate-300 transition-colors">
          CHAT
        </button>
      </div>

      {/* 3. MAIN INTERACTION AREA - Priority #2: Centered & Reduced Size */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        
        {/* Connection Status Badge */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 
            isConnecting ? 'bg-yellow-500 animate-bounce' : 
            'bg-slate-600'
          }`} />
          <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
            {status}
          </span>
        </div>

        {/* Visualizer - Reduced size to prevent bleed */}
        <div className="w-full max-h-[30dvh] flex items-center justify-center scale-90 sm:scale-100">
          <Visualizer 
            inputVolume={volume.input} 
            outputVolume={volume.output} 
            isActive={isConnected}
          />
        </div>

        {/* Call Controls */}
        <div className="relative">
          {!isConnected && !isConnecting ? (
            <button 
              onClick={connect}
              className="flex items-center justify-center w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all active:scale-95"
            >
              <Phone className="w-8 h-8 text-white fill-current" />
              <div className="absolute inset-0 rounded-full bg-indigo-400 opacity-20 animate-ping"></div>
            </button>
          ) : (
            <button 
              onClick={disconnect}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 shadow-lg active:scale-95"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        {/* Info & Errors */}
        <div className="h-12 flex items-center justify-center w-full px-4 text-center">
          {errorMessage ? (
            <p className="text-red-400 text-xs flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" /> {errorMessage}
            </p>
          ) : isConnected ? (
            <p className="text-indigo-300 text-xs font-medium animate-pulse">
              Colloquy is listening...
            </p>
          ) : null}
        </div>
      </div>

      {/* 4. BRAND FOOTER - Locked to bottom */}
      <div className="pb-8 pt-4 border-t border-slate-900 bg-slate-950/80 backdrop-blur-sm text-center">
        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          Chemeria Consultancy • Est. 1973
        </div>
      </div>
    </div>
  );
};
