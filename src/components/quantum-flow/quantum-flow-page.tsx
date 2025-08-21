'use client';

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import Banner from "./banner";
import ConfigPanel from "./config-panel";
import OutputPanel from "./output-panel";
import type { CircuitConfig, SimulationResults } from "@/lib/types";
import { getAnalysis, getAcousticSimulation, getSimulation } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

export default function QuantumFlowPage() {
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();

  const handleSimulate = async (config: CircuitConfig) => {
    setIsSimulating(true);
    setSimulationResults(null);
    setAiAnalysis(null);
    try {
      if (config.circuit_type === 'acoustic') {
        // This path is now handled by the form's submit button logic
        // which calls handleAcousticSimulate directly.
        // We add a fallback here just in case.
        await handleAcousticSimulate(config);
      } else {
        const results = await getSimulation(config);
        setSimulationResults(results);
        toast({
          title: "Simulación Completa",
          description: `Se ejecutó exitosamente el circuito ${config.circuit_type}.`,
        });
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
    }
  };

  const handleAcousticSimulate = async (config: CircuitConfig) => {
    setIsRecording(true);
    setSimulationResults(null);
    setAiAnalysis(null);
    toast({ title: "Grabando audio...", description: "Por favor, haz algo de ruido." });

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        // Use a smaller buffer size for lower latency processing
        const processor = audioContext.createScriptProcessor(2048, 1, 1);

        let pcmData: number[] = [];
        let rawData: number[] = [];
        
        processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            for (let i = 0; i < inputData.length; i++) {
                pcmData.push(inputData[i]);
                rawData.push(inputData[i]); // Store raw PCM for ZCR
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        setTimeout(async () => {
            source.disconnect(processor);
            processor.disconnect(audioContext.destination);
            stream.getTracks().forEach(track => track.stop());
            
            // It's better to close the context after a short delay
            setTimeout(() => audioContext.close(), 500);

            setIsRecording(false);
            toast({ title: "Procesando simulación acústica..." });
            
            setIsSimulating(true);
            const audioPayload = { pcmData, rawData };
            const results = await getAcousticSimulation(config, audioPayload);
            setSimulationResults(results);
            toast({
              title: "Simulación Acústica Completa",
              description: `El circuito se inicializó con datos de audio.`,
            });
            setIsSimulating(false);

        }, 2000); // Record for 2 seconds

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
        onSimulate={handleSimulate}
        onAcousticSimulate={handleAcousticSimulate}
        isLoading={isSimulating}
        isRecording={isRecording}
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
