"""
Deterministic Fault Detection Layer.
Calculates RMS quantities, sequence ratios, voltage sags, current surges, and interruptions
to deterministically detect whether a short circuit or open circuit is active.
"""
import math
import numpy as np
from typing import Dict, List, Any
from app.models.schemas import FaultCategory, FaultType, SymmetricalComponentsSummary


def calculate_rms(signal: np.ndarray) -> float:
    """Calculates true Root Mean Square (RMS) of a discrete signal."""
    if len(signal) == 0:
        return 0.0
    return float(np.sqrt(np.mean(signal**2)))


def detect_fault(
    va: np.ndarray,
    vb: np.ndarray,
    vc: np.ndarray,
    ia: np.ndarray,
    ib: np.ndarray,
    ic: np.ndarray,
    sampling_rate: int,
    nominal_v_ln_rms: float,
    nominal_i_rms: float,
    fault_mask: np.ndarray,
    seq_summary: SymmetricalComponentsSummary,
) -> Dict[str, Any]:
    """
    Performs deterministic electrical fault detection.
    Evaluates voltage sag, current surge, current interruption, and sequence components.
    """
    # Baseline normal metrics
    v_norm_ref = max(1.0, nominal_v_ln_rms)
    i_norm_ref = max(0.1, nominal_i_rms)

    # If no fault window exists or simulation is purely normal
    if not np.any(fault_mask):
        rms_va = calculate_rms(va)
        rms_vb = calculate_rms(vb)
        rms_vc = calculate_rms(vc)
        rms_ia = calculate_rms(ia)
        rms_ib = calculate_rms(ib)
        rms_ic = calculate_rms(ic)
        return {
            "fault_detected": False,
            "fault_category": FaultCategory.NORMAL,
            "fault_type": FaultType.NORMAL,
            "affected_phases": [],
            "rms_values": {
                "va_rms": round(rms_va, 2), "vb_rms": round(rms_vb, 2), "vc_rms": round(rms_vc, 2),
                "ia_rms": round(rms_ia, 2), "ib_rms": round(rms_ib, 2), "ic_rms": round(rms_ic, 2),
            },
            "voltage_sag_percent": 0.0,
            "current_surge_ratio": 1.0,
            "phase_imbalance_ratio": 0.0,
            "current_interruption_detected": False,
        }

    # Evaluate RMS during the fault active window
    rms_va = calculate_rms(va[fault_mask])
    rms_vb = calculate_rms(vb[fault_mask])
    rms_vc = calculate_rms(vc[fault_mask])
    rms_ia = calculate_rms(ia[fault_mask])
    rms_ib = calculate_rms(ib[fault_mask])
    rms_ic = calculate_rms(ic[fault_mask])

    max_i_rms = max(rms_ia, rms_ib, rms_ic)
    min_i_rms = min(rms_ia, rms_ib, rms_ic)
    min_v_rms = min(rms_va, rms_vb, rms_vc)
    max_v_rms = max(rms_va, rms_vb, rms_vc)

    # Surge & sag indices
    surge_ratio = max_i_rms / i_norm_ref
    sag_ratio = min_v_rms / v_norm_ref
    sag_percent = max(0.0, (1.0 - sag_ratio) * 100.0)

    # Imbalance indices
    avg_i = (rms_ia + rms_ib + rms_ic) / 3.0
    imbalance_ratio = (max_i_rms - min_i_rms) / max(0.1, avg_i) if avg_i > 0 else 0.0

    # Detection thresholds:
    # 1. Short-circuit detection: current surge > 1.35x nominal OR severe voltage sag > 20%
    is_short_circuit = (surge_ratio > 1.35) or (sag_percent > 20.0 and max_i_rms > 1.15 * i_norm_ref)
    
    # 2. Open-circuit detection: any phase current drops significantly below 0.35x nominal
    # while other phases remain or imbalance is severe
    is_open_circuit = (min_i_rms < 0.35 * i_norm_ref and not is_short_circuit) or (
        max_i_rms < 0.35 * i_norm_ref and min_v_rms > 0.1 * v_norm_ref
    )

    fault_detected = is_short_circuit or is_open_circuit

    # Determine affected phases
    affected_phases = []
    category = FaultCategory.NORMAL

    if is_short_circuit:
        category = FaultCategory.SHORT_CIRCUIT
        # Phases with elevated current (> 1.25x nominal) or severe voltage drop
        if rms_ia > 1.25 * i_norm_ref or rms_va < 0.8 * v_norm_ref:
            affected_phases.append("Phase A")
        if rms_ib > 1.25 * i_norm_ref or rms_vb < 0.8 * v_norm_ref:
            affected_phases.append("Phase B")
        if rms_ic > 1.25 * i_norm_ref or rms_vc < 0.8 * v_norm_ref:
            affected_phases.append("Phase C")

    elif is_open_circuit:
        category = FaultCategory.OPEN_CIRCUIT
        # Phases with interrupted current (< 0.4x nominal)
        if rms_ia < 0.4 * i_norm_ref:
            affected_phases.append("Phase A")
        if rms_ib < 0.4 * i_norm_ref:
            affected_phases.append("Phase B")
        if rms_ic < 0.4 * i_norm_ref:
            affected_phases.append("Phase C")
        # If all 3 are low
        if len(affected_phases) == 0 and max_i_rms < 0.4 * i_norm_ref:
            affected_phases = ["Phase A", "Phase B", "Phase C"]

    return {
        "fault_detected": fault_detected,
        "fault_category": category,
        "affected_phases": affected_phases,
        "rms_values": {
            "va_rms": round(rms_va, 2), "vb_rms": round(rms_vb, 2), "vc_rms": round(rms_vc, 2),
            "ia_rms": round(rms_ia, 2), "ib_rms": round(rms_ib, 2), "ic_rms": round(rms_ic, 2),
        },
        "voltage_sag_percent": round(sag_percent, 2),
        "current_surge_ratio": round(surge_ratio, 2),
        "phase_imbalance_ratio": round(imbalance_ratio, 2),
        "current_interruption_detected": is_open_circuit,
    }
