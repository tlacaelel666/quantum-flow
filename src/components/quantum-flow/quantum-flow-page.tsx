'use client';

import { useState } from "react";
import Banner from "./banner";
import ConfigPanel from "./config-panel";
import OutputPanel from "./output-panel";
import { runSimulation } from "@/lib/quantum-simulation";
import type { CircuitConfig, SimulationResults } from "@/lib/types";
import { getAnalysis } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

export default function QuantumFlowPage() {
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();

  const handleSimulate = async (config: CircuitConfig) => {
    setIsSimulating(true);
    setSimulationResults(null);
    setAiAnalysis(null);
    try {
      const results = await runSimulation(config);
      setSimulationResults(results);
      toast({
        title: "Simulación Completa",
        description: `Se ejecutó exitosamente el circuito ${config.circuit_type}.`,
      });
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
      <ConfigPanel onSimulate={handleSimulate} isLoading={isSimulating} />
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
