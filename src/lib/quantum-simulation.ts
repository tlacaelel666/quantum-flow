import type { CircuitConfig, SimulationResults, ReferenceState } from './types';
import FFT from 'fft.js';
import { extractMLFeatures, calculateMahalanobisDistance } from './audio-features';

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
        const keys = Object.keys(counts).map(Number);
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const scaledCount = Math.round(counts[key] * scale);
            finalCounts[key] = scaledCount;
            totalScaledShots += scaledCount;
        }
        const lastKey = keys[keys.length - 1];
        if (lastKey !== undefined) {
            finalCounts[lastKey] = totalShots - totalScaledShots;
        }
    }

    const cleanedCounts: Record<number, number> = {};
    for (const key in finalCounts) {
        if (finalCounts[key] > 0) cleanedCounts[Number(key)] = finalCounts[Number(key)];
    }
    return cleanedCounts;
}


export async function runAcousticSimulation(config: CircuitConfig, audioData: { rawData: number[], pcmData: number[], referenceState: ReferenceState }): Promise<SimulationResults> {
    const logs: string[] = [];
    logs.push(`[INFO] QUOREMIND session started at ${new Date().toISOString()}`);
    logs.push(`[INFO] Starting acoustic simulation for ${config.circuit_type} circuit.`);
    logs.push(`[INFO] Configuration: ${config.num_qubits} qubits, ${config.shots} shots, noise=${config.noise_level}.`);
    
    // 1. Perform FFT on audio data
    const fftSize = Math.pow(2, Math.ceil(Math.log2(audioData.pcmData.length)));
    const f = new FFT(fftSize);
    const fftResult = f.createComplexArray();
    f.realTransform(fftResult, audioData.pcmData);
    f.completeSpectrum(fftResult);
    
    logs.push(`[INFO] Performed FFT on ${audioData.pcmData.length} audio samples (padded to ${fftSize}).`);
    
    // 2. Extract features (magnitudes)
    const magnitudes: number[] = [];
    for (let i = 0; i < fftResult.length / 2; i++) {
        const real = fftResult[i * 2];
        const imag = fftResult[i * 2 + 1];
        magnitudes.push(Math.sqrt(real * real + imag * imag));
    }

    // 3. Extract ML Features using the new advanced functions
    const rawDataUint8 = new Uint8Array(audioData.rawData.map(d => (d + 1) * 127.5));
    const sampleRate = 44100; // Assume a standard sample rate
    const mlFeatures = extractMLFeatures(magnitudes, rawDataUint8, [], sampleRate);
    
    let returnedReferenceState: ReferenceState | undefined = undefined;

    if (!audioData.referenceState.initialized) {
        // This is the calibration run
        logs.push(`[INFO] Calibrating... Storing reference audio profile.`);
        returnedReferenceState = {
            mean: mlFeatures,
            // Initialize covariance with variance (simplified)
            covariance: mlFeatures.map(() => 1), // Start with unit variance
            initialized: true
        };
        logs.push(`[DATA] Stored Mean Vector: ${JSON.stringify(returnedReferenceState.mean.map(f => f.toFixed(4)))}`);
    }

    const distance = calculateMahalanobisDistance(mlFeatures, audioData.referenceState);
    logs.push(`[INFO] Mahalanobis Distance to reference: ${distance.toFixed(4)}`);
    logs.push(`[INFO] Extracted ML Feature Vector:`);
    logs.push(`[DATA] ${JSON.stringify(mlFeatures.map(f => f.toFixed(4)))}`);
    
    // 4. Map features to quantum states
    const numStates = 1 << config.num_qubits;
    const counts: Record<number, number> = {};
    const featuresPerState = Math.floor(magnitudes.length / numStates);

    if (featuresPerState < 1) {
        logs.push(`[WARN] Not enough frequency data to map to all quantum states. Some states will have 0 probability.`);
    }

    let totalMagnitude = 0;
    for(let i = 0; i < numStates; i++) {
        let stateMagnitude = 0;
        if(featuresPerState > 0) {
          for(let j=0; j < featuresPerState; j++) {
              stateMagnitude += magnitudes[i * featuresPerState + j];
          }
        } else if (i < magnitudes.length) {
            stateMagnitude = magnitudes[i];
        }
        counts[i] = stateMagnitude;
        totalMagnitude += stateMagnitude;
    }

    logs.push(`[INFO] Mapped ${magnitudes.length} frequency bins to ${numStates} quantum states.`);

    // 5. Normalize probabilities and assign shots
    if (totalMagnitude > 0) {
        for (const state in counts) {
            counts[state] = (counts[state] / totalMagnitude) * config.shots;
        }
    }
    
    const final_counts = _normalizeCounts(counts, config.shots);
    const stats = _calculate_statistics(final_counts, config.shots);
    logs.push(`[SUCCESS] Simulation complete. Most frequent state: ${stats.most_frequent_state}.`);

    return {
        ...config,
        counts: final_counts,
        circuit_depth: 1, // Depth is not really applicable here
        statistics: stats,
        logs,
        referenceState: returnedReferenceState
    };
}


export async function runSimulation(config: CircuitConfig): Promise<SimulationResults> {
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
    // Bell state is between qubit 0 and 1, not first and last.
    // The state |11> corresponds to decimal 3.
    counts[3] = Math.round(config.shots * (p11 + (Math.random()-0.5) * 0.1 * config.noise_level));
    if (config.noise_level > 0) {
      counts[1] = Math.round(config.shots * (config.noise_level * 0.4 * Math.random()));
      counts[2] = Math.round(config.shots * (config.noise_level * 0.4 * Math.random()));
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
  } else { 
    circuit_depth = config.depth;
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
