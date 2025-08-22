
import type { CircuitConfig, SimulationResults, ReferenceState, AudioPayload } from './types';
import FFT from 'fft.js';
import { extractFeaturesFromMagnitudes, findSimilarPattern, extractMLFeatures, calculateMahalanobisDistance, FEATURE_VECTOR_SIZE } from './audio-features';

let previousAmplitudes: number[] = [];

function _calculate_statistics(counts: Record<number, number>, shots: number) {
  const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
  if (total === 0) {
    return {
      entropy: 0,
      most_frequent_state: 0,
      number_of_unique_states: 0,
      distribution_uniformity: 0,
      mahalanobis_distance: 0,
      spectral_flux: 0,
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
    distribution_uniformity: numUniqueStates > 1 ? entropy / Math.log2(numUniqueStates) : 1,
    mahalanobis_distance: 0, // Placeholder, calculated in acoustic sim
    spectral_flux: 0, // Placeholder, calculated in acoustic sim
  };
}

function _normalizeCounts(counts: Record<number, number>, totalShots: number): Record<number, number> {
    let currentTotal = Object.values(counts).reduce((s, c) => s + c, 0);
    const finalCounts: Record<number, number> = {};
    if (currentTotal > 0) {
        const scale = totalShots / currentTotal;
        let totalScaledShots = 0;
        const keys = Object.keys(counts).map(Number).sort((a,b) => counts[b] - counts[a]); // Sort for precision
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const scaledCount = i === keys.length - 1 
                ? totalShots - totalScaledShots 
                : Math.round(counts[key] * scale);
            finalCounts[key] = scaledCount;
            totalScaledShots += scaledCount;
        }
    } else if (totalShots > 0) {
        // If no counts, distribute shots to state 0 as a fallback
        finalCounts[0] = totalShots;
    }

    const cleanedCounts: Record<number, number> = {};
    for (const key in finalCounts) {
        if (finalCounts[key] > 0) cleanedCounts[Number(key)] = finalCounts[Number(key)];
    }
    return cleanedCounts;
}

async function _runAcousticProcessing(
  config: CircuitConfig, 
  audioData: AudioPayload, 
  referenceState: ReferenceState,
  logs: string[]
): Promise<{ 
  initialState?: Record<number, number>, 
  mahalanobis_distance?: number,
  spectral_flux?: number,
  newReferenceState?: ReferenceState 
}> {
    logs.push(`[INFO] Starting acoustic processing. Reference initialized: ${referenceState.initialized}`);
    
    const fftSize = Math.pow(2, Math.ceil(Math.log2(audioData.pcmData.length)));
    const f = new FFT(fftSize);
    const fftResult = f.createComplexArray();
    // Ensure data is in a typed array for the FFT library
    const pcmTypedArray = new Float32Array(audioData.pcmData);
    f.realTransform(fftResult, pcmTypedArray);
    f.completeSpectrum(fftResult);
    
    logs.push(`[INFO] Performed FFT on ${audioData.pcmData.length} audio samples (padded to ${fftSize}).`);
    
    const magnitudes: number[] = [];
    for (let i = 0; i < fftResult.length / 2; i++) {
        const real = fftResult[i * 2];
        const imag = fftResult[i * 2 + 1];
        magnitudes.push(Math.sqrt(real * real + imag * imag));
    }

    const features = extractMLFeatures(magnitudes, audioData.rawData, previousAmplitudes, 44100);
    logs.push(`[DATA] Feature Vector: ${JSON.stringify(features.map(feat => feat.toFixed(4)))}`);

    if (!referenceState.initialized) {
        logs.push('[INFO] This is a calibration run. Calculating reference state...');
        const mean = features;
        // Simplified covariance: variance of each feature, assuming independence
        const covariance: number[][] = Array(FEATURE_VECTOR_SIZE).fill(0).map(() => Array(FEATURE_VECTOR_SIZE).fill(0));
        features.forEach((feature, i) => {
            // During calibration, variance is 0, add small epsilon for stability
            covariance[i][i] = 1e-6; 
        });

        const newReferenceState: ReferenceState = {
            mean,
            covariance,
            initialized: true
        };
        logs.push(`[SUCCESS] Calibration complete. Mean vector established.`);
        previousAmplitudes = magnitudes;
        return { newReferenceState };
    }

    // This is a simulation run, use the reference state
    const mahalanobis_distance = calculateMahalanobisDistance(features, referenceState);
    logs.push(`[DATA] Mahalanobis Distance: ${mahalanobis_distance.toFixed(4)}`);
    
    const spectral_flux = features[2]; // Index 2 is spectral flux from extractMLFeatures
    logs.push(`[DATA] Spectral Flux: ${spectral_flux.toFixed(4)}`);

    const inputFeatures = extractFeaturesFromMagnitudes(magnitudes);
    logs.push(`[DATA] Extracted live audio feature vector (for pattern matching): ${JSON.stringify(inputFeatures.map(f=>f.toFixed(3)))}`);

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

    previousAmplitudes = magnitudes; // Update for next flux calculation

    return { initialState, mahalanobis_distance, spectral_flux };
}


export async function runSimulation(config: CircuitConfig, audioPayload?: AudioPayload, referenceState?: ReferenceState): Promise<SimulationResults> {
  await new Promise(res => setTimeout(res, 1000 + Math.random() * 1500));

  const logs: string[] = [];
  logs.push(`[INFO] QUOREMIND session started at ${new Date().toISOString()}`);
  logs.push(`[INFO] Starting simulation for ${config.circuit_type} circuit.`);
  logs.push(`[INFO] Configuration: ${config.num_qubits} qubits, ${config.shots} shots, noise=${config.noise_level}.`);

  const isCalibrationRun = config.circuit_type === 'acoustic' && audioPayload && referenceState && !referenceState.initialized;

  if (config.circuit_type === 'acoustic' && audioPayload && referenceState) {
    const acousticResult = await _runAcousticProcessing(config, audioPayload, referenceState, logs);
    
    if (isCalibrationRun) {
      // This was a calibration run, return immediately with the new state
      return {
        ...config,
        counts: {},
        circuit_depth: 0,
        statistics: _calculate_statistics({}, 0),
        logs,
        referenceState: acousticResult.newReferenceState,
      };
    }

    const counts: Record<number, number> = {};
    const { initialState, mahalanobis_distance, spectral_flux } = acousticResult;

    if (initialState) {
      const totalInitialMagnitude = Object.values(initialState).reduce((sum, val) => sum + val, 0);
      if (totalInitialMagnitude > 0) {
        for (const state in initialState) {
            const probability = initialState[state] / totalInitialMagnitude;
            const noise_effect = (Math.random() - 0.5) * probability * config.noise_level;
            const final_prob = Math.max(0, probability + noise_effect);
            counts[state] = (counts[state] || 0) + final_prob; // Accumulate probabilities
        }
      }
    }
    
    const final_counts = _normalizeCounts(counts, config.shots);
    const stats = {
      ..._calculate_statistics(final_counts, config.shots),
      mahalanobis_distance: mahalanobis_distance ?? 0,
      spectral_flux: spectral_flux ?? 0,
    };
    logs.push(`[SUCCESS] Acoustic simulation complete. Most frequent state: ${stats.most_frequent_state}.`);
    
    return {
      ...config,
      counts: final_counts,
      circuit_depth: config.num_qubits,
      statistics: stats,
      logs,
    };
  }

  // --- Standard (non-acoustic) simulations ---
  const counts: Record<number, number> = {};
  let circuit_depth = config.depth;

  if (config.circuit_type === 'bell' && config.num_qubits >= 2) {
    circuit_depth = 2;
    const p00 = 0.5 - config.noise_level * 0.4;
    const p11 = 0.5 - config.noise_level * 0.4;
    counts[0] = p00;
    const last_qubit_state = 1 << (config.num_qubits - 1);
    const bell_state = 1 | last_qubit_state;
    counts[bell_state] = p11;
    if (config.noise_level > 0) {
      counts[1] = (config.noise_level * 0.4 * Math.random());
      counts[last_qubit_state] = (config.noise_level * 0.4 * Math.random());
    }
  } else if (config.circuit_type === 'ghz' && config.num_qubits > 0) {
    circuit_depth = config.num_qubits;
    const p_ideal = 0.5 - config.noise_level * 0.4;
    counts[0] = p_ideal;
    const all_ones_state = (1 << config.num_qubits) - 1;
    counts[all_ones_state] = p_ideal;
    const remaining_prob = 1.0 - (counts[0] + (counts[all_ones_state] || 0) );
    if (remaining_prob > 0 && config.noise_level > 0.01) {
       for(let i=0; i < Math.min(Math.floor(Math.random() * 5) + 1, 5); i++) {
        const noisy_state = Math.floor(Math.random() * ((1 << config.num_qubits) - 2)) + 1;
        counts[noisy_state] = (counts[noisy_state] || 0) + (remaining_prob / 5);
      }
    }
  } else if (config.circuit_type === 'qft') {
    circuit_depth = config.num_qubits;
    const num_possible_states = 1 << config.num_qubits;
    for (let i = 0; i < num_possible_states; i++) {
      counts[i] = 1; // Equal probability
    }
  } else { // random circuit
    circuit_depth = config.depth;
    let remaining_prob = 1.0;
    const num_possible_states = 1 << config.num_qubits;
    const num_states_to_gen = Math.min(num_possible_states, Math.floor(10 + config.shots / 100));
    for (let i = 0; i < num_states_to_gen && remaining_prob > 0; i++) {
      const state = Math.floor(Math.random() * num_possible_states);
      const prob = Math.min(remaining_prob, Math.random() * (1.0 / num_states_to_gen) * 2);
      counts[state] = (counts[state] || 0) + prob;
      remaining_prob -= prob;
    }
    if (remaining_prob > 0) {
       const state = Math.floor(Math.random() * num_possible_states);
       counts[state] = (counts[state] || 0) + remaining_prob;
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
