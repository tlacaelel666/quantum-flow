// Base de datos de referencia para FFT cuántica con 32 características de amplitudes de onda de presión
export const FEATURE_VECTOR_SIZE = 32;

interface QuantumState {
  amplitude: number;      // Amplitud normalizada [0,1]
  phase: number;         // Fase en radianes [0, 2π]
  qubit_state: string;   // Estado de 5 qubits (32 combinaciones posibles)
  frequency_bin: number; // Bin de frecuencia correspondiente
}

interface PressureWaveFeatures {
  // 32 características fundamentales de amplitudes de onda de presión
  features: number[];                    // Vector de 32 características
  quantum_states: QuantumState[];        // 32 estados cuánticos base
  fft_coefficients: Complex[];           // Coeficientes FFT complejos
  coherence_matrix: number[][];          // Matriz de coherencia 32x32
}

interface Complex {
  real: number;
  imaginary: number;
}

// Función para convertir amplitud de presión a estado cuántico
function amplitudeToQuantumState(amplitude: number, index: number, sampleRate: number = 44100): QuantumState {
  // Normalización de amplitud de presión sonora
  const normalizedAmplitude = Math.min(Math.abs(amplitude) / 32767, 1.0); // Para 16-bit audio
  
  // Cálculo de fase basada en la posición en el espectro
  const phase = (index * 2 * Math.PI / 32) % (2 * Math.PI);
  
  // Estado cuántico de 5 qubits (2^5 = 32 estados)
  const qubit_state = index.toString(2).padStart(5, '0');
  
  // Bin de frecuencia correspondiente
  const frequency_bin = (index * sampleRate) / (2 * 32); // Frecuencia en Hz
  
  return {
    amplitude: normalizedAmplitude,
    phase: phase,
    qubit_state: qubit_state,
    frequency_bin: frequency_bin
  };
}

// Función para calcular FFT cuántica
function quantumFFT(amplitudes: number[]): Complex[] {
  const N = amplitudes.length;
  const result: Complex[] = [];
  
  for (let k = 0; k < N; k++) {
    let real = 0;
    let imaginary = 0;
    
    for (let n = 0; n < N; n++) {
      const angle = -2 * Math.PI * k * n / N;
      real += amplitudes[n] * Math.cos(angle);
      imaginary += amplitudes[n] * Math.sin(angle);
    }
    
    result.push({
      real: real / Math.sqrt(N),      // Normalización cuántica
      imaginary: imaginary / Math.sqrt(N)
    });
  }
  
  return result;
}

// Función para generar matriz de coherencia cuántica
function generateCoherenceMatrix(quantum_states: QuantumState[]): number[][] {
  const size = quantum_states.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i < size; i++) {
    matrix[i] = [];
    for (let j = 0; j < size; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else {
        // Coherencia basada en diferencia de amplitudes y fases
        const amp_diff = Math.abs(quantum_states[i].amplitude - quantum_states[j].amplitude);
        const phase_diff = Math.abs(quantum_states[i].phase - quantum_states[j].phase);
        const coherence = Math.exp(-(amp_diff + phase_diff * 0.1));
        matrix[i][j] = coherence;
      }
    }
  }
  
  return matrix;
}

// Base de datos de referencia con patrones de amplitudes de presión típicos
export const PRESSURE_WAVE_DATABASE: PressureWaveFeatures[] = [
  {
    // Patrón 1: Onda senoidal pura con armónicos
    features: [
      1.0, 0.8, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1, 0.08, 0.06, 0.04, 0.03,
      0.02, 0.015, 0.01, 0.008, 0.006, 0.004, 0.003, 0.002, 0.0015, 0.001,
      0.0008, 0.0006, 0.0004, 0.0003, 0.0002, 0.00015, 0.0001, 0.00008, 0.00006, 0.00004
    ],
    quantum_states: [],
    fft_coefficients: [],
    coherence_matrix: []
  },
  {
    // Patrón 2: Onda cuadrada con armónicos impares
    features: [
      1.0, 0.0, 0.33, 0.0, 0.2, 0.0, 0.14, 0.0, 0.11, 0.0, 0.09, 0.0,
      0.077, 0.0, 0.067, 0.0, 0.059, 0.0, 0.053, 0.0, 0.048, 0.0,
      0.043, 0.0, 0.04, 0.0, 0.037, 0.0, 0.034, 0.0, 0.032, 0.0
    ],
    quantum_states: [],
    fft_coefficients: [],
    coherence_matrix: []
  },
  {
    // Patrón 3: Onda diente de sierra
    features: [
      1.0, 0.5, 0.33, 0.25, 0.2, 0.167, 0.143, 0.125, 0.111, 0.1, 0.091, 0.083,
      0.077, 0.071, 0.067, 0.063, 0.059, 0.056, 0.053, 0.05, 0.048, 0.045,
      0.043, 0.042, 0.04, 0.038, 0.037, 0.036, 0.034, 0.033, 0.032, 0.031
    ],
    quantum_states: [],
    fft_coefficients: [],
    coherence_matrix: []
  },
  {
    // Patrón 4: Ruido blanco filtrado
    features: [
      0.8, 0.9, 0.7, 0.85, 0.6, 0.75, 0.65, 0.8, 0.55, 0.7, 0.6, 0.65,
      0.5, 0.6, 0.45, 0.55, 0.4, 0.5, 0.35, 0.45, 0.3, 0.4, 0.25, 0.35,
      0.2, 0.3, 0.15, 0.25, 0.1, 0.2, 0.05, 0.15
    ],
    quantum_states: [],
    fft_coefficients: [],
    coherence_matrix: []
  }
];

// Inicialización de la base de datos
export function initializeQuantumDatabase(): void {
  PRESSURE_WAVE_DATABASE.forEach(pattern => {
    // Generar estados cuánticos para cada característica
    pattern.quantum_states = pattern.features.map((amplitude, index) => 
      amplitudeToQuantumState(amplitude, index)
    );
    
    // Calcular FFT cuántica
    pattern.fft_coefficients = quantumFFT(pattern.features);
    
    // Generar matriz de coherencia
    pattern.coherence_matrix = generateCoherenceMatrix(pattern.quantum_states);
  });
}

// Función para buscar el patrón más similar
export function findSimilarPattern(inputFeatures: number[]): { 
  pattern: PressureWaveFeatures, 
  similarity: number 
} | null {
  if (inputFeatures.length !== FEATURE_VECTOR_SIZE) {
    console.error(`Input features must have a length of ${FEATURE_VECTOR_SIZE}.`);
    return null;
  }
  let bestMatch = PRESSURE_WAVE_DATABASE[0];
  let bestSimilarity = 0;
  
  PRESSURE_WAVE_DATABASE.forEach(pattern => {
    // Cálculo de similitud usando producto escalar normalizado
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < FEATURE_VECTOR_SIZE; i++) {
      dotProduct += inputFeatures[i] * pattern.features[i];
      normA += inputFeatures[i] * inputFeatures[i];
      normB += pattern.features[i] * pattern.features[i];
    }

    if (normA === 0 || normB === 0) {
      return; 
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = pattern;
    }
  });
  
  return { pattern: bestMatch, similarity: bestSimilarity };
}


// Función de utilidad para extraer características de las magnitudes de audio
export function extractFeaturesFromMagnitudes(magnitudes: number[]): number[] {
    const featureVector: number[] = new Array(FEATURE_VECTOR_SIZE).fill(0);
    const step = Math.floor(magnitudes.length / FEATURE_VECTOR_SIZE);
    if (step < 1) {
        for(let i=0; i<FEATURE_VECTOR_SIZE; i++){
            featureVector[i] = magnitudes[i] || 0;
        }
        return featureVector;
    }
    for (let i = 0; i < FEATURE_VECTOR_SIZE; i++) {
        const slice = magnitudes.slice(i * step, (i + 1) * step);
        if (slice.length > 0) {
            featureVector[i] = slice.reduce((a, b) => a + b, 0) / slice.length;
        }
    }
    const maxVal = Math.max(...featureVector);
    if (maxVal > 0) {
      return featureVector.map(v => v / maxVal);
    }
    return featureVector;
}

// Dummy functions to be replaced with real implementations
export const extractMLFeatures = (magnitudes: number[], rawData: Uint8Array, previousAmplitudes: number[], sampleRate: number): number[] => {
    const features: number[] = new Array(FEATURE_VECTOR_SIZE).fill(0);
    // Placeholder: Just use magnitudes for now.
    const extracted = extractFeaturesFromMagnitudes(magnitudes);
    for(let i=0; i < Math.min(features.length, extracted.length); i++) {
        features[i] = extracted[i];
    }
    return features;
};

export const calculateMahalanobisDistance = (features: number[], referenceState: { mean: number[], covariance: number[][], initialized: boolean }): number => {
    if (!referenceState.initialized) return 0;
    
    const diff = features.map((feat, i) => feat - referenceState.mean[i]);
    
    // Using diagonal of covariance for simplicity. For a full implementation, matrix inversion is needed.
    const diagCovariance = referenceState.covariance.map((row, i) => row[i]);
    
    const distance = diff.reduce((acc, val, i) => {
        const variance = diagCovariance[i];
        // Add epsilon to variance to avoid division by zero
        return acc + (val * val) / (variance > 1e-9 ? variance : 1e-9);
    }, 0);
    
    return Math.sqrt(distance);
};


// Inicializar base de datos al cargar
initializeQuantumDatabase();

    