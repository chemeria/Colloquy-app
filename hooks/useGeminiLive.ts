import { useState, useRef, useCallback } from 'react';
import { ConnectionStatus } from '../types';

export const useGeminiLive = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [volume, setVolume] = useState({ input: 0, output: 0 });
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const connect = useCallback(async () => {
    setStatus(ConnectionStatus.CONNECTING);
    
    try {
      // 1. Initialize Audio and FORCE RESUME for Mobile
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // 2. Capture Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // 3. Setup WebSocket (Ensure your API Key is in .env)
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus(ConnectionStatus.CONNECTED);
        // Send initial setup config here
        const setupMessage = {
          setup: { model: "models/gemini-2.0-flash-exp" }
        };
        socket.send(JSON.stringify(setupMessage));
      };

      socket.onmessage = async (event) => {
        // This handles the incoming AI voice and moves the waveform
        const data = JSON.parse(event.data);
        if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
          setIsAiSpeaking(true);
          // Logic to play audio and setVolume.output goes here
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket Error:", error);
        setStatus(ConnectionStatus.ERROR);
      };

    } catch (err) {
      console.error("Connection failed:", err);
      setStatus(ConnectionStatus.ERROR);
    }
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setStatus(ConnectionStatus.DISCONNECTED);
    setIsAiSpeaking(false);
    setVolume({ input: 0, output: 0 });
  }, []);

  return { connect, disconnect, status, volume, isAiSpeaking };
};
