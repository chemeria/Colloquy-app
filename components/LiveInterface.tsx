import React from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { ConnectionStatus } from '../types';
import Visualizer from './Visualizer';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';

export const LiveInterface: React.FC = () => {
  const { connect, disconnect, status, volume, isAiSpeaking } = useGeminiLive();
  const isConnected = status === ConnectionStatus.CONNECTED;

  return (
    <div className="w-full p-8 flex flex-col items-center">
      {/* Connection Status Badge */}
      <div className="mb-8 flex items-center space-x-2 bg-slate-900/50 px-4 py-1.5 rounded-full border border-slate-700">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{status}</span>
      </div>

      {/* The Visualizer Box */}
      <div className="w-full mb-10">
         <Visualizer inputVolume={volume.input} outputVolume={volume.output} isActive={isConnected} />
      </div>

      {/* THE BLUE ORB / PHONE BUTTON */}
      <div className="relative group">
        {/* Outer Glow Effect */}
        <div className={`absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`} />
        
        {!isConnected ? (
          <button
            onClick={connect}
            className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] transition-all transform hover:scale-105 active:scale-95 z-10"
          >
            <Phone className="w-10 h-10 text-white fill-current" />
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.4)] transition-all transform active:scale-95 z-10"
          >
            <PhoneOff className="w-10 h-10 text-white" />
          </button>
        )}
      </div>

      <p className="mt-8 text-slate-500 text-xs font-medium uppercase tracking-tighter">
        {isConnected ? "Connection Active" : "Click to Start Consultation"}
      </p>
    </div>
  );
};
