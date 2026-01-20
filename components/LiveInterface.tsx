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
    <div className="flex flex-col w-full h-[100dvh] bg-slate-950 overflow-hidden text-white">
      
      {/* 1. TABS - Now the very first thing at the top */}
      <div className="flex w-full border-b border-slate-800 bg-slate-900/50">
        <button className="flex-1 py-4 text-xs font-black tracking-widest text-indigo-400 border-b-2 border-indigo-500">
          VOICE
        </button>
        <button className="flex-1 py-4 text-xs font-black tracking-widest text-slate-500 hover:text-slate-300 transition-colors">
          CHAT
        </button>
      </div>

      {/* 2. MAIN INTERACTION ZONE */}
      <div className="flex-1 flex flex-col items-center p-4">
        
        {/* The Orb / Visualizer Area - Plenty of room now! */}
        <div className="w-full flex flex-col items-center justify-center pt-8">
          <div className="relative flex items-center justify-center w-full min-h-[180px]">
             <Visualizer 
                inputVolume={volume.input} 
                outputVolume={volume.output} 
                isActive={isConnected}
              />
          </div>
          
          {/* Minimal Status Badge */}
          <div className="mt-6 flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800">
            <div className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 
              isConnecting ? 'bg-yellow-500 animate-bounce' : 
              'bg-slate-600'
            }`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {status}
            </span>
          </div>
        </div>

        {/* 3. CENTER ACTION AREA */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {!isConnected && !isConnecting ? (
            <button 
              onClick={connect}
              className="flex items-center justify-center w-24 h-24 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.3)] transition-all active:scale-95"
            >
              <Phone className="w-10 h-10 text-white fill-current" />
              <div className="absolute inset-0 rounded-full bg-indigo-400 opacity-20 animate-ping"></div>
            </button>
          ) : (
            <button 
              onClick={disconnect}
              className="flex items-center justify-center w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 shadow-xl active:scale-95"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
          )}
          
          {/* Dynamic Message Area */}
          <div className="mt-10 h-10 text-center px-6">
            {errorMessage ? (
              <p className="text-red-400 text-[11px] bg-red-950/30 p-2 rounded border border-red-900/20">
                {errorMessage}
              </p>
            ) : isConnected && (
              <p className="text-indigo-300 text-xs font-medium tracking-wide animate-pulse italic">
                Colloquy is listening...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. MINIMAL BRAND FOOTER */}
      <div className="pb-8 pt-4 border-t border-slate-900 bg-slate-950 text-center">
        <div className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.3em]">
          Chemeria Consultancy • Est. 1973
        </div>
      </div>
    </div>
  );
