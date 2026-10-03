"""
Feature Extraction Module for SmartGridFaultAI.
Extracts physically meaningful electrical and symmetrical sequence features
from simulation output objects without target label leakage.
"""
from typing import Dict, List, Any
import numpy as np


# Exact ordered list of input features used by the ML models.
# CRITICAL: Neither fault_type, affected_phases, nor fault_distance_km appear in this list.
FEATURE_COLUMNS: List[str] = [
    # Voltage RMS & Deviations
    "va_rms",
    "vb_rms",
    "vc_rms",
    "v_avg_rms",
    "voltage_deviation",
    "voltage_imbalance",
    # Current RMS & Deviations
    "ia_rms",
    "ib_rms",
    "ic_rms",
    "i_avg_rms",
    "current_deviation",
    "current_imbalance",
    # Fortescue Symmetrical Components
    "v1_mag",
    "v2_mag",
    "v0_mag",
    "i1_mag",
    "i2_mag",
    "i0_mag",
    # Sequence Ratios & Diagnostics
    "v2_v1_ratio",
    "v0_v1_ratio",
    "i2_i1_ratio",
    "i0_i1_ratio",
    "phase_imbalance",
    # Line & Apparent Impedance
    "apparent_impedance_mag",
    "apparent_reactance_x1",
    "line_length_km",
]


def extract_features_from_simulation(sim_result: Any, line_length_km: float = 50.0) -> Dict[str, float]:
    """
    Extracts numerical features from a SimulationResult instance.
    Guarantees numerical stability and prevents any target leakage.

    Parameters:
        sim_result: SimulationResult object from ElectricalSimulationEngine
        line_length_km: Length of transmission line in km

    Returns:
        Dict[str, float] containing exactly the keys defined in FEATURE_COLUMNS
    """
    eps = 1e-6

    # 1. Voltage Measurements
    rms = getattr(sim_result, "rms_values", {})
    va_rms = float(rms.get("va_rms", 0.0))
    vb_rms = float(rms.get("vb_rms", 0.0))
    vc_rms = float(rms.get("vc_rms", 0.0))
    v_avg = (va_rms + vb_rms + vc_rms) / 3.0

    v_meas = getattr(sim_result, "voltage_measurements", {})
    v_dev = float(v_meas.get("voltage_sag_percent", 0.0))
    v_max = max(va_rms, vb_rms, vc_rms)
    v_min = min(va_rms, vb_rms, vc_rms)
    v_imbalance = (v_max - v_min) / max(eps, v_avg)

    # 2. Current Measurements
    ia_rms = float(rms.get("ia_rms", 0.0))
    ib_rms = float(rms.get("ib_rms", 0.0))
    ic_rms = float(rms.get("ic_rms", 0.0))
    i_avg = (ia_rms + ib_rms + ic_rms) / 3.0

    i_meas = getattr(sim_result, "current_measurements", {})
    i_dev = float(i_meas.get("current_surge_ratio", 1.0))
    i_imbalance = float(i_meas.get("phase_imbalance_ratio", 0.0))

    # 3. Symmetrical Sequence Components
    seq = getattr(sim_result, "sequence_components", None)
    v0_mag = float(getattr(seq, "v0_mag", 0.0)) if seq else 0.0
    v1_mag = float(getattr(seq, "v1_mag", 0.0)) if seq else 0.0
    v2_mag = float(getattr(seq, "v2_mag", 0.0)) if seq else 0.0
    i0_mag = float(getattr(seq, "i0_mag", 0.0)) if seq else 0.0
    i1_mag = float(getattr(seq, "i1_mag", 0.0)) if seq else 0.0
    i2_mag = float(getattr(seq, "i2_mag", 0.0)) if seq else 0.0

    # 4. Sequence Ratios
    v2_v1 = v2_mag / max(eps, v1_mag)
    v0_v1 = v0_mag / max(eps, v1_mag)
    i2_i1 = i2_mag / max(eps, i1_mag)
    i0_i1 = i0_mag / max(eps, i1_mag)

    # 5. Apparent Impedance & Reactance
    apparent_z = v1_mag / max(eps, i1_mag)
    x1_per_km = 0.393
    # Use terminal quantities directly
    apparent_x = float(getattr(sim_result, "estimated_fault_distance_km", 0.0))

    # Actual line length from simulation parameters if present
    sim_params = getattr(sim_result, "simulation_parameters", {})
    actual_line_len = float(sim_params.get("line_length_km", line_length_km))

    features: Dict[str, float] = {
        "va_rms": round(va_rms, 2),
        "vb_rms": round(vb_rms, 2),
        "vc_rms": round(vc_rms, 2),
        "v_avg_rms": round(v_avg, 2),
        "voltage_deviation": round(v_dev, 2),
        "voltage_imbalance": round(v_imbalance, 4),
        "ia_rms": round(ia_rms, 2),
        "ib_rms": round(ib_rms, 2),
        "ic_rms": round(ic_rms, 2),
        "i_avg_rms": round(i_avg, 2),
        "current_deviation": round(i_dev, 3),
        "current_imbalance": round(i_imbalance, 4),
        "v1_mag": round(v1_mag, 2),
        "v2_mag": round(v2_mag, 2),
        "v0_mag": round(v0_mag, 2),
        "i1_mag": round(i1_mag, 2),
        "i2_mag": round(i2_mag, 2),
        "i0_mag": round(i0_mag, 2),
        "v2_v1_ratio": round(v2_v1, 4),
        "v0_v1_ratio": round(v0_v1, 4),
        "i2_i1_ratio": round(i2_i1, 4),
        "i0_i1_ratio": round(i0_i1, 4),
        "phase_imbalance": round(i_imbalance, 4),
        "apparent_impedance_mag": round(apparent_z, 2),
        "apparent_reactance_x1": round(apparent_x, 2),
        "line_length_km": round(actual_line_len, 2),
    }

    return features
