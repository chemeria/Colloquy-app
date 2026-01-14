import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  inputVolume: number;
  outputVolume: number;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ inputVolume, outputVolume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const inputVolRef = useRef(inputVolume);
  const outputVolRef = useRef(outputVolume);

  useEffect(() => {
    inputVolRef.current = inputVolume;
    outputVolRef.current = outputVolume;
  }, [inputVolume, outputVolume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High-DPI (Retina) displays for sharp rendering
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      // Set actual size in memory (scaled to account for extra pixel density)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Normalize coordinate system to use css pixels
      ctx.scale(dpr, dpr);
      
      // Set visible size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    // Initial resize
    resizeCanvas();
    
    // Resize on window change
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;
    let time = 0;

    const draw = () => {
      if (!canvas || !ctx || !container) return;

      time += 0.1;
      // Use client dimensions for drawing calculations
      const width = container.clientWidth;
      const height = container.clientHeight;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Draw neutral line
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'; // Slate-400
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isActive) {
        const inVol = inputVolRef.current;
        const outVol = outputVolRef.current;
        
        const activeVol = Math.max(inVol, outVol);
        const isOutput = outVol > inVol;
        
        // Dynamic color mixing based on who is talking
        const waveColor = isOutput ? 'rgba(56, 189, 248, 0.9)' : 'rgba(168, 85, 247, 0.9)';
        const amplitude = Math.min(activeVol * (height / 2), height / 2 - 5);
        
        ctx.beginPath();
        ctx.moveTo(0, centerY);

        for (let i = 0; i < width; i++) {
          // Add some randomness/noise for a more "voice-like" waveform
          const frequency = 0.05;
          const y = centerY + Math.sin(i * frequency + time) * amplitude * Math.sin(i / width * Math.PI);
          ctx.lineTo(i, y);
        }

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = waveColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Add glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = waveColor;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isActive]);

  return (
    <div ref={containerRef} className="w-full h-32 bg-slate-950/50 rounded-xl overflow-hidden border border-slate-700/50 shadow-inner">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </div>
  );
};

export default Visualizer;