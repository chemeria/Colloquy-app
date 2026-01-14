import React from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { ConnectionStatus } from '../types';
import Visualizer from './Visualizer';
import { Mic, MicOff, Phone, PhoneOff, Loader2, AlertCircle } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-6 space-y-8">
      
      {/* Status Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 
          isConnecting ? 'bg-yellow-500 animate-bounce' : 
          'bg-slate-500'
        }`} />
        <span className="text-slate-300 font-medium uppercase tracking-wider text-sm">
          {status === ConnectionStatus.CONNECTED ? 'Live Connection' : 
           status === ConnectionStatus.CONNECTING ? 'Connecting...' : 
           'Ready to Connect'}
        </span>
      </div>

      {/* Visualizer Area */}
      <Visualizer 
        inputVolume={volume.input} 
        outputVolume={volume.output} 
        isActive={isConnected}
      />

      {/* Controls */}
      <div className="flex flex-col items-center space-y-4 w-full">
        {!isConnected && !isConnecting ? (
          <button 
            onClick={connect}
            className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-500 transition-all duration-300 shadow-lg hover:shadow-indigo-500/50"
          >
            <Phone className="w-8 h-8 text-white fill-current" />
            <span className="absolute -bottom-8 text-sm text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Start Call
            </span>
            <span className="absolute inset-0 rounded-full bg-indigo-400 opacity-20 animate-ping"></span>
          </button>
        ) : (
          <div className="flex items-center space-x-6">
             <button 
              onClick={disconnect}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 transition-all duration-300 shadow-lg hover:shadow-red-500/50"
             >
               <PhoneOff className="w-6 h-6 text-white" />
             </button>
          </div>
        )}
      </div>

      {/* Info / Errors */}
      <div className="min-h-[3rem] w-full flex items-center justify-center">
        {errorMessage && (
           <div className="flex items-start text-left text-red-400 text-sm bg-red-900/20 px-4 py-3 rounded-lg border border-red-900/50 w-full">
             <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
             <span>{errorMessage}</span>
           </div>
        )}
        {isConnecting && !errorMessage && (
          <div className="flex items-center text-indigo-400 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Establishing secure line to Chemeria...
          </div>
        )}
        {isConnected && !errorMessage && (
          <p className="text-slate-500 text-sm">
            Speaking with <span className="text-indigo-400 font-semibold">Colloquy</span>
          </p>
        )}
      </div>

      <div className="text-xs text-slate-600 max-w-xs text-center leading-relaxed">
        Chemeria Consultancy • Est. 1973 <br/>
        Conversational Workflow Solutions
      </div>
    </div>
  );
};