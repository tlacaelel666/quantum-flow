'use server';

import { analyzeCircuit } from '@/ai/flows';
import { runSimulation } from "@/lib/quantum-simulation";
import { SimulationResults, CircuitConfig, AudioPayload, ReferenceState } from '@/lib/types';

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

export async function getSimulation(config: CircuitConfig, audioPayload?: AudioPayload, referenceState?: ReferenceState) {
  try {
    return await runSimulation(config, audioPayload, referenceState);
  } catch (error) {
    console.error("Error running simulation:", error);
    throw new Error("Failed to run simulation.");
  }
}
