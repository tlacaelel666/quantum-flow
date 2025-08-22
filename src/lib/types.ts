
export interface CircuitConfig {
  num_qubits: number;
  depth: number;
  circuit_type: string;
  shots: number;
  noise_level: number;
  verbose: boolean;
}

export interface ReferenceState {
  mean: number[];
  covariance: number[] | null;
  initialized: boolean;
}

export interface AudioPayload {
  pcmData: number[];
  rawData: number[];
}

export interface SimulationResults {
  counts: Record<number, number>;
  num_qubits: number;
  circuit_depth: number;
  shots: number;
  circuit_type: string;
  noise_level: number;
  statistics: {
    entropy: number;
    most_frequent_state: number;
    number_of_unique_states: number;
    distribution_uniformity: number;
  };
  logs: string[];
  referenceState?: ReferenceState;
}

// Types for the Quantum Database
export interface Complex {
  real: number;
  imaginary: number;
}

export interface QuantumState {
  amplitude: number;
  phase: number;
  qubit_state: string;
  frequency_bin: number;
}

export interface PressureWaveFeatures {
  features: number[];
  quantum_states: QuantumState[];
  fft_coefficients: Complex[];
  coherence_matrix: number[][];
}
