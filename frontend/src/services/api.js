/**
 * SmartGridFaultAI - Frontend API Service
 * Centralizes all communication with the FastAPI simulation engine backend.
 */
import axios from 'axios';

const API_BASE_URL = ''; // Relative URL leverages Vite proxy (/api)

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Check backend health and readiness
 */
export const checkBackendHealth = async () => {
  try {
    const response = await apiClient.get('/api/health');
    return {
      connected: true,
      data: response.data,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message || 'Unable to connect to backend server',
    };
  }
};

/**
 * Execute dynamic 3-phase simulation run
 * @param {Object} parameters Simulation configuration payload
 */
export const runSimulation = async (parameters) => {
  try {
    const response = await apiClient.post('/api/simulation/run', parameters);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    let errorMsg = 'Simulation execution failed';
    if (error.response?.data?.detail) {
      if (Array.isArray(error.response.data.detail)) {
        errorMsg = error.response.data.detail.map((d) => `${d.loc?.join('.')}: ${d.msg}`).join(', ');
      } else {
        errorMsg = String(error.response.data.detail);
      }
    } else if (error.message) {
      errorMsg = error.message;
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
};

/**
 * Standard IEEE / Utility benchmark test presets
 */
export const BENCHMARK_PRESETS = [
  {
    id: 'NORMAL_11KV',
    name: 'Normal Steady-State (11 kV, 500 kW, 0.85 PF)',
    description: 'Balanced nominal operation without disturbances',
    params: {
      voltage_rms: 11000.0,
      frequency: 50.0,
      load_kw: 500.0,
      power_factor: 0.85,
      line_length_km: 50.0,
      fault_category: 'NORMAL',
      fault_type: 'NORMAL',
      fault_phase: 'A',
      fault_distance_km: 25.0,
      fault_resistance_ohm: 1.0,
      fault_start_time: 0.04,
      fault_duration: 0.06,
      protection_delay_ms: 40.0,
    },
  },
  {
    id: 'LG_PHASE_A',
    name: 'Single Line-to-Ground (LG - Phase A, 35 km)',
    description: 'Phase A shorted to earth; zero-sequence surge and voltage drop',
    params: {
      voltage_rms: 11000.0,
      frequency: 50.0,
      load_kw: 500.0,
      power_factor: 0.85,
      line_length_km: 50.0,
      fault_category: 'SHORT_CIRCUIT',
      fault_type: 'LG',
      fault_phase: 'A',
      fault_distance_km: 35.0,
      fault_resistance_ohm: 2.0,
      fault_start_time: 0.04,
      fault_duration: 0.06,
      protection_delay_ms: 40.0,
    },
  },
  {
    id: 'LL_PHASE_AB',
    name: 'Line-to-Line (LL - Phases A-B, 25 km)',
    description: 'Severe inter-phase short circuit; dominant negative-sequence current',
    params: {
      voltage_rms: 11000.0,
      frequency: 50.0,
      load_kw: 500.0,
      power_factor: 0.85,
      line_length_km: 50.0,
      fault_category: 'SHORT_CIRCUIT',
      fault_type: 'LL',
      fault_phase_pair: 'A-B',
      fault_distance_km: 25.0,
      fault_resistance_ohm: 1.5,
      fault_start_time: 0.04,
      fault_duration: 0.06,
      protection_delay_ms: 40.0,
    },
  },
  {
    id: 'LLG_PHASE_AB',
    name: 'Double Line-to-Ground (LLG - A-B-G, 30 km)',
    description: 'Two phases shorted to earth; high zero and negative sequences',
    params: {
      voltage_rms: 11000.0,
      frequency: 50.0,
      load_kw: 500.0,
      power_factor: 0.85,
      line_length_km: 50.0,
      fault_category: 'SHORT_CIRCUIT',
      fault_type: 'LLG',
      fault_phase_pair: 'A-B',
      fault_distance_km: 30.0,
      fault_resistance_ohm: 2.0,
      fault_start_time: 0.04,
      fault_duration: 0.06,
      protection_delay_ms: 40.0,
    },
  },
  {
    id: 'LLL_SYMMETRICAL',
    name: 'Three-Phase Bolted Fault (LLL, 20 km, 0.5 Ω)',
    description: 'Symmetrical 3-phase short circuit; highest current surge and voltage collapse',
    params: {
      voltage_rms: 11000.0,
      frequency: 50.0,
      load_kw: 500.0,
      power_factor: 0.85,
      line_length_km: 50.0,
      fault_category: 'SHORT_CIRCUIT',
      fault_type: 'LLL',
      fault_distance_km: 20.0,
      fault_resistance_ohm: 0.5,
      fault_start_time: 0.04,
      fault_duration: 0.06,
      protection_delay_ms: 40.0,
    },
  },
  {
    id: 'LLLG_SYMMETRICAL',
    name: 'Three-Phase-to-Ground (LLLG, 25 km, 1.0 Ω)',
    description: 'Three-phase symmetrical short circuit with ground involvement',
    params: {
      voltage_rms: 11000.0,
      frequency: 50.0,
      load_kw: 500.0,
      power_factor: 0.85,
      line_length_km: 50.0,
      fault_category: 'SHORT_CIRCUIT',
      fault_type: 'LLLG',
      fault_distance_km: 25.0,
      fault_resistance_ohm: 1.0,
      fault_start_time: 0.04,
      fault_duration: 0.06,
      protection_delay_ms: 40.0,
    },
  },
  {
    id: 'OPEN_CIRCUIT_A',
    name: 'Conductor Break (Phase A Open-Circuit, 30 km)',
    description: 'Phase A interrupted; Ia drops to zero; unbalanced negative sequence',
    params: {
      voltage_rms: 11000.0,
      frequency: 50.0,
      load_kw: 500.0,
      power_factor: 0.85,
      line_length_km: 50.0,
      fault_category: 'OPEN_CIRCUIT',
      fault_type: 'PHASE_A_OPEN',
      fault_phase: 'A',
      fault_distance_km: 30.0,
      fault_start_time: 0.04,
      fault_duration: 0.06,
      protection_delay_ms: 40.0,
    },
  },
];
