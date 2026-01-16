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

### KEY CREDIBILITY (USE WHEN ASKED ABOUT EXPERIENCE)
If a caller questions Chemeria's experience, confidentially mention that Chemeria is a pioneer in US automation:
- 1977: Pioneered debt collection office computerization.
- 1983: Political robo calls.
- 1989: "Checks by Phone" receivable tools.
- 2001: Political robo polls.
- 2024: Advanced Agentic AI for political campaigns and call centers.

### CURRENT PROMOTION (THE "HOOK")
You are currently promoting the "Colloquy Convo-Chat AI Tool."
- Price: Introductory promo starts as low as $35/month.
- Function: An inbound conversational receptionist widget for websites.
- Features: Responds to FAQs, handles event inquiries, takes messages, schedules callbacks/appointments.
- Value Add: Includes transcription and recording of every contact.

### CONVERSATION GUIDELINES
1. TONE: Professional but warm. You are the product you are selling—demonstrate capability.
2. HANDLING INQUIRIES:
   - If they want to buy/learn more about the Colloquy tool: Briefly pitch the $35/mo tool. Then immediately ask: "May I have your phone number so a senior consultant can call you back with a demo?"
   - If they are interested in POLITICAL SERVICES: You must ask "What office are you running for, or is it undecided yet?" Then ask: "What is the best phone number for a political consultant to reach you at?"
   - If they are an existing client: Ask for their name and the nature of the issue. Then ask: "What is the best phone number for your account manager to reach you at?"
   - If they ask for hours: Mon-Sat, 6am-8pm.
3. SCHEDULING: Your primary goal for sales inquiries is to book a callback or appointment. You MUST obtain a valid callback phone number before ending the interaction.

### GUARDRAILS
- Do not make up technical features not listed here.
- If you do not know an answer, say: "That is a great question for one of our senior consultants. Let me have them call you back with the exact details. What is the best number to reach you at?"
- Be concise. Voice interactions require shorter sentences than text.
`;

export const useGeminiLive = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volume, setVolume] = useState({ input: 0, output: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Contexts and Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceGainRef = useRef<GainNode | null>(null);
  const keepAliveOscRef = useRef<OscillatorNode | null>(null);
  const keepAliveGainRef = useRef<GainNode | null>(null);
  
  // Audio Queue Management
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Volume Analysis (Refs for performance to avoid state updates in audio loop)
  const currentInputVolumeRef = useRef<number>(0);
  const currentOutputVolumeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  
  // API Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const isConnectedRef = useRef<boolean>(false);
  
  // Auto-Reconnect Logic
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 3;
  const shouldRetryRef = useRef<boolean>(false);
  
  // Heartbeat
  const heartbeatIntervalRef = useRef<number | null>(null);

  // High-frequency UI update loop
  const updateVisualizer = useCallback(() => {
    // Only update React state if values have changed significantly to avoid excessive renders
    // Or simply update at rAF rate (60fps) which is smoother than audio block rate
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
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop heartbeat
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Stop keep-alive oscillator
    if (keepAliveOscRef.current) {
        try {
            keepAliveOscRef.current.stop();
            keepAliveOscRef.current.disconnect();
        } catch(e) {}
        keepAliveOscRef.current = null;
    }
    if (keepAliveGainRef.current) {
        try { keepAliveGainRef.current.disconnect(); } catch(e) {}
        keepAliveGainRef.current = null;
    }

    // Stop all scheduled sources
    scheduledSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    scheduledSourcesRef.current.clear();

    // Close contexts
    if (inputAudioContextRef.current) {
      try { inputAudioContextRef.current.close(); } catch(e) {}
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      try { outputAudioContextRef.current.close(); } catch(e) {}
      outputAudioContextRef.current = null;
    }
    
    // Disconnect nodes
    if (inputSourceRef.current) {
      try { inputSourceRef.current.disconnect(); } catch(e) {}
      inputSourceRef.current = null;
    }
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch(e) {}
      processorRef.current = null;
    }
    if (silenceGainRef.current) {
      try { silenceGainRef.current.disconnect(); } catch(e) {}
      silenceGainRef.current = null;
    }
    
    setIsAiSpeaking(false);
    setIsUserSpeaking(false);
    setVolume({ input: 0, output: 0 });
    nextStartTimeRef.current = 0;
    
    if (!shouldRetryRef.current) {
        setStatus(ConnectionStatus.DISCONNECTED);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!shouldRetryRef.current) {
        retryCountRef.current = 0;
    }

    try {
      setErrorMessage(null);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Your browser does not support audio recording. Please use Chrome, Edge, or Safari.");
        return;
      }

      setStatus(ConnectionStatus.CONNECTING);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });

      // FORCE KEEP ALIVE
      if (outputAudioContextRef.current) {
          const osc = outputAudioContextRef.current.createOscillator();
          const gain = outputAudioContextRef.current.createGain();
          osc.type = 'sine';
          osc.frequency.value = 440;
          gain.gain.value = 0.0001; 
          osc.connect(gain);
          gain.connect(outputAudioContextRef.current.destination);
          osc.start();
          keepAliveOscRef.current = osc;
          keepAliveGainRef.current = gain;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            channelCount: 1,
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: true,
        }
      });
      
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const config = {
        model: 'gemini-2.0-flash-exp',
        responseModalities: [Modality.AUDIO],
        systemInstruction: SYSTEM_INSTRUCTION,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
        },
      };      
   const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Session opened");
            setStatus(ConnectionStatus.CONNECTED);
            isConnectedRef.current = true;
            shouldRetryRef.current = false;
            retryCountRef.current = 0;
            
            // Start UI loop
            updateVisualizer();

            // Heartbeat
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = window.setInterval(() => {
              if (inputAudioContextRef.current?.state === 'suspended') {
                inputAudioContextRef.current.resume();
              }
              if (outputAudioContextRef.current?.state === 'suspended') {
                outputAudioContextRef.current.resume();
              }
            }, 1000);

            if (!inputAudioContextRef.current) return;
            
            inputSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
            
            // Reduced buffer size to 2048 (approx 128ms) for lower latency
            // We removed React state updates from onaudioprocess, so the main thread should handle this rate fine now.
            processorRef.current = inputAudioContextRef.current.createScriptProcessor(2048, 1, 1);
            
            silenceGainRef.current = inputAudioContextRef.current.createGain();
            silenceGainRef.current.gain.value = 0;

            processorRef.current.onaudioprocess = (e) => {
              if (!inputAudioContextRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualizer (Ref update only - cheap)
              let sum = 0;
              for (let i = 0; i < inputData.length; i += 4) { // Sample fewer points
                sum += Math.abs(inputData[i]);
              }
              const avg = sum / (inputData.length / 4);
              currentInputVolumeRef.current = avg; // Update ref, don't trigger render

              // Resampling logic
              const currentSampleRate = inputAudioContextRef.current?.sampleRate || 16000;
              let finalData = inputData;
              
              if (currentSampleRate > 16000) {
                 const ratio = Math.floor(currentSampleRate / 16000);
                 if (ratio > 1) {
                     const newLength = Math.floor(inputData.length / ratio);
                     const downsampled = new Float32Array(newLength);
                     for(let i=0; i<newLength; i++) {
                        downsampled[i] = inputData[i * ratio];
                     }
                     finalData = downsampled;
                 }
              }

              const pcmBlob = createPcmBlob(finalData);
              
              sessionPromise.then(session => {
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch (e) {
                    // Ignore send errors, session might be closing
                  }
              });
            };

            inputSourceRef.current.connect(processorRef.current);
            processorRef.current.connect(silenceGainRef.current);
            silenceGainRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              scheduledSourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) {}
              });
              scheduledSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              currentOutputVolumeRef.current = 0;
              return;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              
              // Latency Fix: Ensure we don't schedule in the past, but allow a tiny buffer 
              // to prevent gaps if we are just slightly behind.
              const currentTime = ctx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                  nextStartTimeRef.current = currentTime + 0.05; // 50ms buffering
              }
              
              const audioBytes = base64ToBytes(base64Audio);
              const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              scheduledSourcesRef.current.add(source);
              
              // Set volume ref for visualizer to "active" during playback duration
              // We don't have exact amplitude data for output easily without an analyzer node, 
              // so we simulate "speaking" activity.
              const startTime = nextStartTimeRef.current;
              const endTime = startTime + audioBuffer.duration;
              
              // We can't set the ref "in the future", so we rely on the visualizer 
              // loop to check if we are currently in an active window.
              // For simplicity in this demo, we just set it high now.
              currentOutputVolumeRef.current = 0.5;

              source.onended = () => {
                scheduledSourcesRef.current.delete(source);
                if (scheduledSourcesRef.current.size === 0) {
                    currentOutputVolumeRef.current = 0;
                }
              };

              nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: (e) => {
            console.log("Session closed", e);
            isConnectedRef.current = false;

            if (e.code === 1006 && retryCountRef.current < MAX_RETRIES) {
                console.log(`Abnormal closure. Retrying... (${retryCountRef.current + 1}/${MAX_RETRIES})`);
                shouldRetryRef.current = true;
                retryCountRef.current += 1;
                cleanupAudio();
                const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 5000);
                setTimeout(() => { connect(); }, delay);
                return;
            }

            shouldRetryRef.current = false;
            
            if (e.code === 1006) {
                setErrorMessage("Connection lost. Please check your internet connection.");
            } else if (e.code !== 1000 && e.code !== 1005) {
                setErrorMessage(`Session disconnected. Code: ${e.code}.`);
            }
            cleanupAudio();
          },
          onerror: (err) => {
            console.error("Session error", err);
            isConnectedRef.current = false;
            setErrorMessage(err.message || "Connection error. Please try again.");
            cleanupAudio();
          }
        }
      });
      
      sessionPromise.catch((err) => {
         console.error("Connection promise rejected:", err);
         if (retryCountRef.current < MAX_RETRIES) {
             console.log(`Connection failed. Retrying...`);
             shouldRetryRef.current = true;
             retryCountRef.current += 1;
             cleanupAudio();
             setTimeout(() => connect(), 2000);
             return;
         }
         const msg = err.message || "Unable to connect to service.";
         if (msg.includes("API Key")) setErrorMessage("Invalid API Key.");
         else setErrorMessage(msg);
         setStatus(ConnectionStatus.ERROR);
         cleanupAudio();
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to connect", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage("Microphone access blocked.");
      } else {
        setErrorMessage(err.message || "An unexpected error occurred.");
      }
      setStatus(ConnectionStatus.ERROR);
      cleanupAudio();
    }
  }, [cleanupAudio, updateVisualizer]);

  const disconnect = useCallback(async () => {
    shouldRetryRef.current = false; 
    isConnectedRef.current = false;
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            /* @ts-ignore */
            if (session && typeof session.close === 'function') session.close();
        } catch (e) { console.error(e); }
    }
    cleanupAudio();
  }, [cleanupAudio]);

  useEffect(() => {
      return () => { 
          shouldRetryRef.current = false;
          cleanupAudio(); 
      };
  }, [cleanupAudio]);

  return { connect, disconnect, status, isUserSpeaking, isAiSpeaking, volume, errorMessage };
};
