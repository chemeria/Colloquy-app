import React from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { ConnectionStatus } from '../types';
import Visualizer from './Visualizer';
import { Phone, PhoneOff } from 'lucide-react';

export const LiveInterface: React.FC = () => {
  const { connect, disconnect, status, volume, isAiSpeaking } = useGeminiLive();
  const isConnected = status === ConnectionStatus.CONNECTED;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tighter text-indigo-400 mb-2">COLLOQUY</h1>
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-xs uppercase tracking-widest text-slate-500">{status}</span>
        </div>
      </div>

      <div className={`relative transition-all duration-500 ${isAiSpeaking ? 'scale-110' : 'scale-100'}`}>
        <Visualizer inputVolume={volume.input} outputVolume={volume.output} isActive={isConnected} />
      </div>

      <div className="mt-12">
        {!isConnected ? (
          <button onClick={connect} className="p-6 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-xl transition-all">
            <Phone className="w-8 h-8 fill-current" />
          </button>
        ) : (
          <button onClick={disconnect} className="p-6 rounded-full bg-red-600 hover:bg-red-500 shadow-lg transition-all">
            <PhoneOff className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  );
};
