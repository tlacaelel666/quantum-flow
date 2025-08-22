
import type { CircuitConfig, SimulationResults, ReferenceState, AudioPayload } from './types';
import FFT from 'fft.js';
import { extractFeaturesFromMagnitudes, findSimilarPattern, extractMLFeatures, calculateMahalanobisDistance as calculateMahalanobisDistanceWithReference, FEATURE_VECTOR_SIZE } from './audio-features';

// Variables globales para mantener estado entre mediciones
let previousAmplitudes: number[] = [];
let previousQuantumStates: number[] = [];
let measurementHistory: Array<{features: number[], timestamp: number}> = [];

interface QuantumStatistics {
  entropy: number;
  most_frequent_state: number;
  number_of_unique_states: number;
  distribution_uniformity: number;
  mahalanobis_distance: number;
  spectral_flux: number;
  coherence_measure: number;
  quantum_fidelity: number;
  von_neumann_entropy: number;
  state_purity: number;
  expected_position?: number;
  parity?: number;
}

// Función mejorada para calcular estadísticas cuánticas
function calculateQuantumStatistics(
  counts: Record<number, number>, 
  shots: number,
  currentFeatures: number[] = [],
  quantumAmplitudes: number[] = [],
  newMetrics: { expected_position?: number, parity?: number } = {}
): QuantumStatistics {
  
  const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
  
  if (total === 0) {
    return {
      entropy: 0,
      most_frequent_state: 0,
      number_of_unique_states: 0,
      distribution_uniformity: 0,
      mahalanobis_distance: 0,
      spectral_flux: 0,
      coherence_measure: 0,
      quantum_fidelity: 1,
      von_neumann_entropy: 0,
      state_purity: 1,
      ...newMetrics
    };
  }

  // Calcular probabilidades normalizadas
  const probabilities = Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [parseInt(k), v / total])
  );

  // 1. Entropía de Shannon clásica
  const shannonEntropy = -Object.values(probabilities).reduce(
    (sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 
    0
  );

  // 2. Estado más frecuente (excluyendo estado |00000⟩)
  const validStates = Object.entries(counts).filter(([state, _]) => parseInt(state) !== 0);
  const mostFrequentEntry = validStates.length > 0 
    ? validStates.reduce((max, entry) => entry[1] > max[1] ? entry : max, validStates[0])
    : ["0", 0];

  // 3. Número de estados únicos
  const numUniqueStates = Object.keys(counts).length;

  // 4. Uniformidad de distribución
  const maxEntropy = Math.log2(Math.max(numUniqueStates, 1));
  const distributionUniformity = maxEntropy > 0 ? shannonEntropy / maxEntropy : 1;

  // 5. Distancia de Mahalanobis mejorada
  const mahalanobisDistance = calculateMahalanobisDistance(currentFeatures, measurementHistory);

  // 6. Flujo espectral mejorado
  const spectralFlux = calculateEnhancedSpectralFlux(currentFeatures, previousAmplitudes);

  // 7. Medida de coherencia cuántica
  const coherenceMeasure = calculateQuantumCoherence(quantumAmplitudes, probabilities);

  // 8. Fidelidad cuántica
  const quantumFidelity = calculateQuantumFidelity(quantumAmplitudes, previousQuantumStates);

  // 9. Entropía de von Neumann
  const vonNeumannEntropy = calculateVonNeumannEntropy(quantumAmplitudes);

  // 10. Pureza del estado cuántico
  const statePurity = calculateStatePurity(quantumAmplitudes);

  // Actualizar historial
  updateMeasurementHistory(currentFeatures, quantumAmplitudes);

  return {
    entropy: shannonEntropy,
    most_frequent_state: parseInt(mostFrequentEntry[0]),
    number_of_unique_states: numUniqueStates,
    distribution_uniformity: distributionUniformity,
    mahalanobis_distance: mahalanobisDistance,
    spectral_flux: spectralFlux,
    coherence_measure: coherenceMeasure,
    quantum_fidelity: quantumFidelity,
    von_neumann_entropy: vonNeumannEntropy,
    state_purity: statePurity,
    ...newMetrics
  };
}

// Calcular distancia de Mahalanobis con respecto al historial
function calculateMahalanobisDistance(
  currentFeatures: number[], 
  history: Array<{features: number[], timestamp: number}>
): number {
  if (history.length < 2 || currentFeatures.length === 0) {
    return 0;
  }

  const recentHistory = history.slice(-10); // Usar últimas 10 mediciones
  const n = recentHistory.length;
  const d = currentFeatures.length;

  // Calcular media histórica
  const mean = new Array(d).fill(0);
  for (const entry of recentHistory) {
    for (let i = 0; i < Math.min(d, entry.features.length); i++) {
      mean[i] += entry.features[i];
    }
  }
  for (let i = 0; i < d; i++) {
    mean[i] /= n;
  }

  // Calcular matriz de covarianza
  const covariance = Array(d).fill(null).map(() => Array(d).fill(0));
  for (const entry of recentHistory) {
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        const di = (entry.features[i] || 0) - mean[i];
        const dj = (entry.features[j] || 0) - mean[j];
        covariance[i][j] += di * dj;
      }
    }
  }
  
  // Normalizar covarianza
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      covariance[i][j] /= (n - 1);
    }
  }

  // Calcular distancia de Mahalanobis (aproximación diagonal)
  const diff = currentFeatures.map((val, i) => val - mean[i]);
  let distance = 0;
  for (let i = 0; i < d; i++) {
    const variance = covariance[i][i] + 1e-10; // Evitar división por cero
    distance += (diff[i] * diff[i]) / variance;
  }

  return Math.sqrt(distance);
}


// Calcular flujo espectral mejorado
function calculateEnhancedSpectralFlux(
  currentFeatures: number[], 
  previousFeatures: number[]
): number {
  if (previousFeatures.length === 0 || currentFeatures.length === 0) {
    return 0;
  }

  const minLength = Math.min(currentFeatures.length, previousFeatures.length);
  let flux = 0;
  let totalEnergy = 0;

  for (let i = 0; i < minLength; i++) {
    const current = currentFeatures[i] || 0;
    const previous = previousFeatures[i] || 0;
    const diff = current - previous;
    
    // Solo considerar aumentos de energía (modelo psychoacoustic)
    if (diff > 0) {
      flux += diff * diff;
    }
    totalEnergy += current * current;
  }

  // Normalizar por energía total
  return totalEnergy > 0 ? Math.sqrt(flux) / Math.sqrt(totalEnergy) : 0;
}

// Calcular coherencia cuántica
function calculateQuantumCoherence(
  amplitudes: number[], 
  probabilities: Record<number, number>
): number {
  if (amplitudes.length < 2) return 0;

  // Coherencia basada en superposición de estados
  let coherenceSum = 0;
  let normalizationSum = 0;

  for (let i = 0; i < amplitudes.length - 1; i++) {
    for (let j = i + 1; j < amplitudes.length; j++) {
      const amp_i = amplitudes[i] || 0;
      const amp_j = amplitudes[j] || 0;
      
      // Término de interferencia cuántica
      const interference = 2 * amp_i * amp_j;
      coherenceSum += Math.abs(interference);
      normalizationSum += amp_i * amp_i + amp_j * amp_j;
    }
  }

  return normalizationSum > 0 ? coherenceSum / normalizationSum : 0;
}

// Calcular fidelidad cuántica entre estados
function calculateQuantumFidelity(
  currentAmplitudes: number[], 
  previousAmplitudes: number[]
): number {
  if (previousAmplitudes.length === 0 || currentAmplitudes.length === 0) {
    return 1;
  }

  const minLength = Math.min(currentAmplitudes.length, previousAmplitudes.length);
  let overlapReal = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < minLength; i++) {
    const amp1 = currentAmplitudes[i] || 0;
    const amp2 = previousAmplitudes[i] || 0;
    
    overlapReal += amp1 * amp2; // Producto escalar
    norm1 += amp1 * amp1;
    norm2 += amp2 * amp2;
  }

  const normProduct = Math.sqrt(norm1 * norm2);
  return normProduct > 0 ? Math.abs(overlapReal) / normProduct : 1;
}

// Calcular entropía de von Neumann
function calculateVonNeumannEntropy(amplitudes: number[]): number {
  if (amplitudes.length === 0) return 0;

  // Calcular eigenvalores de la matriz densidad (aproximación diagonal)
  const eigenvalues = amplitudes.map(amp => amp * amp);
  const totalProb = eigenvalues.reduce((sum, val) => sum + val, 0);
  
  if (totalProb === 0) return 0;

  // Normalizar
  const normalizedEigenvalues = eigenvalues.map(val => val / totalProb);

  // Calcular entropía de von Neumann: -Tr(ρ log ρ)
  return -normalizedEigenvalues.reduce((sum, lambda) => {
    return sum + (lambda > 0 ? lambda * Math.log2(lambda) : 0);
  }, 0);
}

// Calcular pureza del estado
function calculateStatePurity(amplitudes: number[]): number {
  if (amplitudes.length === 0) return 1;

  // Pureza = Tr(ρ²)
  const probabilities = amplitudes.map(amp => amp * amp);
  const totalProb = probabilities.reduce((sum, val) => sum + val, 0);
  
  if (totalProb === 0) return 1;

  const normalizedProbs = probabilities.map(p => p / totalProb);
  const purity = normalizedProbs.reduce((sum, p) => sum + p * p, 0);

  return purity;
}

// Actualizar historial de mediciones
function updateMeasurementHistory(
  currentFeatures: number[], 
  quantumAmplitudes: number[]
): void {
  const timestamp = Date.now();
  
  measurementHistory.push({
    features: [...currentFeatures],
    timestamp: timestamp
  });

  // Mantener solo las últimas 20 mediciones
  if (measurementHistory.length > 20) {
    measurementHistory.shift();
  }

  // Actualizar estados previos
  previousAmplitudes = [...currentFeatures];
  previousQuantumStates = [...quantumAmplitudes];
}

// Función principal exportada (reemplaza la función original)
export function calculateStatistics(
  counts: Record<number, number>, 
  shots: number,
  currentFeatures: number[] = [],
  quantumAmplitudes: number[] = [],
  newMetrics: { expected_position?: number, parity?: number } = {}
): QuantumStatistics {
  return calculateQuantumStatistics(counts, shots, currentFeatures, quantumAmplitudes, newMetrics);
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
  initialState?: number[], 
  mahalanobis_distance?: number,
  spectral_flux?: number,
  newReferenceState?: ReferenceState,
  features?: number[],
  evolvedState?: number[],
  observables?: { expected_position: number, parity: number }
}> {
    logs.push(`[INFO] Starting acoustic processing. Reference initialized: ${referenceState.initialized}`);
    
    const fftSize = Math.pow(2, Math.ceil(Math.log2(audioData.pcmData.length)));
    const f = new FFT(fftSize);
    const fftResult = f.createComplexArray();
    const pcmTypedArray = new Float32Array(audioData.pcmData);
    if(pcmTypedArray.length === 0) {
      logs.push('[ERROR] PCM data is empty. Aborting acoustic processing.');
      return { initialState: [], features: [] };
    }
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
        const covariance: number[][] = Array(FEATURE_VECTOR_SIZE).fill(0).map(() => Array(FEATURE_VECTOR_SIZE).fill(0));
        features.forEach((feature, i) => {
            covariance[i][i] = 1e-6; 
        });

        const newReferenceState: ReferenceState = {
            mean,
            covariance,
            initialized: true
        };
        logs.push(`[SUCCESS] Calibration complete. Mean vector established.`);
        previousAmplitudes = magnitudes;
        return { newReferenceState, features };
    }

    // This is a simulation run, use the reference state
    const mahalanobis_distance = calculateMahalanobisDistanceWithReference(features, referenceState);
    logs.push(`[DATA] Mahalanobis Distance: ${mahalanobis_distance}`);
    
    // --- LINDBLAD EVOLUTION ---
    const N = 1 << config.num_qubits; // Truncation to qubit basis size
    const gamma = config.noise_level; // Dissipation rate
    
    // 1. Prepare initial state from features
    let initialState = features.slice(0, N);
    let norm = Math.sqrt(initialState.reduce((sum, x) => sum + x * x, 0));
    if (norm > 0) {
      initialState = initialState.map(x => x / norm);
    }
    logs.push(`[INFO] Prepared initial quantum state from audio features.`);

    // 2. Evolve state using Lindblad equation (simplified time-step evolution)
    // dρ/dt ≈ (ρ(t+Δt) - ρ(t)) / Δt
    // We simulate a single time step Δt=1 for simplicity
    const dt = 1.0; 
    
    // The density matrix ρ is diagonal in this simplified model: ρ_ij = δ_ij * |ψ_i|^2
    const rho = initialState.map(amp => amp * amp);

    // Apply Lindblad dynamics
    const evolvedRho = rho.map((rho_n, n) => {
      // Dissipative part: γ(aρa† - 1/2{a†a,ρ})
      // Action of `a` on |n> is sqrt(n)|n-1>
      // Action of `a†` on |n> is sqrt(n+1)|n+1>
      const creation_term = (n > 0) ? gamma * (n) * (rho[n - 1] || 0) : 0; // from a†ρa term, index shifting
      const annihilation_term = -gamma * n * rho_n;
      const creation_annihilation_term = -gamma * n * rho_n;

      return Math.max(0, rho_n + dt * (creation_term + annihilation_term + creation_annihilation_term));
    });

    // Normalize evolved density matrix
    const trace = evolvedRho.reduce((sum, p) => sum + p, 0);
    const finalRho = trace > 0 ? evolvedRho.map(p => p / trace) : evolvedRho;
    
    const evolvedStateAmplitudes = finalRho.map(p => Math.sqrt(p));
    logs.push(`[INFO] Evolved state with dissipation rate (gamma) = ${gamma}.`);

    // 3. Calculate observables
    let expected_position = 0; // <x>
    let parity = 0; // <P>
    for (let n = 0; n < N; n++) {
      // <x> ∝ <a + a†> - This is zero for diagonal density matrix
      // Let's calculate <x^2> instead for a non-zero value, which is related to energy
      // <x^2> ∝ <(a+a†)^2> = <a^2 + a†^2 + aa† + a†a> = <2a†a + 1>
      expected_position += (2 * n + 1) * finalRho[n];
      
      // Parity P = (-1)^(a†a)
      parity += Math.pow(-1, n) * finalRho[n];
    }
    logs.push(`[DATA] Observables: <x^2> (Energy) = ${expected_position.toFixed(4)}, <P> (Parity) = ${parity.toFixed(4)}`);

    return { 
      initialState: initialState, 
      mahalanobis_distance, 
      spectral_flux: features[2], 
      features, 
      evolvedState: evolvedStateAmplitudes, 
      observables: { expected_position, parity } 
    };
}


export async function runSimulation(config: CircuitConfig, audioPayload?: AudioPayload, referenceState?: ReferenceState): Promise<SimulationResults> {
  await new Promise(res => setTimeout(res, 500 + Math.random() * 500));

  const logs: string[] = [];
  logs.push(`[INFO] QUOREMIND session started at ${new Date().toISOString()}`);
  logs.push(`[INFO] Starting simulation for ${config.circuit_type} circuit.`);
  logs.push(`[INFO] Configuration: ${config.num_qubits} qubits, ${config.shots} shots, noise=${config.noise_level}.`);

  const isAcousticRun = !!audioPayload;
  const isCalibrationRun = isAcousticRun && referenceState && !referenceState.initialized;

  if (isCalibrationRun && audioPayload && referenceState) {
    const acousticResult = await _runAcousticProcessing(config, audioPayload, referenceState, logs);
    return {
      ...config,
      counts: {},
      circuit_depth: 0,
      statistics: calculateStatistics({}, 0, acousticResult.features, []),
      logs,
      referenceState: acousticResult.newReferenceState,
    };
  }

  let finalAmplitudes: number[] = [];
  let circuit_depth = config.depth;
  const num_states = 1 << config.num_qubits;
  let features: number[] = [];
  let newMetrics = {};

  if (isAcousticRun && audioPayload && referenceState) {
    logs.push('[INFO] Running hybrid acoustic-quantum simulation.');
    const acousticResult = await _runAcousticProcessing(config, audioPayload, referenceState, logs);
    
    finalAmplitudes = acousticResult.evolvedState || [];
    features = acousticResult.features || [];
    if(acousticResult.observables) {
        newMetrics = {
            expected_position: acousticResult.observables.expected_position,
            parity: acousticResult.observables.parity
        };
    }
    
    logs.push('[INFO] Acoustic evolution complete.');

  } else { // Standard, non-acoustic simulation
      let baseAmplitudes: Record<number, number> = {};
      if (config.circuit_type === 'bell' && config.num_qubits >= 2) {
        circuit_depth = 2;
        baseAmplitudes[0] = 1;
        const bell_state = 1 | (1 << (config.num_qubits - 1));
        baseAmplitudes[bell_state] = 1;
      } else if (config.circuit_type === 'ghz' && config.num_qubits > 0) {
        circuit_depth = config.num_qubits;
        baseAmplitudes[0] = 1;
        const all_ones_state = (1 << config.num_qubits) - 1;
        baseAmplitudes[all_ones_state] = 1;
      } else if (config.circuit_type === 'qft') {
        circuit_depth = config.num_qubits;
        for (let i = 0; i < num_states; i++) {
          baseAmplitudes[i] = 1; // Equal amplitude before QFT
        }
      } else { // random circuit
        for (let i = 0; i < num_states; i++) {
          baseAmplitudes[i] = Math.random();
        }
      }
      
      const ampValues = Object.values(baseAmplitudes);
      const norm = Math.sqrt(ampValues.reduce((s,v) => s + v*v, 0));
      if(norm > 0) {
          finalAmplitudes = Array(num_states).fill(0);
          for(const state in baseAmplitudes) {
              finalAmplitudes[Number(state)] = baseAmplitudes[state] / norm;
          }
      }
      logs.push(`[INFO] Generated base amplitudes for ${config.circuit_type} circuit. Depth: ${circuit_depth}.`);
  }

  // Convert amplitudes to probabilities (counts)
  const counts: Record<number, number> = {};
  finalAmplitudes.forEach((amp, state) => {
    counts[state] = Math.pow(amp, 2);
  });
  
  const final_counts = _normalizeCounts(counts, config.shots);
  const stats = calculateStatistics(final_counts, config.shots, features, finalAmplitudes, newMetrics);

  logs.push(`[SUCCESS] Simulation complete. Most frequent state: ${stats.most_frequent_state}.`);

  return {
    ...config,
    counts: final_counts,
    circuit_depth,
    statistics: stats,
    logs,
  };
}
