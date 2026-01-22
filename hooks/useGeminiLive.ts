import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionStatus } from '../types';
import { base64ToBytes, decodeAudioData, createPcmBlob } from '../utils/audioUtils';

const SYSTEM_INSTRUCTION = `
### ROLE
You are "Colloquy," the advanced AI voice representative for Chemeria Consultancy. You are professional and articulate.

### COMPANY CONTEXT
Chemeria Consultancy: Established 1973, San Diego. 
Specialty: Conversational workflow solutions and automation.
Hours: Mon-Sat, 6:00 a.m. to 8:00 p.m.

### GOAL
Assist callers and generate interest in the "Colloquy Convo-Chat AI Tool" ($35/month). Obtain a callback phone number for sales inquiries.
`;

export const useGeminiLive = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [volume, setVolume] = useState({ input: 0, output: 0 });
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const isConnectedRef = useRef<boolean>(false);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const cleanupAudio = useCallback(() => {
    isConnectedRef.current = false;
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    setStatus(ConnectionStatus.DISCONNECTED);
    setVolume({ input: 0, output: 0 });
  }, []);

  const connect = useCallback(async () => {
    try {
      setErrorMessage(null);
      setStatus(ConnectionStatus.CONNECTING);
      
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'models/gemini-2.0-flash-exp',
        config: {
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          generationConfig: { responseModalities: [Modality.AUDIO] },
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
        },
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            isConnectedRef.current = true;
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              setIsAiSpeaking(true);
              const audioBuffer = await decodeAudioData(base64ToBytes(base64Audio), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current.destination);
              source.start();
              source.onended = () => setIsAiSpeaking(false);
            }
          },
          onclose: () => cleanupAudio(),
          onerror: () => setStatus(ConnectionStatus.ERROR),
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      setStatus(ConnectionStatus.ERROR);
    }
  }, [cleanupAudio]);

  const disconnect = useCallback(async () => {
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      if (session?.close) session.close();
    }
    cleanupAudio();
  }, [cleanupAudio]);

  return { connect, disconnect, status, volume, isAiSpeaking, errorMessage };
};
