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
      // 1. Initialize Audio Context FIRST
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      await audioContextRef.current.resume();

      // 2. Open WebSocket SECOND
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        // 3. Send Setup Config IMMEDIATELY on open
        const setupMessage = {
          setup: { 
            model: "models/gemini-2.0-flash-exp",
            generationConfig: { 
              responseModalities: ["audio"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
            }
          }
        };
        socket.send(JSON.stringify(setupMessage));
      };

      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        // 4. IMPORTANT: Only start mic AFTER 'setupComplete' is received
        if (data.setupComplete) {
          setStatus(ConnectionStatus.CONNECTED);
          startMicrophone(); 
        }

        // 5. Handle Incoming Audio
        if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
          playAudio(data.serverContent.modelTurn.parts[0].inlineData.data);
        }
      };

      // Helper function to start mic ONLY after setup is done
      const startMicrophone = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
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
          
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              realtimeInput: { mediaChunks: [{ 
                data: btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer))), 
                mimeType: 'audio/pcm' 
              }] }
            }));
          }
        };
      };

      const playAudio = async (base64Data: string) => {
        const arrayBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current!.destination);
        setIsAiSpeaking(true);
        source.start();
        source.onended = () => setIsAiSpeaking(false);
      };

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
