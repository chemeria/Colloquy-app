import { useState, useRef, useCallback } from 'react';
import { ConnectionStatus } from '../types';

export const useGeminiLive = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [volume, setVolume] = useState({ input: 0, output: 0 });
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const connect = useCallback(async () => {
    setStatus(ConnectionStatus.CONNECTING);
    
    try {
      // 1. FORCE RESET AUDIO CONTEXT
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      
      // 2. GET MIC WITH SPECIFIC MOBILE CONSTRAINTS
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // 3. RESUME AFTER USER GESTURE
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus(ConnectionStatus.CONNECTED);
        socket.send(JSON.stringify({
          setup: { 
            model: "models/gemini-2.0-flash-exp",
            generationConfig: { responseModalities: ["audio"] }
          }
        }));

        // WIRING THE MIC TO THE SOCKET
        const source = audioContextRef.current!.createMediaStreamSource(stream);
        const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(audioContextRef.current!.destination);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // VOLUME CALCULATION (This makes the line wiggle)
          let sum = 0;
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            sum += Math.abs(s);
          }
          
          const avgVolume = sum / inputData.length;
          setVolume({ input: avgVolume, output: 0 });

          if (socket.readyState === WebSocket.OPEN && avgVolume > 0.001) {
            const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
            socket.send(JSON.stringify({
              realtimeInput: { mediaChunks: [{ data: base64, mimeType: 'audio/pcm' }] }
            }));
          }
        };
      };

      socket.onmessage = (event) => {
        // AI Voice logic here
        setIsAiSpeaking(true);
      };

    } catch (err) {
      console.error("Connection Error:", err);
      setStatus(ConnectionStatus.ERROR);
    }
  }, []);

  const disconnect = useCallback(() => {
    processorRef.current?.disconnect();
    socketRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setStatus(ConnectionStatus.DISCONNECTED);
    setVolume({ input: 0, output: 0 });
    setIsAiSpeaking(false);
  }, []);

  return { connect, disconnect, status, volume, isAiSpeaking };
};
