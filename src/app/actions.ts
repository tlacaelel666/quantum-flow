'use server';

import { analyzeCircuit } from '@/ai/flows';
import { runAcousticSimulation, runSimulation } from "@/lib/quantum-simulation";
import { SimulationResults, CircuitConfig } from '@/lib/types';

export async function getAnalysis(results: SimulationResults) {
  try {
    return await analyzeCircuit(results);
  } catch (error) {
    console.error("Error running Genkit flow:", error);
    // Provide a helpful error message for the user.
    if (error instanceof Error && error.message.includes('No model found')) {
      return "AI Analysis Error: No generative model has been configured. Please check your Genkit setup in `src/ai/genkit.ts`.";
    }
    return "An unexpected error occurred while contacting the AI service.";
  }
}

export async function getAcousticSimulation(config: CircuitConfig, audioData: number[]) {
  try {
    return await runAcousticSimulation(config, audioData);
  } catch(error) {
    console.error("Error running acoustic simulation:", error);
    throw new Error("Failed to run acoustic simulation.");
  }
}

export async function getSimulation(config: CircuitConfig) {
  try {
    return await runSimulation(config);
  } catch (error) {
    console.error("Error running simulation:", error);
    throw new Error("Failed to run simulation.");
  }
}
