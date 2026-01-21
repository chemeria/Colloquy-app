import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionStatus } from '../types';
import { base64ToBytes, decodeAudioData, createPcmBlob } from '../utils/audioUtils';

const SYSTEM_INSTRUCTION = `
### ROLE & IDENTITY
You are "Colloquy," the advanced AI voice representative for Chemeria Consultancy. You are helpful, professional, and articulate. Your goal is to assist callers, screen inquiries, and generate interest in Chemeria’s automation tools.

### COMPANY CONTEXT
Chemeria Consultancy is a historic conversational workflow solutions developer based in San Diego County, Southern California.
- Established: 1973.
- Clients: Businesses, non-profits, and political committees.
- Specialty: Digital sales, marketing, and Public Relations.
- Hours: Monday through Saturday, 6:00 a.m. to 8:00 p.m.

### KEY CREDIBILITY
If a caller questions Chemeria's experience, mention:
- 1977: Pioneered debt collection office computerization.
- 1983: Political robo calls.
- 1989: "Checks by Phone" receivable tools.
- 2024: Advanced Agentic AI for political campaigns and call centers.

### CURRENT PROMOTION (THE "HOOK")
You are promoting the "Colloquy Convo-Chat AI Tool" starting at $35/month. It is an inbound conversational receptionist widget for websites.

### CONVERSATION GUIDELINES
1. TONE: Professional but warm.
2. SALES: If they want the tool, ask for their phone number for a demo.
3. POLITICAL: Ask "What office are you running for?" and get their phone number.
4. SCHEDULING: Your primary goal is to obtain a valid callback phone number.

### GUARDRAILS
- Be concise. Voice interactions require shorter sentences.
- If you don't know an answer, ask for a callback number so a senior consultant can assist.
`;

export const useGeminiLive = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volume, setVolume] = useState({ input: 0, output: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceGainRef = useRef<GainNode | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputVolumeRef = useRef<number>(0);
  const currentOutputVolumeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const isConnectedRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 3;
  const shouldRetryRef = useRef<boolean>(false);
  const heartbeatIntervalRef = useRef<number | null>(null);

  const updateVisualizer = useCallback(() => {
    const inVol = currentInputVolumeRef.current;
    const outVol = currentOutputVolumeRef.current;
    
    setVolume({ input: inVol, output: outVol });
    setIsUserSpeaking(inVol > 0.01);
    setIsAiSpeaking(outVol > 0.01);

    if (isConnectedRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    isConnectedRef.current = false;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (heartbeatIntervalRef.current) window.clearInterval(heartbeatIntervalRef.current);

    scheduledSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
    scheduledSourcesRef.current.clear();

    if (inputAudioContextRef.current) { try { inputAudioContextRef.current.close(); } catch(e) {} }
    if (outputAudioContextRef.current) { try { outputAudioContextRef.current.close(); } catch(e) {} }
    
    setIsAiSpeaking(false);
    setIsUserSpeaking(false);
    setVolume({ input: 0, output: 0 });
    nextStartTimeRef.current = 0;
    
    if (!shouldRetryRef.current) setStatus(ConnectionStatus.DISCONNECTED);
  }, []);

  const connect = useCallback(async () => {
    if (!shouldRetryRef.current) retryCountRef.current = 0;

    try {
      setErrorMessage(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage("Microphone not supported in this browser.");
        return;
      }

      setStatus(ConnectionStatus.CONNECTING);
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
        
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
            console.log("Session opened");
            setStatus(ConnectionStatus.CONNECTED);
            isConnectedRef.current = true;
            updateVisualizer();

            inputSourceRef.current = inputAudioContextRef.current!.createMediaStreamSource(stream);
            processorRef.current = inputAudioContextRef.current!.createScriptProcessor(2048, 1, 1);
            silenceGainRef.current = inputAudioContextRef.current!.createGain();
            silenceGainRef.current.gain.value = 0;

            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i += 4) sum += Math.abs(inputData[i]);
              currentInputVolumeRef.current = sum / (inputData.length / 4);

              sessionPromise.then(session => {
                try { session.sendRealtimeInput({ media: createPcmBlob(inputData) }); } catch (e) {}
              });
            };

            inputSourceRef.current.connect(processorRef.current);
            processorRef.current.connect(silenceGainRef.current);
            silenceGainRef.current.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              scheduledSourcesRef.current.forEach(s => s.stop());
              scheduledSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              return;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              if (nextStartTimeRef.current < ctx.currentTime) nextStartTimeRef.current = ctx.currentTime + 0.05;
              
              const audioBuffer = await decodeAudioData(base64ToBytes(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              scheduledSourcesRef.current.add(source);
              currentOutputVolumeRef.current = 0.5;

              source.onended = () => {
                scheduledSourcesRef.current.delete(source);
                if (scheduledSourcesRef.current.size === 0) currentOutputVolumeRef.current = 0;
              };
              nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: (e) => {
            isConnectedRef.current = false;
            if (e.code === 1006 && retryCountRef.current < MAX_RETRIES) {
                shouldRetryRef.current = true;
                retryCountRef.current++;
                cleanupAudio();
                setTimeout(() => connect(), 2000);
            } else { cleanupAudio(); }
          },
          onerror: (err) => { setErrorMessage("Connection error."); cleanupAudio(); }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect.");
      setStatus(ConnectionStatus.ERROR);
      cleanupAudio();
    }
  }, [cleanupAudio, updateVisualizer]);

  const disconnect = useCallback(async () => {
    shouldRetryRef.current = false;
    if (sessionPromiseRef.current) {
        const session = await sessionPromiseRef.current;
        if (session?.close) session.close();
    }
    cleanupAudio();
  }, [cleanupAudio]);

  useEffect(() => { return () => { shouldRetryRef.current = false; cleanupAudio(); }; }, [cleanupAudio]);

  return { connect, disconnect, status, isUserSpeaking, isAiSpeaking, volume, errorMessage };
};
