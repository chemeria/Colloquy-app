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
      // 1. Initialize Audio Context
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      await audioContextRef.current.resume();

      // 2. Start Microphone immediately to satisfy mobile browser requirements
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      streamRef.current = stream;

      // 3. Setup WebSocket
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus(ConnectionStatus.CONNECTED);
        
        // Send Config
        socket.send(JSON.stringify({
          setup: { 
            model: "models/gemini-2.0-flash-exp",
            generationConfig: { 
              responseModalities: ["audio"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
            }
          }
        }));

        // Start processing audio data
        const source = audioContextRef.current!.createMediaStreamSource(stream);
        const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        source.connect(processor);
        processor.connect(audioContextRef.current!.destination);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          let sum = 0;
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            sum += Math.abs(s);
          }
          setVolume({ input: sum / inputData.length, output: 0 });
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              realtimeInput: { mediaChunks: [{ 
                data: btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer))), 
                mimeType: 'audio/pcm' 
              }] }
            }));
          }
        };
      };

      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
          const base64Data = data.serverContent.modelTurn.parts[0].inlineData.data;
          const arrayBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current!.destination);
          setIsAiSpeaking(true);
          source.start();
          source.onended = () => setIsAiSpeaking(false);
        }
      };

      socket.onclose = () => setStatus(ConnectionStatus.DISCONNECTED);
      socket.onerror = () => setStatus(ConnectionStatus.ERROR);

    } catch (err) {
      console.error(err);
      setStatus(ConnectionStatus.ERROR);
    }
  }, []);

  const disconnect = useCallback(() => {
    processorRef.current?.disconnect();
    socketRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setStatus(ConnectionStatus.DISCONNECTED);
    setVolume({ input: 0, output: 0 });
  }, []);

  return { connect, disconnect, status, volume, isAiSpeaking };
};
