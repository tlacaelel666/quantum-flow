
import type { CircuitConfig, SimulationResults, ReferenceState, AudioPayload } from './types';
import FFT from 'fft.js';
import { extractFeaturesFromMagnitudes, findSimilarPattern } from './audio-features';


function _calculate_statistics(counts: Record<number, number>, shots: number) {
  const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
  if (total === 0) {
    return {
      entropy: 0,
      most_frequent_state: 0,
      number_of_unique_states: 0,
      distribution_uniformity: 0
    };
  }
  const probabilities = Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, v / total])
  );
  
  const entropy = -Object.values(probabilities).reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0);
  
  const most_frequent_entry = Object.entries(counts).reduce((max, entry) => entry[1] > max[1] ? entry : max, [0, 0]);
  
  const numUniqueStates = Object.keys(counts).length;
  return {
    entropy: entropy,
    most_frequent_state: Number(most_frequent_entry[0]),
    number_of_unique_states: numUniqueStates,
    distribution_uniformity: numUniqueStates > 1 ? entropy / Math.log2(numUniqueStates) : 1
  };
}

function _normalizeCounts(counts: Record<number, number>, totalShots: number): Record<number, number> {
    let currentTotal = Object.values(counts).reduce((s, c) => s + c, 0);
    const finalCounts: Record<number, number> = {};
    if (currentTotal > 0) {
        const scale = totalShots / currentTotal;
        let totalScaledShots = 0;
        const keys = Object.keys(counts).map(Number).sort((a,b) => counts[b] - counts[a]); // Sort for precision
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const scaledCount = Math.round(counts[key] * scale);
            finalCounts[key] = scaledCount;
            totalScaledShots += scaledCount;
        }
        const lastKey = keys[keys.length - 1];
        if (lastKey !== undefined && totalShots > totalScaledShots) {
            finalCounts[lastKey] = totalShots - totalScaledShots;
        } else if (totalShots > totalScaledShots) {
            // If last key was 0 and we still have shots, distribute them somewhere
            const firstKey = keys[0];
            if (firstKey !== undefined) {
                 finalCounts[firstKey] = (finalCounts[firstKey] || 0) + (totalShots - totalScaledShots);
            }
        }
    }

    const cleanedCounts: Record<number, number> = {};
    for (const key in finalCounts) {
        if (finalCounts[key] > 0) cleanedCounts[Number(key)] = finalCounts[Number(key)];
    }
    return cleanedCounts;
}

async function _runAcousticProcessing(config: CircuitConfig, audioData: AudioPayload, logs: string[]): Promise<{ initialState: Record<number, number>}> {
    logs.push(`[INFO] Starting acoustic processing with pattern matching.`);
    
    const fftSize = Math.pow(2, Math.ceil(Math.log2(audioData.pcmData.length)));
    const f = new FFT(fftSize);
    const fftResult = f.createComplexArray();
    f.realTransform(fftResult, audioData.pcmData);
    f.completeSpectrum(fftResult);
    
    logs.push(`[INFO] Performed FFT on ${audioData.pcmData.length} audio samples (padded to ${fftSize}).`);
    
    const magnitudes: number[] = [];
    for (let i = 0; i < fftResult.length / 2; i++) {
        const real = fftResult[i * 2];
        const imag = fftResult[i * 2 + 1];
        magnitudes.push(Math.sqrt(real * real + imag * imag));
    }

    const inputFeatures = extractFeaturesFromMagnitudes(magnitudes);
    logs.push(`[DATA] Extracted live audio feature vector: ${JSON.stringify(inputFeatures.map(f=>f.toFixed(3)))}`);

    const matchResult = findSimilarPattern(inputFeatures);
    
    const initialState: Record<number, number> = {};
    
    if (matchResult) {
        logs.push(`[INFO] Found similar pattern with similarity ${matchResult.similarity.toFixed(4)}.`);
        matchResult.pattern.quantum_states.forEach(state => {
            const stateIndex = parseInt(state.qubit_state, 2);
            initialState[stateIndex] = state.amplitude;
        });
        logs.push(`[INFO] Initializing quantum state based on matched pattern's amplitudes.`);
    } else {
        logs.push(`[WARN] No similar pattern found. Using direct magnitudes.`);
        const numStates = 1 << config.num_qubits;
        magnitudes.slice(0, numStates).forEach((mag, i) => {
            initialState[i] = mag;
        });
    }

    return { initialState };
}


export async function runSimulation(config: CircuitConfig, audioPayload?: AudioPayload, referenceState?: ReferenceState): Promise<SimulationResults> {
  await new Promise(res => setTimeout(res, 1000 + Math.random() * 1500));

  const logs: string[] = [];
  logs.push(`[INFO] QUOREMIND session started at ${new Date().toISOString()}`);
  logs.push(`[INFO] Starting simulation for ${config.circuit_type} circuit.`);
  logs.push(`[INFO] Configuration: ${config.num_qubits} qubits, ${config.shots} shots, noise=${config.noise_level}.`);

  const counts: Record<number, number> = {};
  let circuit_depth = config.depth;

  if (config.circuit_type === 'bell' && config.num_qubits >= 2) {
    circuit_depth = 2;
    const p00 = 0.5 - config.noise_level * 0.4;
    const p11 = 0.5 - config.noise_level * 0.4;
    counts[0] = Math.round(config.shots * (p00 + (Math.random()-0.5) * 0.1 * config.noise_level));
    const last_qubit_state = 1 << (config.num_qubits - 1);
    const bell_state = 1 | last_qubit_state;
    counts[bell_state] = Math.round(config.shots * (p11 + (Math.random()-0.5) * 0.1 * config.noise_level));
    if (config.noise_level > 0) {
      counts[1] = Math.round(config.shots * (config.noise_level * 0.4 * Math.random()));
      counts[last_qubit_state] = Math.round(config.shots * (config.noise_level * 0.4 * Math.random()));
    }
  } else if (config.circuit_type === 'ghz' && config.num_qubits > 0) {
    circuit_depth = config.num_qubits;
    const p_ideal = 0.5 - config.noise_level * 0.4;
    counts[0] = Math.round(config.shots * p_ideal);
    const all_ones_state = (1 << config.num_qubits) - 1;
    counts[all_ones_state] = Math.round(config.shots * p_ideal);
    const remaining_shots = config.shots - (counts[0] + (counts[all_ones_state] || 0) );
    if (remaining_shots > 0 && config.noise_level > 0.01) {
       for(let i=0; i < Math.min(remaining_shots, 5); i++) {
        const noisy_state = Math.floor(Math.random() * ((1 << config.num_qubits) - 2)) + 1;
        counts[noisy_state] = (counts[noisy_state] || 0) + Math.round(remaining_shots / 5);
      }
    }
  } else if (config.circuit_type === 'qft' || config.circuit_type === 'acoustic') {
    circuit_depth = config.num_qubits;
    let initialState: Record<number, number> = {}; 

    if (config.circuit_type === 'acoustic' && audioPayload) {
        const acousticResult = await _runAcousticProcessing(config, audioPayload, logs);
        initialState = acousticResult.initialState;
    } else { // QFT
        const num_possible_states = 1 << config.num_qubits;
        for (let i = 0; i < num_possible_states; i++) {
            initialState[i] = 1; // Equal amplitude for QFT
        }
    }

    const totalInitialMagnitude = Object.values(initialState).reduce((sum, val) => sum + val, 0);
    
    if (totalInitialMagnitude > 0) {
        for (const state in initialState) {
            const probability = initialState[state] / totalInitialMagnitude;
            const noise_effect = (Math.random() - 0.5) * probability * config.noise_level;
            const final_prob = Math.max(0, probability + noise_effect);
            counts[state] = (counts[state] || 0) + Math.round(final_prob * config.shots);
        }
    } else { // Handle case with no audio input or all-zero initial state
         const num_possible_states = 1 << config.num_qubits;
         const shots_per_state = config.shots / num_possible_states;
         for (let i = 0; i < num_possible_states; i++) {
            counts[i] = Math.round(shots_per_state);
        }
    }

  } else { 
    circuit_depth = config.depth; // random circuit
    let remaining_shots = config.shots;
    const num_possible_states = 1 << config.num_qubits;
    const num_states_to_gen = Math.min(num_possible_states, Math.floor(10 + config.shots / 100));
    for (let i = 0; i < num_states_to_gen && remaining_shots > 0; i++) {
      const state = Math.floor(Math.random() * num_possible_states);
      const count = Math.min(remaining_shots, Math.floor(Math.random() * (config.shots / num_states_to_gen) * 2));
      counts[state] = (counts[state] || 0) + count;
      remaining_shots -= count;
    }
    if (remaining_shots > 0) {
       const state = Math.floor(Math.random() * num_possible_states);
       counts[state] = (counts[state] || 0) + remaining_shots;
    }
  }
  
  logs.push(`[INFO] Circuit created with depth ${circuit_depth}.`);
  if(config.noise_level > 0) {
    logs.push(`[WARN] Applied noise level of ${config.noise_level}.`);
  }
  
  const final_counts = _normalizeCounts(counts, config.shots);
  const stats = _calculate_statistics(final_counts, config.shots);
  logs.push(`[SUCCESS] Simulation complete. Most frequent state: ${stats.most_frequent_state}.`);

  return {
    ...config,
    counts: final_counts,
    circuit_depth,
    statistics: stats,
    logs,
  };
}
