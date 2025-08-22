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

interface AdvancedFeatures {
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlux: number;
  zeroCrossingRate: number;
  rms: number;
  peak: number;
  crest: number;
  spectralSpread: number;
  spectralFlatness: number;
  spectralSlope: number;
  harmonicRatio: number;
  noiseRatio: number;
  tonalPower: number;
  spectralContrast: number[];  // 7 valores
  spectralBandEnergy: number[]; // 8 valores
  temporalFeatures: number[];   // 4 valores
}

// Función principal mejorada para extraer características ML
export const extractMLFeatures = (
  magnitudes: number[], 
  rawData: Uint8Array, 
  previousAmplitudes: number[], 
  sampleRate: number
): number[] => {
  const features: number[] = new Array(FEATURE_VECTOR_SIZE).fill(0);
  
  try {
    // Convertir datos raw a amplitudes normalizadas
    const amplitudes = convertRawToAmplitudes(rawData);
    
    // Extraer características avanzadas
    const advancedFeatures = extractAdvancedFeatures(magnitudes, amplitudes, previousAmplitudes, sampleRate);
    
    // Mapear a vector de 32 características
    const featureVector = mapToFeatureVector(advancedFeatures);
    
    // Copiar al array de salida
    for (let i = 0; i < Math.min(FEATURE_VECTOR_SIZE, featureVector.length); i++) {
      features[i] = featureVector[i];
    }
    
    return features;
  } catch (error) {
    console.warn('Error extracting ML features:', error);
    // Fallback a extracción básica
    return extractBasicFeatures(magnitudes, rawData, sampleRate);
  }
};

// Convertir datos raw a amplitudes normalizadas
function convertRawToAmplitudes(rawData: Uint8Array): number[] {
  const amplitudes: number[] = [];
  
  // Convertir de Uint8 a valores signed y normalizar
  for (let i = 0; i < rawData.length - 1; i += 2) {
    // Combinar bytes para 16-bit sample
    const sample = (rawData[i + 1] << 8) | rawData[i];
    const signed = sample > 32767 ? sample - 65536 : sample;
    amplitudes.push(signed / 32768.0); // Normalizar a [-1, 1]
  }
  
  return amplitudes;
}

// Extractor de características avanzadas
function extractAdvancedFeatures(
  magnitudes: number[], 
  amplitudes: number[], 
  previousAmplitudes: number[], 
  sampleRate: number
): AdvancedFeatures {
  
  const N = magnitudes.length;
  const nyquist = sampleRate / 2;
  
  // 1. Centroide espectral
  const spectralCentroid = calculateSpectralCentroid(magnitudes, nyquist);
  
  // 2. Rolloff espectral (85% de energía)
  const spectralRolloff = calculateSpectralRolloff(magnitudes, nyquist, 0.85);
  
  // 3. Flujo espectral
  const spectralFlux = calculateSpectralFlux(magnitudes, previousAmplitudes);
  
  // 4. Tasa de cruces por cero
  const zeroCrossingRate = calculateZeroCrossingRate(amplitudes);
  
  // 5. RMS (Root Mean Square)
  const rms = calculateRMS(amplitudes);
  
  // 6. Valor pico
  const peak = Math.max(...amplitudes.map(Math.abs));
  
  // 7. Factor de cresta
  const crest = rms > 0 ? peak / rms : 0;
  
  // 8. Dispersión espectral
  const spectralSpread = calculateSpectralSpread(magnitudes, spectralCentroid, nyquist);
  
  // 9. Planitud espectral
  const spectralFlatness = calculateSpectralFlatness(magnitudes);
  
  // 10. Pendiente espectral
  const spectralSlope = calculateSpectralSlope(magnitudes, nyquist);
  
  // 11-12. Ratio armónico y de ruido
  const { harmonicRatio, noiseRatio } = calculateHarmonicNoiseRatio(magnitudes);
  
  // 13. Potencia tonal
  const tonalPower = calculateTonalPower(magnitudes);
  
  // 14-20. Contraste espectral (7 bandas)
  const spectralContrast = calculateSpectralContrast(magnitudes, 7);
  
  // 21-28. Energía por bandas de frecuencia (8 bandas)
  const spectralBandEnergy = calculateBandEnergy(magnitudes, 8);
  
  // 29-32. Características temporales
  const temporalFeatures = calculateTemporalFeatures(amplitudes, previousAmplitudes);
  
  return {
    spectralCentroid,
    spectralRolloff,
    spectralFlux,
    zeroCrossingRate,
    rms,
    peak,
    crest,
    spectralSpread,
    spectralFlatness,
    spectralSlope,
    harmonicRatio,
    noiseRatio,
    tonalPower,
    spectralContrast,
    spectralBandEnergy,
    temporalFeatures
  };
}

// Mapear características avanzadas a vector de 32 elementos
function mapToFeatureVector(features: AdvancedFeatures): number[] {
  const vector: number[] = [];
  
  // Características espectrales básicas (13 elementos)
  vector.push(
    features.spectralCentroid,
    features.spectralRolloff,
    features.spectralFlux,
    features.zeroCrossingRate,
    features.rms,
    features.peak,
    features.crest,
    features.spectralSpread,
    features.spectralFlatness,
    features.spectralSlope,
    features.harmonicRatio,
    features.noiseRatio,
    features.tonalPower
  );
  
  // Contraste espectral (7 elementos)
  vector.push(...features.spectralContrast);
  
  // Energía por bandas (8 elementos)
  vector.push(...features.spectralBandEnergy);
  
  // Características temporales (4 elementos)
  vector.push(...features.temporalFeatures);
  
  return vector.slice(0, 32); // Asegurar exactamente 32 elementos
}

// Funciones de cálculo específicas

function calculateSpectralCentroid(magnitudes: number[], nyquist: number): number {
  let weightedSum = 0;
  let magnitudeSum = 0;
  
  for (let i = 0; i < magnitudes.length; i++) {
    const freq = (i * nyquist) / magnitudes.length;
    weightedSum += freq * magnitudes[i];
    magnitudeSum += magnitudes[i];
  }
  
  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
}

function calculateSpectralRolloff(magnitudes: number[], nyquist: number, threshold: number): number {
  const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag * mag, 0);
  const targetEnergy = totalEnergy * threshold;
  
  let cumulativeEnergy = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    cumulativeEnergy += magnitudes[i] * magnitudes[i];
    if (cumulativeEnergy >= targetEnergy) {
      return (i * nyquist) / magnitudes.length;
    }
  }
  
  return nyquist;
}

function calculateSpectralFlux(current: number[], previous: number[]): number {
  if (previous.length === 0) return 0;
  
  let flux = 0;
  const minLength = Math.min(current.length, previous.length);
  
  for (let i = 0; i < minLength; i++) {
    const diff = current[i] - previous[i];
    if (diff > 0) flux += diff * diff;
  }
  
  return Math.sqrt(flux / minLength);
}

function calculateZeroCrossingRate(amplitudes: number[]): number {
  let crossings = 0;
  
  for (let i = 1; i < amplitudes.length; i++) {
    if ((amplitudes[i] >= 0) !== (amplitudes[i-1] >= 0)) {
      crossings++;
    }
  }
  
  return crossings / (amplitudes.length - 1);
}

function calculateRMS(amplitudes: number[]): number {
  const sumSquares = amplitudes.reduce((sum, amp) => sum + amp * amp, 0);
  return Math.sqrt(sumSquares / amplitudes.length);
}

function calculateSpectralSpread(magnitudes: number[], centroid: number, nyquist: number): number {
  let weightedVariance = 0;
  let magnitudeSum = 0;
  
  for (let i = 0; i < magnitudes.length; i++) {
    const freq = (i * nyquist) / magnitudes.length;
    const deviation = freq - centroid;
    weightedVariance += deviation * deviation * magnitudes[i];
    magnitudeSum += magnitudes[i];
  }
  
  return magnitudeSum > 0 ? Math.sqrt(weightedVariance / magnitudeSum) : 0;
}

function calculateSpectralFlatness(magnitudes: number[]): number {
  let geometricMean = 1;
  let arithmeticMean = 0;
  let count = 0;
  
  for (const mag of magnitudes) {
    if (mag > 0) {
      geometricMean *= Math.pow(mag, 1 / magnitudes.length);
      arithmeticMean += mag;
      count++;
    }
  }
  
  arithmeticMean /= count;
  return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
}

function calculateSpectralSlope(magnitudes: number[], nyquist: number): number {
  let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0;
  const n = magnitudes.length;
  
  for (let i = 0; i < n; i++) {
    const x = (i * nyquist) / n; // frecuencia
    const y = magnitudes[i];     // magnitud
    
    sumXY += x * y;
    sumX += x;
    sumY += y;
    sumX2 += x * x;
  }
  
  const denominator = n * sumX2 - sumX * sumX;
  return denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
}

function calculateHarmonicNoiseRatio(magnitudes: number[]): { harmonicRatio: number, noiseRatio: number } {
  // Simplificación: basado en picos vs valle promedio
  const sortedMags = [...magnitudes].sort((a, b) => b - a);
  const peakEnergy = sortedMags.slice(0, Math.floor(sortedMags.length * 0.1)).reduce((a, b) => a + b, 0);
  const totalEnergy = magnitudes.reduce((a, b) => a + b, 0);
  
  const harmonicRatio = totalEnergy > 0 ? peakEnergy / totalEnergy : 0;
  const noiseRatio = 1 - harmonicRatio;
  
  return { harmonicRatio, noiseRatio };
}

function calculateTonalPower(magnitudes: number[]): number {
  // Potencia de componentes tonales vs total
  let tonalPower = 0;
  const threshold = Math.max(...magnitudes) * 0.1;
  
  for (const mag of magnitudes) {
    if (mag > threshold) {
      tonalPower += mag * mag;
    }
  }
  
  const totalPower = magnitudes.reduce((sum, mag) => sum + mag * mag, 0);
  return totalPower > 0 ? tonalPower / totalPower : 0;
}

function calculateSpectralContrast(magnitudes: number[], numBands: number): number[] {
  const bandSize = Math.floor(magnitudes.length / numBands);
  const contrasts: number[] = [];
  
  for (let band = 0; band < numBands; band++) {
    const start = band * bandSize;
    const end = Math.min(start + bandSize, magnitudes.length);
    const bandMags = magnitudes.slice(start, end);
    
    if (bandMags.length > 0) {
      const sortedBand = [...bandMags].sort((a, b) => b - a);
      const peakMean = sortedBand.slice(0, Math.max(1, Math.floor(sortedBand.length * 0.2)))
                                 .reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(sortedBand.length * 0.2));
      const valleyMean = sortedBand.slice(Math.floor(sortedBand.length * 0.8))
                                   .reduce((a, b) => a + b, 0) / Math.max(1, sortedBand.length - Math.floor(sortedBand.length * 0.8));
      
      contrasts.push(valleyMean > 0 ? Math.log(peakMean / valleyMean) : 0);
    } else {
      contrasts.push(0);
    }
  }
  
  return contrasts;
}

function calculateBandEnergy(magnitudes: number[], numBands: number): number[] {
  const bandSize = Math.floor(magnitudes.length / numBands);
  const energies: number[] = [];
  
  for (let band = 0; band < numBands; band++) {
    const start = band * bandSize;
    const end = Math.min(start + bandSize, magnitudes.length);
    
    let energy = 0;
    for (let i = start; i < end; i++) {
      energy += magnitudes[i] * magnitudes[i];
    }
    
    energies.push(energy / (end - start));
  }
  
  return energies;
}

function calculateTemporalFeatures(current: number[], previous: number[]): number[] {
  const features: number[] = [];
  
  // 1. Cambio de energía
  const currentEnergy = current.reduce((sum, amp) => sum + amp * amp, 0);
  const previousEnergy = previous.length > 0 ? previous.reduce((sum, amp) => sum + amp * amp, 0) : currentEnergy;
  const energyChange = previousEnergy > 0 ? (currentEnergy - previousEnergy) / previousEnergy : 0;
  features.push(energyChange);
  
  // 2. Autocorrelación en lag=1
  let autocorr = 0;
  if (current.length > 1) {
    for (let i = 1; i < current.length; i++) {
      autocorr += current[i] * current[i-1];
    }
    autocorr /= (current.length - 1);
  }
  features.push(autocorr);
  
  // 3. Varianza de amplitudes
  const mean = current.reduce((a, b) => a + b, 0) / current.length;
  const variance = current.reduce((sum, amp) => sum + (amp - mean) * (amp - mean), 0) / current.length;
  features.push(variance);
  
  // 4. Asimetría (skewness)
  const std = Math.sqrt(variance);
  let skewness = 0;
  if (std > 0) {
    skewness = current.reduce((sum, amp) => sum + Math.pow((amp - mean) / std, 3), 0) / current.length;
  }
  features.push(skewness);
  
  return features;
}

// Función de fallback para extracción básica
function extractBasicFeatures(magnitudes: number[], rawData: Uint8Array, sampleRate: number): number[] {
  const features: number[] = new Array(FEATURE_VECTOR_SIZE).fill(0);
  
  // Usar magnitudes FFT básicas y rellenar
  for (let i = 0; i < Math.min(FEATURE_VECTOR_SIZE, magnitudes.length); i++) {
    features[i] = magnitudes[i];
  }
  
  return features;
}
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

    