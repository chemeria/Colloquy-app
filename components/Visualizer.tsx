import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isConnected: boolean;
  volume: number;
  analyzer: AnalyserNode | null;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isConnected, volume, analyzer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !isConnected) return;
    // Animation logic stays here...
  }, [isConnected, volume]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* The Animated Orb Background */}
      <div className={`absolute inset-0 rounded-full transition-all duration-500 blur-xl ${
        isConnected ? 'bg-blue-500/20 scale-110' : 'bg-slate-800/10 scale-90'
      }`} />
      
      {/* The Core Orb */}
      <div 
        style={{ transform: `scale(${1 + volume * 1.5})` }}
        className={`w-32 h-32 rounded-full border-2 transition-colors duration-300 flex items-center justify-center ${
          isConnected ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 bg-slate-900'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
      </div>
    </div>
  );
};
