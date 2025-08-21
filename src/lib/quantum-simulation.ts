import type { CircuitConfig, SimulationResults } from './types';

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
    const state11 = (1 << (config.num_qubits - 1)) | 1; // |1...1> state on first and last qubit of pair
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
  
  let current_total = Object.values(counts).reduce((s,c) => s+c, 0);
  if (current_total > 0) {
    const scale = config.shots / current_total;
    let total_scaled_shots = 0;
    const keys = Object.keys(counts).map(Number);
    for(let i=0; i < keys.length - 1; i++){
      const key = keys[i];
      const scaled_count = Math.round(counts[key] * scale);
      counts[key] = scaled_count;
      total_scaled_shots += scaled_count;
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey !== undefined) {
      counts[lastKey] = config.shots - total_scaled_shots;
    }
  }

  const final_counts: Record<number, number> = {};
  for(const key in counts) {
    if(counts[key] > 0) final_counts[Number(key)] = counts[Number(key)];
  }

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
