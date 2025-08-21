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
        title: "Simulation Complete",
        description: `Successfully ran ${config.circuit_type} circuit.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Simulation Failed",
        description: "An error occurred during the simulation.",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!simulationResults) {
      toast({
        variant: "destructive",
        title: "No Results",
        description: "Please run a simulation before requesting analysis.",
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const analysis = await getAnalysis(simulationResults);
      setAiAnalysis(analysis);
      toast({
        title: "AI Analysis Complete",
        description: "Suggestions are available in the AI Analysis tab.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "AI Analysis Failed",
        description: "Could not get analysis from the AI model.",
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
