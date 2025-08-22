'use client';

import React, { useState, useRef } from "react";
import Banner from "./banner";
import ConfigPanel from "./config-panel";
import OutputPanel from "./output-panel";
import type { CircuitConfig, SimulationResults, ReferenceState, AudioPayload } from "@/lib/types";
import { getAnalysis, getSimulation } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { FEATURE_VECTOR_SIZE } from "@/lib/audio-features";

export default function QuantumFlowPage() {
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();

  // State for acoustic calibration
  const [isCalibrating, setIsCalibrating] = useState(false);
  const referenceState = useRef<ReferenceState>({
      mean: Array(FEATURE_VECTOR_SIZE).fill(0),
      covariance: Array(FEATURE_VECTOR_SIZE).fill(0).map(() => Array(FEATURE_VECTOR_SIZE).fill(0)),
      initialized: false,
  });

  const handleSimulate = async (config: CircuitConfig, audioPayload?: AudioPayload, refState?: ReferenceState) => {
    setIsSimulating(true);
    // Only clear previous results if it's not a calibration run
    if (!refState || refState.initialized) {
        setSimulationResults(null);
    }
    setAiAnalysis(null);
    
    try {
      const results = await getSimulation(config, audioPayload, refState);
      
      // If a reference state was returned, it was a calibration run.
      if (results.referenceState) {
        referenceState.current = results.referenceState;
        toast({
          title: "Calibración Completa",
          description: `El perfil de ruido de fondo ha sido creado. Ahora puedes grabar para simular.`,
        });
      } else {
        // This was a regular simulation run.
        setSimulationResults(results);
        if (config.circuit_type === 'acoustic') {
           toast({
            title: "Simulación Acústica Completa",
            description: `El circuito se inicializó con datos de audio.`,
          });
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Falló la Simulación",
        description: "Ocurrió un error durante la simulación.",
      });
    } finally {
      setIsSimulating(false);
      setIsRecording(false);
      setIsCalibrating(false);
    }
  };
  
  const handleAcousticSimulate = (config: CircuitConfig) => {
    if (!referenceState.current.initialized) {
        handleCalibration(config);
    } else {
        handleRecording(config);
    }
  };

  const captureAudio = (): Promise<AudioPayload> => {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        const pcmData: number[] = [];
        
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            for (let i = 0; i < inputData.length; i++) {
                pcmData.push(inputData[i]);
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        setTimeout(() => {
            source.disconnect();
            processor.disconnect();
            stream.getTracks().forEach(track => track.stop());
            const rawData = new Uint8Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
              rawData[i] = Math.max(0, Math.min(255, (pcmData[i] + 1) * 127.5));
            }
            setTimeout(() => audioContext.close(), 500);
            resolve({ pcmData, rawData });
        }, 2000); // Record for 2 seconds
      } catch(error) {
        reject(error);
      }
    });
  };

  const handleCalibration = async (config: CircuitConfig) => {
    setIsCalibrating(true);
    toast({ title: "Calibrando Micrófono...", description: "Por favor, mantente en silencio. Grabando ruido de fondo." });
    
    try {
        const audioPayload = await captureAudio();
        setIsCalibrating(false);
        toast({ title: "Procesando Calibración..."});
        // Pass a non-initialized reference state to signal a calibration run
        await handleSimulate(config, audioPayload, { ...referenceState.current, initialized: false });
    } catch(error) {
        console.error("Error during calibration:", error);
        toast({
            variant: "destructive",
            title: "Falló la Calibración del Micrófono",
            description: "No se pudo acceder al micrófono. Por favor, comprueba los permisos.",
        });
        setIsCalibrating(false);
        setIsSimulating(false);
    }
  };
  
  const handleRecording = async (config: CircuitConfig) => {
    setIsRecording(true);
    setSimulationResults(null);
    setAiAnalysis(null);
    toast({ title: "Grabando audio...", description: "Por favor, haz algo de ruido durante 2 segundos." });

    try {
        const audioPayload = await captureAudio();
        setIsRecording(false);
        toast({ title: "Procesando simulación acústica..." });
        // Pass the fully initialized reference state for the main simulation
        await handleSimulate(config, audioPayload, referenceState.current);
    } catch (error) {
        console.error("Error capturing audio:", error);
        toast({
            variant: "destructive",
            title: "Falló la Captura de Audio",
            description: "No se pudo acceder al micrófono. Por favor, comprueba los permisos.",
        });
        setIsRecording(false);
        setIsSimulating(false);
    }
  };


  const handleAnalyze = async () => {
    if (!simulationResults) {
      toast({
        variant: "destructive",
        title: "No Hay Resultados",
        description: "Por favor, ejecuta una simulación antes de solicitar un análisis.",
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const analysis = await getAnalysis(simulationResults);
      setAiAnalysis(analysis);
      toast({
        title: "Análisis con IA Completo",
        description: "Las sugerencias están disponibles en la pestaña de Análisis de IA.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Falló el Análisis con IA",
        description: "No se pudo obtener el análisis del modelo de IA.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Banner />
      <ConfigPanel 
        onSimulate={(config) => handleSimulate(config)}
        onAcousticSimulate={handleAcousticSimulate}
        isLoading={isSimulating}
        isRecording={isRecording}
        isCalibrating={isCalibrating}
        isCalibrated={referenceState.current.initialized}
      />
      <OutputPanel 
        results={simulationResults}
        aiAnalysis={aiAnalysis}
        isAiLoading={isAiLoading}
        onAnalyze={handleAnalyze}
        isSimulating={isSimulating}
      />
    </div>
  );
}
