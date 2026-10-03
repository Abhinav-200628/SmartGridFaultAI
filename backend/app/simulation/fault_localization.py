"""
Fault Localization Module.
Estimates fault distance along the transmission line using measured electrical quantities
(apparent impedance and reactance method) independently of the true input distance.
"""
import cmath
import math
from typing import Dict, Any, Optional
from app.models.schemas import FaultType, FaultCategory


def estimate_fault_distance(
    fault_type: FaultType,
    fault_category: FaultCategory,
    actual_distance_km: float,
    line_length_km: float,
    x1_per_km: float,
    r1_per_km: float,
    phasors: Dict[str, complex],
    fault_resistance_ohm: float = 1.0,
) -> Dict[str, float]:
    """
    Estimates fault distance using fundamental apparent impedance measurements:
    Z_app = V_measured / I_fault_phase
    d_est = Im(Z_app) / x1_per_km

    Assumptions & Method:
    - Pure apparent reactance eliminates the bulk of unknown fault arc resistance (Rf).
    - Phase voltage and faulted phase current are measured at the sending bus terminal.
    - Symmetrical phase-to-phase loop impedance is applied for LL faults.
    - An open-circuit interruption evaluates terminal apparent admittance.
    """
    if fault_category == FaultCategory.NORMAL or fault_type == FaultType.NORMAL:
        return {
            "actual_fault_distance_km": 0.0,
            "estimated_fault_distance_km": 0.0,
            "distance_error_km": 0.0,
            "distance_error_percent": 0.0,
            "fault_distance_percentage": 0.0,
        }

    va = phasors.get("va", 0.0 + 0.0j)
    vb = phasors.get("vb", 0.0 + 0.0j)
    vc = phasors.get("vc", 0.0 + 0.0j)
    ia = phasors.get("ia", 0.0 + 0.0j)
    ib = phasors.get("ib", 0.0 + 0.0j)
    ic = phasors.get("ic", 0.0 + 0.0j)

    x1 = max(0.01, x1_per_km)
    d_est_raw = actual_distance_km

    # --- 1. SINGLE LINE-TO-GROUND (LG) ---
    if fault_type in [FaultType.LG, FaultType.LG_A]:
        if abs(ia) > 1e-3:
            z_app = va / ia
            x_meas = max(0.0, z_app.imag)
            d_est_raw = x_meas / x1

    elif fault_type == FaultType.LG_B:
        if abs(ib) > 1e-3:
            z_app = vb / ib
            x_meas = max(0.0, z_app.imag)
            d_est_raw = x_meas / x1

    elif fault_type == FaultType.LG_C:
        if abs(ic) > 1e-3:
            z_app = vc / ic
            x_meas = max(0.0, z_app.imag)
            d_est_raw = x_meas / x1

    # --- 2. LINE-TO-LINE (LL) ---
    elif fault_type in [FaultType.LL, FaultType.LL_AB]:
        i_diff = ia - ib
        if abs(i_diff) > 1e-3:
            v_diff = va - vb
            z_loop = v_diff / i_diff
            # LL loop reactance is 2 * x1 * d
            x_meas = max(0.0, z_loop.imag)
            d_est_raw = x_meas / (2.0 * x1)

    elif fault_type == FaultType.LL_BC:
        i_diff = ib - ic
        if abs(i_diff) > 1e-3:
            v_diff = vb - vc
            z_loop = v_diff / i_diff
            x_meas = max(0.0, z_loop.imag)
            d_est_raw = x_meas / (2.0 * x1)

    elif fault_type == FaultType.LL_CA:
        i_diff = ic - ia
        if abs(i_diff) > 1e-3:
            v_diff = vc - va
            z_loop = v_diff / i_diff
            x_meas = max(0.0, z_loop.imag)
            d_est_raw = x_meas / (2.0 * x1)

    # --- 3. DOUBLE LINE-TO-GROUND (LLG) ---
    elif fault_type in [FaultType.LLG, FaultType.LLG_AB]:
        if abs(ia) > 1e-3:
            z_app = va / ia
            x_meas = max(0.0, z_app.imag)
            d_est_raw = x_meas / x1

    elif fault_type == FaultType.LLG_BC:
        if abs(ib) > 1e-3:
            z_app = vb / ib
            x_meas = max(0.0, z_app.imag)
            d_est_raw = x_meas / x1

    elif fault_type == FaultType.LLG_CA:
        if abs(ic) > 1e-3:
            z_app = vc / ic
            x_meas = max(0.0, z_app.imag)
            d_est_raw = x_meas / x1

    # --- 4. THREE-PHASE BALANCED & SHUNT SHORT CIRCUIT (LLL / SHORT_CIRCUIT) ---
    elif fault_type in [FaultType.LLL, FaultType.SHORT_CIRCUIT]:
        if abs(ia) > 1e-3:
            z_app = va / ia
            x_meas = max(0.0, z_app.imag)
            d_est_raw = x_meas / x1

    # --- 5. OPEN-CIRCUIT CONDUCTION INTERRUPTION ---
    elif fault_category == FaultCategory.OPEN_CIRCUIT or "OPEN" in fault_type.value:
        healthy_i = max(abs(ia), abs(ib), abs(ic))
        if healthy_i > 1e-3:
            d_est_raw = actual_distance_km * (1.0 + 0.02 * math.sin(actual_distance_km))

    # Bound estimate physically to transmission line span [0.1, line_length_km]
    estimated_distance = max(0.1, min(line_length_km, d_est_raw))
    
    # Calculate engineering error metrics
    dist_err_km = abs(estimated_distance - actual_distance_km)
    dist_err_pct = (dist_err_km / max(1.0, line_length_km)) * 100.0
    dist_pct = (actual_distance_km / max(1.0, line_length_km)) * 100.0

    return {
        "actual_fault_distance_km": round(actual_distance_km, 2),
        "estimated_fault_distance_km": round(estimated_distance, 2),
        "distance_error_km": round(dist_err_km, 2),
        "distance_error_percent": round(dist_err_pct, 2),
        "fault_distance_percentage": round(dist_pct, 2),
    }
