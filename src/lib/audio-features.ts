// Constants
export const AMPLITUDE_THRESHOLD = 0.1;
export const FFT_SIZE = 2048; // Must be a power of 2
export const FEATURE_VECTOR_SIZE = 32;

export interface ReferenceState {
  mean: number[];
  covariance: number[] | null;
  initialized: boolean;
}

// APLANAMIENTO BINARIO: Convierte amplitudes a representación binaria
export const flattenToBinary = (amplitudes: number[]): number[] => {
  const binaryVector: number[] = [];
  amplitudes.forEach((amp) => {
    // Método 1: Umbralización binaria
    const isActive = amp > AMPLITUDE_THRESHOLD ? 1 : 0;
    binaryVector.push(isActive);
    // Método 2: Codificación de magnitud (4 bits)
    const quantized = Math.floor(amp * 15);
    const binaryMagnitude = quantized.toString(2).padStart(4, '0');
    binaryVector.push(...binaryMagnitude.split('').map(Number));
  });
  return binaryVector;
};

// --- Funciones auxiliares de características espectrales ---

const calculateSpectralCentroid = (amplitudes: number[], sampleRate: number): number => {
  let weightedSum = 0;
  let totalEnergy = 0;
  amplitudes.forEach((amp, idx) => {
    const freq = (idx * sampleRate) / (2 * amplitudes.length);
    weightedSum += freq * amp;
    totalEnergy += amp;
  });
  return totalEnergy > 0 ? weightedSum / totalEnergy : 0;
};

const calculateSpectralRolloff = (amplitudes: number[], sampleRate: number, threshold = 0.85): number => {
  const totalEnergy = amplitudes.reduce((sum, amp) => sum + amp, 0);
  if (totalEnergy === 0) return 0;
  const targetEnergy = totalEnergy * threshold;
  let cumulativeEnergy = 0;
  for (let i = 0; i < amplitudes.length; i++) {
    cumulativeEnergy += amplitudes[i];
    if (cumulativeEnergy >= targetEnergy) {
      return (i * sampleRate) / (2 * amplitudes.length);
    }
  }
  return ((amplitudes.length - 1) * sampleRate) / (2 * amplitudes.length);
};

export const calculateSpectralFlux = (amplitudes: number[], previousAmplitudes: number[]): number => {
    if (previousAmplitudes.length === 0) {
        return 0;
    }
    const flux = amplitudes.reduce((sum, amp, idx) => {
        const diff = amp - (previousAmplitudes[idx] || 0);
        return sum + (diff > 0 ? diff * diff : 0); // Use squared difference for stability
    }, 0);
    return Math.sqrt(flux);
};


const calculateZeroCrossingRate = (rawData: Uint8Array): number => {
  let crossings = 0;
  for (let i = 1; i < rawData.length; i++) {
    // rawData is 0-255, so 128 is the zero-crossing point
    if ((rawData[i] >= 128) !== (rawData[i - 1] >= 128)) {
      crossings++;
    }
  }
  return crossings / rawData.length;
};

const calculateSpectralContrast = (amplitudes: number[]): number[] => {
  const octaveBands = 6;
  const contrasts: number[] = [];
  for (let i = 0; i < octaveBands; i++) {
    const startBin = Math.floor(amplitudes.length * Math.pow(2, i) / Math.pow(2, octaveBands));
    const endBin = Math.floor(amplitudes.length * Math.pow(2, i + 1) / Math.pow(2, octaveBands));
    const bandAmps = amplitudes.slice(startBin, endBin);
    if (bandAmps.length === 0) {
      contrasts.push(0);
      continue;
    }
    const sortedAmps = [...bandAmps].sort((a, b) => b - a);
    const peakCount = Math.max(1, Math.floor(sortedAmps.length * 0.1));
    const valleyCount = Math.max(1, Math.floor(sortedAmps.length * 0.1));
    const peakMean = sortedAmps.slice(0, peakCount).reduce((sum, amp) => sum + amp, 0) / peakCount;
    const valleyMean = sortedAmps.slice(-valleyCount).reduce((sum, amp) => sum + amp, 0) / valleyCount;
    contrasts.push(peakMean > valleyMean ? Math.log10(peakMean) - Math.log10(valleyMean) : 0);
  }
  return contrasts;
};

const calculateSimplifiedMFCC = (amplitudes: number[], sampleRate: number): number[] => {
  const mfcc: number[] = [];
  const melFilters = 13;
  const maxFreq = sampleRate / 2;
  const maxMel = 1127 * Math.log(1 + maxFreq / 700);

  for (let m = 1; m <= melFilters; m++) {
      let filterEnergy = 0;
      // This is a highly simplified filterbank
      const startBin = Math.floor(amplitudes.length * (m-1) / melFilters);
      const endBin = Math.floor(amplitudes.length * m / melFilters);

      for(let k = startBin; k < endBin; k++) {
        filterEnergy += amplitudes[k] * amplitudes[k];
      }
      mfcc.push(filterEnergy > 0 ? Math.log(filterEnergy) : 0);
  }
  return mfcc;
};

// EXTRACCIÓN DE CARACTERÍSTICAS ML
export const extractMLFeatures = (amplitudes: number[], rawData: Uint8Array, previousAmplitudes: number[], sampleRate: number): number[] => {
  const features: number[] = [];
  
  features.push(calculateSpectralCentroid(amplitudes, sampleRate));
  features.push(calculateSpectralRolloff(amplitudes, sampleRate));
  features.push(calculateSpectralFlux(amplitudes, previousAmplitudes));
  features.push(calculateZeroCrossingRate(rawData));

  const frequencyBands = [
    { start: 0, end: 60 }, { start: 60, end: 250 }, { start: 250, end: 500 },
    { start: 500, end: 2000 }, { start: 2000, end: 4000 }, { start: 4000, end: 22000 }
  ];
  frequencyBands.forEach(band => {
    const startBin = Math.floor((band.start / sampleRate) * FFT_SIZE);
    const endBin = Math.min(amplitudes.length, Math.floor((band.end / sampleRate) * FFT_SIZE));
    const bandEnergy = amplitudes.slice(startBin, endBin).reduce((sum, amp) => sum + amp * amp, 0);
    features.push(Math.sqrt(bandEnergy));
  });

  features.push(...calculateSpectralContrast(amplitudes));
  features.push(...calculateSimplifiedMFCC(amplitudes, sampleRate));

  // Ensure vector is exactly the correct size, padding with 0 if necessary
  while(features.length < FEATURE_VECTOR_SIZE) {
    features.push(0);
  }

  return features.slice(0, FEATURE_VECTOR_SIZE);
};

// CÁLCULO DE DISTANCIA DE MAHALANOBIS
export const calculateMahalanobisDistance = (features: number[], referenceState: ReferenceState): number => {
  if (!referenceState.initialized || !referenceState.covariance) {
    return 0;
  }
  const diff = features.map((f, i) => f - referenceState.mean[i]);
  // Simplificación: usar inversa diagonal de covarianza
  const diagCovInv = referenceState.covariance.map(cov => 1 / (cov + 1e-6));
  const distanceSquared = diff.reduce((sum, d, i) => sum + d * d * diagCovInv[i], 0);
  return Math.sqrt(distanceSquared);
};
