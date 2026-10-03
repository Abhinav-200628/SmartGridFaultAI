"""
Electrical simulation engine for balanced 3-phase AC power systems and fault injection.
Calculates dynamic time-domain waveforms (Va, Vb, Vc, Ia, Ib, Ic) using physical electrical models.
Integrates symmetrical components, deterministic detection, baseline classification,
physical distance localization, and protection event sequencing.
"""
import time
import math
import numpy as np
from typing import Tuple, List, Optional, Dict, Any

from app.models.schemas import (
    SimulationInput,
    SimulationResult,
    SimulationMetrics,
    FaultSummary,
    FaultType,
    FaultCategory,
    BreakerState,
    GridStatus,
    SwitchingState,
    IsolatedSection,
)
from app.config import constants
from app.simulation.symmetrical_components import analyze_symmetrical_components
from app.simulation.fault_detection import detect_fault
from app.simulation.fault_classification import classify_fault
from app.simulation.fault_localization import estimate_fault_distance
from app.simulation.protection import generate_protection_timeline
from app.simulation.reconfiguration import generate_switching_timeline, determine_switching_action


def resolve_fault_details(inputs: SimulationInput) -> Tuple[FaultCategory, FaultType, str, str]:
    """
    Resolves category, specific type, phase, and phase-pair from inputs
    supporting both Stage 1 and Stage 2 representations.
    """
    raw_type = inputs.fault_type
    phase = (inputs.fault_phase or "A").upper()
    pair = (inputs.fault_phase_pair or "A-B").upper()

    # Map Stage 1 specific enums to Stage 2 types if needed
    if raw_type == FaultType.LG_A:
        return FaultCategory.SHORT_CIRCUIT, FaultType.LG, "A", pair
    elif raw_type == FaultType.LG_B:
        return FaultCategory.SHORT_CIRCUIT, FaultType.LG, "B", pair
    elif raw_type == FaultType.LG_C:
        return FaultCategory.SHORT_CIRCUIT, FaultType.LG, "C", pair
    elif raw_type == FaultType.LL_AB:
        return FaultCategory.SHORT_CIRCUIT, FaultType.LL, phase, "A-B"
    elif raw_type == FaultType.LL_BC:
        return FaultCategory.SHORT_CIRCUIT, FaultType.LL, phase, "B-C"
    elif raw_type == FaultType.LL_CA:
        return FaultCategory.SHORT_CIRCUIT, FaultType.LL, phase, "C-A"
    elif raw_type == FaultType.LLG_AB:
        return FaultCategory.SHORT_CIRCUIT, FaultType.LLG, phase, "A-B"
    elif raw_type == FaultType.LLG_BC:
        return FaultCategory.SHORT_CIRCUIT, FaultType.LLG, phase, "B-C"
    elif raw_type == FaultType.LLG_CA:
        return FaultCategory.SHORT_CIRCUIT, FaultType.LLG, phase, "C-A"
    elif raw_type == FaultType.OPEN_CIRCUIT:
        return FaultCategory.OPEN_CIRCUIT, FaultType.PHASE_A_OPEN, "A", pair

    # Direct Stage 2 Enums
    if raw_type == FaultType.NORMAL:
        return FaultCategory.NORMAL, FaultType.NORMAL, phase, pair

    if raw_type in [FaultType.LG, FaultType.LL, FaultType.LLG, FaultType.LLL, FaultType.LLLG, FaultType.SHORT_CIRCUIT]:
        return FaultCategory.SHORT_CIRCUIT, raw_type, phase, pair

    if raw_type == FaultType.THREE_PHASE_OPEN:
        return FaultCategory.OPEN_CIRCUIT, FaultType.THREE_PHASE_OPEN, "ABC", pair

    if raw_type in [
        FaultType.PHASE_A_OPEN,
        FaultType.PHASE_B_OPEN,
        FaultType.PHASE_C_OPEN,
    ]:
        p = "A" if raw_type == FaultType.PHASE_A_OPEN else ("B" if raw_type == FaultType.PHASE_B_OPEN else "C")
        return FaultCategory.OPEN_CIRCUIT, raw_type, p, pair

    # Fallback to category if provided
    if inputs.fault_category == FaultCategory.OPEN_CIRCUIT:
        return FaultCategory.OPEN_CIRCUIT, FaultType.PHASE_A_OPEN, phase, pair

    return FaultCategory.NORMAL, FaultType.NORMAL, phase, pair


class ElectricalSimulationEngine:
    """
    High-performance physics-based numerical simulation engine for:
    - Balanced 3-phase 50/60 Hz steady-state power flow.
    - Dynamic short-circuit faults (LG, LL, LLG, LLL) with subtransient DC offset.
    - Open-circuit faults (Phase A, B, C, and Three-Phase).
    - Protection timing, breaker clearance, and FLISR restoration.
    """

    @classmethod
    def run_simulation(cls, inputs: SimulationInput) -> SimulationResult:
        start_runtime = time.perf_counter()

        category, resolved_type, fault_phase, fault_pair = resolve_fault_details(inputs)

        # 1. Base electrical parameters
        freq = inputs.frequency
        omega = 2.0 * math.pi * freq
        v_ll_rms = inputs.voltage_rms
        v_ln_rms = v_ll_rms / math.sqrt(3.0)
        v_ln_peak = v_ln_rms * math.sqrt(2.0)

        # Load and normal current
        p_load = inputs.load_kw * 1000.0  # Watts
        pf = max(0.05, min(1.0, inputs.power_factor))
        s_load = p_load / pf              # VA
        q_load = p_load * math.tan(math.acos(pf))  # VAR
        phi = math.acos(pf)               # Power factor angle (lagging)

        i_load_rms = p_load / (math.sqrt(3.0) * v_ll_rms * pf)
        i_load_peak = i_load_rms * math.sqrt(2.0)

        # Line impedances
        d = min(inputs.fault_distance_km, inputs.line_length_km)
        r1_km = inputs.line_resistance_per_km
        x1_km = inputs.line_reactance_per_km
        l1_km = x1_km / omega

        r_line_fault = r1_km * d
        l_line_fault = l1_km * d
        x_line_fault = omega * l_line_fault

        total_r_line = r1_km * inputs.line_length_km
        total_l_line = l1_km * inputs.line_length_km
        total_z_line = math.sqrt(total_r_line**2 + (omega * total_l_line)**2)

        # Equivalent source internal impedance (500 MVA stiffness)
        s_sc_mva = 500.0e6
        z_source_mag = (v_ll_rms**2) / s_sc_mva
        x_source = 0.98 * z_source_mag
        r_source = 0.20 * z_source_mag
        l_source = x_source / omega

        # 2. Setup Time Axis
        num_points = int(inputs.total_time * inputs.sampling_rate)
        t = np.linspace(0.0, inputs.total_time, num_points, endpoint=False)

        theta_a = 0.0
        theta_b = -2.0 * math.pi / 3.0
        theta_c = 2.0 * math.pi / 3.0

        # 3. Healthy Steady-State Waveforms
        va_norm = v_ln_peak * np.sin(omega * t + theta_a)
        vb_norm = v_ln_peak * np.sin(omega * t + theta_b)
        vc_norm = v_ln_peak * np.sin(omega * t + theta_c)

        ia_norm = i_load_peak * np.sin(omega * t + theta_a - phi)
        ib_norm = i_load_peak * np.sin(omega * t + theta_b - phi)
        ic_norm = i_load_peak * np.sin(omega * t + theta_c - phi)

        va = va_norm.copy()
        vb = vb_norm.copy()
        vc = vc_norm.copy()
        ia = ia_norm.copy()
        ib = ib_norm.copy()
        ic = ic_norm.copy()

        # Fault Timing
        t_start = inputs.fault_start_time
        t_end = t_start + inputs.fault_duration
        delay_s = max(0.005, inputs.protection_delay_ms / 1000.0)
        t_breaker_open = t_start + delay_s

        fault_active_mask = (t >= t_start) & (t < t_breaker_open) & (t < t_end)
        post_clear_mask = (t >= t_breaker_open)

        affected_phases: List[str] = []
        ground_involved = False

        # 4. Fault Inception Modeling
        if category != FaultCategory.NORMAL and resolved_type != FaultType.NORMAL and np.any(fault_active_mask):
            rf = max(0.001, inputs.fault_resistance_ohm)
            t_fault_rel = t[fault_active_mask] - t_start

            # ========================================================
            # CATEGORY A: SHORT-CIRCUIT FAULTS
            # ========================================================
            if category == FaultCategory.SHORT_CIRCUIT:
                # --- A.1 SINGLE LINE-TO-GROUND (LG) ---
                if resolved_type == FaultType.LG:
                    ground_involved = True
                    r_loop = r_source + r_line_fault + rf + constants.GROUND_RESISTANCE
                    l_loop = l_source + l_line_fault + constants.GROUND_INDUCTANCE
                    z_loop = math.sqrt(r_loop**2 + (omega * l_loop)**2)
                    psi_loop = math.atan2(omega * l_loop, r_loop)
                    tau = l_loop / max(1e-6, r_loop)
                    i_sc_peak = v_ln_peak / z_loop

                    if fault_phase == "A":
                        affected_phases = ["Phase A"]
                        i_dc_init = -i_sc_peak * math.sin(omega * t_start + theta_a - psi_loop)
                        i_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + theta_a - psi_loop) + i_dc_init * np.exp(-t_fault_rel / tau)
                        ia[fault_active_mask] = i_sc
                        # Terminal voltage includes resistive and line inductive reactance drop
                        va[fault_active_mask] = i_sc * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + theta_a - psi_loop)

                    elif fault_phase == "B":
                        affected_phases = ["Phase B"]
                        i_dc_init = -i_sc_peak * math.sin(omega * t_start + theta_b - psi_loop)
                        i_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + theta_b - psi_loop) + i_dc_init * np.exp(-t_fault_rel / tau)
                        ib[fault_active_mask] = i_sc
                        vb[fault_active_mask] = i_sc * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + theta_b - psi_loop)

                    else:  # Phase C
                        affected_phases = ["Phase C"]
                        i_dc_init = -i_sc_peak * math.sin(omega * t_start + theta_c - psi_loop)
                        i_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + theta_c - psi_loop) + i_dc_init * np.exp(-t_fault_rel / tau)
                        ic[fault_active_mask] = i_sc
                        vc[fault_active_mask] = i_sc * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + theta_c - psi_loop)

                # --- A.2 LINE-TO-LINE (LL) ---
                elif resolved_type == FaultType.LL:
                    ground_involved = False
                    v_ll_peak = math.sqrt(3.0) * v_ln_peak
                    r_loop = 2.0 * (r_source + r_line_fault) + rf
                    l_loop = 2.0 * (l_source + l_line_fault)
                    z_loop = math.sqrt(r_loop**2 + (omega * l_loop)**2)
                    psi_loop = math.atan2(omega * l_loop, r_loop)
                    tau = l_loop / max(1e-6, r_loop)
                    i_sc_peak = v_ll_peak / z_loop

                    if "A" in fault_pair and "B" in fault_pair:
                        affected_phases = ["Phase A", "Phase B"]
                        phase_ref = math.pi / 6.0
                        i_dc_init = -i_sc_peak * math.sin(omega * t_start + phase_ref - psi_loop)
                        i_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + phase_ref - psi_loop) + i_dc_init * np.exp(-t_fault_rel / tau)
                        ia[fault_active_mask] = i_sc
                        ib[fault_active_mask] = -i_sc
                        v_avg = 0.5 * (va_norm[fault_active_mask] + vb_norm[fault_active_mask])
                        v_drop = 0.5 * (i_sc * (2.0 * r_line_fault + rf) + 2.0 * x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + phase_ref - psi_loop))
                        va[fault_active_mask] = v_avg + v_drop
                        vb[fault_active_mask] = v_avg - v_drop

                    elif "B" in fault_pair and "C" in fault_pair:
                        affected_phases = ["Phase B", "Phase C"]
                        phase_ref = -math.pi / 2.0
                        i_dc_init = -i_sc_peak * math.sin(omega * t_start + phase_ref - psi_loop)
                        i_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + phase_ref - psi_loop) + i_dc_init * np.exp(-t_fault_rel / tau)
                        ib[fault_active_mask] = i_sc
                        ic[fault_active_mask] = -i_sc
                        v_avg = 0.5 * (vb_norm[fault_active_mask] + vc_norm[fault_active_mask])
                        v_drop = 0.5 * (i_sc * (2.0 * r_line_fault + rf) + 2.0 * x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + phase_ref - psi_loop))
                        vb[fault_active_mask] = v_avg + v_drop
                        vc[fault_active_mask] = v_avg - v_drop

                    else:  # C-A
                        affected_phases = ["Phase C", "Phase A"]
                        phase_ref = 5.0 * math.pi / 6.0
                        i_dc_init = -i_sc_peak * math.sin(omega * t_start + phase_ref - psi_loop)
                        i_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + phase_ref - psi_loop) + i_dc_init * np.exp(-t_fault_rel / tau)
                        ic[fault_active_mask] = i_sc
                        ia[fault_active_mask] = -i_sc
                        v_avg = 0.5 * (vc_norm[fault_active_mask] + va_norm[fault_active_mask])
                        v_drop = 0.5 * (i_sc * (2.0 * r_line_fault + rf) + 2.0 * x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + phase_ref - psi_loop))
                        vc[fault_active_mask] = v_avg + v_drop
                        va[fault_active_mask] = v_avg - v_drop

                # --- A.3 DOUBLE LINE-TO-GROUND (LLG) ---
                elif resolved_type == FaultType.LLG:
                    ground_involved = True
                    r_loop = r_source + r_line_fault + 2.0 * rf + constants.GROUND_RESISTANCE
                    l_loop = l_source + l_line_fault + constants.GROUND_INDUCTANCE
                    z_loop = math.sqrt(r_loop**2 + (omega * l_loop)**2)
                    psi_loop = math.atan2(omega * l_loop, r_loop)
                    tau = l_loop / max(1e-6, r_loop)
                    i_sc_peak = (1.25 * v_ln_peak) / z_loop

                    if "A" in fault_pair and "B" in fault_pair:
                        affected_phases = ["Phase A", "Phase B"]
                        ia_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + theta_a - psi_loop) + \
                                (-i_sc_peak * math.sin(omega * t_start + theta_a - psi_loop)) * np.exp(-t_fault_rel / tau)
                        ib_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + theta_b - psi_loop) + \
                                (-i_sc_peak * math.sin(omega * t_start + theta_b - psi_loop)) * np.exp(-t_fault_rel / tau)
                        ia[fault_active_mask] = ia_sc
                        ib[fault_active_mask] = ib_sc
                        va[fault_active_mask] = ia_sc * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + theta_a - psi_loop)
                        vb[fault_active_mask] = ib_sc * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + theta_b - psi_loop)

                    elif "B" in fault_pair and "C" in fault_pair:
                        affected_phases = ["Phase B", "Phase C"]
                        ib_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + theta_b - psi_loop) + \
                                (-i_sc_peak * math.sin(omega * t_start + theta_b - psi_loop)) * np.exp(-t_fault_rel / tau)
                        ic_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + theta_c - psi_loop) + \
                                (-i_sc_peak * math.sin(omega * t_start + theta_c - psi_loop)) * np.exp(-t_fault_rel / tau)
                        ib[fault_active_mask] = ib_sc
                        ic[fault_active_mask] = ic_sc
                        vb[fault_active_mask] = ib_sc * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + theta_b - psi_loop)
                        vc[fault_active_mask] = ic_sc * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + theta_c - psi_loop)

                    else:  # C-A
                        affected_phases = ["Phase C", "Phase A"]
                        ic_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + theta_c - psi_loop) + \
                                (-i_sc_peak * math.sin(omega * t_start + theta_c - psi_loop)) * np.exp(-t_fault_rel / tau)
                        ia_sc = i_sc_peak * np.sin(omega * t[fault_active_mask] + theta_a - psi_loop) + \
                                (-i_sc_peak * math.sin(omega * t_start + theta_a - psi_loop)) * np.exp(-t_fault_rel / tau)
                        ic[fault_active_mask] = ic_sc
                        ia[fault_active_mask] = ia_sc
                        vc[fault_active_mask] = ic_sc * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + theta_c - psi_loop)
                        va[fault_active_mask] = ia_sc * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + theta_a - psi_loop)

                # --- A.4 THREE-PHASE BALANCED SHORT CIRCUIT (LLL) ---
                elif resolved_type == FaultType.LLL:
                    affected_phases = ["Phase A", "Phase B", "Phase C"]
                    ground_involved = False
                    r_loop = r_source + r_line_fault + rf
                    l_loop = l_source + l_line_fault
                    z_loop = math.sqrt(r_loop**2 + (omega * l_loop)**2)
                    psi_loop = math.atan2(omega * l_loop, r_loop)
                    tau = l_loop / max(1e-6, r_loop)
                    i_sc_peak = v_ln_peak / z_loop

                    for (arr_i, arr_v, th) in [(ia, va, theta_a), (ib, vb, theta_b), (ic, vc, theta_c)]:
                        i_dc = -i_sc_peak * math.sin(omega * t_start + th - psi_loop) * np.exp(-t_fault_rel / tau)
                        i_sym = i_sc_peak * np.sin(omega * t[fault_active_mask] + th - psi_loop) + i_dc
                        arr_i[fault_active_mask] = i_sym
                        arr_v[fault_active_mask] = i_sym * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + th - psi_loop)

                # --- A.5 GENERAL THREE-PHASE-TO-GROUND SHUNT SHORT CIRCUIT (SHORT_CIRCUIT / LLLG) ---
                elif resolved_type in (FaultType.SHORT_CIRCUIT, FaultType.LLLG):
                    affected_phases = ["Phase A", "Phase B", "Phase C"]
                    ground_involved = True
                    r_loop = r_source + r_line_fault + rf + constants.GROUND_RESISTANCE
                    l_loop = l_source + l_line_fault + constants.GROUND_INDUCTANCE
                    z_loop = math.sqrt(r_loop**2 + (omega * l_loop)**2)
                    psi_loop = math.atan2(omega * l_loop, r_loop)
                    tau = l_loop / max(1e-6, r_loop)
                    i_sc_peak = v_ln_peak / z_loop

                    for (arr_i, arr_v, th, scale) in [(ia, va, theta_a, 1.0), (ib, vb, theta_b, 0.85), (ic, vc, theta_c, 0.90)]:
                        i_dc = -i_sc_peak * scale * math.sin(omega * t_start + th - psi_loop) * np.exp(-t_fault_rel / tau)
                        i_sym = i_sc_peak * scale * np.sin(omega * t[fault_active_mask] + th - psi_loop) + i_dc
                        arr_i[fault_active_mask] = i_sym
                        arr_v[fault_active_mask] = i_sym * (r_line_fault + rf) + x_line_fault * i_sc_peak * np.cos(omega * t[fault_active_mask] + th - psi_loop)

            # ========================================================
            # CATEGORY B: OPEN-CIRCUIT CONDUCTION INTERRUPTION
            # ========================================================
            elif category == FaultCategory.OPEN_CIRCUIT:
                ground_involved = False

                # Handle THREE_PHASE_OPEN first
                if resolved_type == FaultType.THREE_PHASE_OPEN:
                    affected_phases = ["Phase A", "Phase B", "Phase C"]
                    ia[fault_active_mask] = 0.0
                    ib[fault_active_mask] = 0.0
                    ic[fault_active_mask] = 0.0
                    va[fault_active_mask] = 0.05 * va_norm[fault_active_mask]
                    vb[fault_active_mask] = 0.05 * vb_norm[fault_active_mask]
                    vc[fault_active_mask] = 0.05 * vc_norm[fault_active_mask]

                elif resolved_type == FaultType.PHASE_A_OPEN or fault_phase == "A":
                    affected_phases = ["Phase A"]
                    ia[fault_active_mask] = 0.0
                    va[fault_active_mask] = 0.15 * va_norm[fault_active_mask]

                elif resolved_type == FaultType.PHASE_B_OPEN or fault_phase == "B":
                    affected_phases = ["Phase B"]
                    ib[fault_active_mask] = 0.0
                    vb[fault_active_mask] = 0.15 * vb_norm[fault_active_mask]

                elif resolved_type == FaultType.PHASE_C_OPEN or fault_phase == "C":
                    affected_phases = ["Phase C"]
                    ic[fault_active_mask] = 0.0
                    vc[fault_active_mask] = 0.15 * vc_norm[fault_active_mask]

            # --- POST-FAULT BREAKER CLEARANCE ---
            if np.any(post_clear_mask):
                for p in affected_phases:
                    if "Phase A" in p:
                        ia[post_clear_mask] = 0.0
                        va[post_clear_mask] = 0.0
                    if "Phase B" in p:
                        ib[post_clear_mask] = 0.0
                        vb[post_clear_mask] = 0.0
                    if "Phase C" in p:
                        ic[post_clear_mask] = 0.0
                        vc[post_clear_mask] = 0.0

        # 5. Symmetrical Components Analysis
        eval_window_start = t_start if category != FaultCategory.NORMAL else 0.01
        eval_duration = min(inputs.fault_duration, 0.04)
        sym_analysis = analyze_symmetrical_components(
            va, vb, vc, ia, ib, ic,
            inputs.sampling_rate, freq,
            eval_window_start, eval_duration
        )
        seq_summary = sym_analysis["summary"]
        pos_seq = sym_analysis["positive_sequence"]
        neg_seq = sym_analysis["negative_sequence"]
        zero_seq = sym_analysis["zero_sequence"]
        phasors = sym_analysis["phasors"]

        # 6. Deterministic Fault Detection
        detection_res = detect_fault(
            va, vb, vc, ia, ib, ic,
            inputs.sampling_rate, v_ln_rms, i_load_rms,
            fault_active_mask, seq_summary
        )
        fault_detected = detection_res["fault_detected"]
        detected_category = detection_res["fault_category"]
        detected_affected_phases = detection_res["affected_phases"]
        rms_vals = detection_res["rms_values"]

        if category != FaultCategory.NORMAL and len(affected_phases) > 0:
            active_affected = affected_phases
        else:
            active_affected = detected_affected_phases

        # 7. Deterministic Baseline Classification
        classification_res = classify_fault(
            fault_detected,
            detected_category if fault_detected else FaultCategory.NORMAL,
            active_affected,
            seq_summary,
            detection_res["current_surge_ratio"],
            detection_res["voltage_sag_percent"],
            detection_res["phase_imbalance_ratio"],
        )
        detected_type = classification_res["detected_fault_type"]

        # 8. Physical Fault Localization
        loc_res = estimate_fault_distance(
            inputs.fault_type,
            category,
            inputs.fault_distance_km,
            inputs.line_length_km,
            x1_km,
            r1_km,
            phasors,
            inputs.fault_resistance_ohm,
        )

        # 9. Protection & Breaker Sequence Timeline
        breaker_state, protection_events = generate_protection_timeline(
            fault_detected,
            category,
            inputs.fault_type,
            t_start,
            inputs.protection_delay_ms,
            inputs.total_time,
        )

        # 10. Automatic Switching & Fault Isolation (Stage 4)
        auto_reconf = getattr(inputs, "auto_reconfigure", False)
        switching_state, breaker_state_sw, isolated_sec, faulted_sec_status, grid_status, switching_events = determine_switching_action(
            fault_detected=fault_detected,
            fault_category=category,
            fault_type=inputs.fault_type,
            affected_phases=active_affected,
            estimated_fault_distance_km=loc_res["estimated_fault_distance_km"],
            total_line_length_km=inputs.line_length_km,
            fault_start_time=t_start,
            protection_delay_ms=inputs.protection_delay_ms,
            total_time=inputs.total_time,
            auto_reconfigure=auto_reconf,
        )
        breaker_state = breaker_state_sw

        # 11. Assemble Legacy & Extended Metrics
        max_fault_cur = float(max(
            np.max(np.abs(ia[fault_active_mask])) if np.any(fault_active_mask) else 0.0,
            np.max(np.abs(ib[fault_active_mask])) if np.any(fault_active_mask) else 0.0,
            np.max(np.abs(ic[fault_active_mask])) if np.any(fault_active_mask) else 0.0,
        ))

        fault_summary: Optional[FaultSummary] = None
        if category != FaultCategory.NORMAL and inputs.fault_type != FaultType.NORMAL:
            fault_summary = FaultSummary(
                fault_type=inputs.fault_type,
                fault_distance_km=d,
                fault_resistance_ohm=inputs.fault_resistance_ohm,
                fault_start_time_s=t_start,
                fault_end_time_s=t_end,
                max_fault_current_a=round(max_fault_cur, 2),
                affected_phases=active_affected,
                ground_involved=ground_involved,
            )

        metrics = SimulationMetrics(
            v_peak_normal_v=round(float(v_ln_peak), 2),
            v_rms_normal_v=round(float(v_ll_rms), 2),
            i_peak_normal_a=round(float(i_load_peak), 2),
            i_rms_normal_a=round(float(i_load_rms), 2),
            v_peak_fault_v=round(float(max(np.max(np.abs(va)), np.max(np.abs(vb)), np.max(np.abs(vc)))), 2),
            i_peak_fault_a=round(float(max(np.max(np.abs(ia)), np.max(np.abs(ib)), np.max(np.abs(ic)))), 2),
            apparent_power_kva=round(float(s_load / 1000.0), 2),
            active_power_kw=round(float(p_load / 1000.0), 2),
            reactive_power_kvar=round(float(q_load / 1000.0), 2),
            line_impedance_ohm=round(float(total_z_line), 3),
        )

        elapsed_ms = (time.perf_counter() - start_runtime) * 1000.0

        param_dict = {
            "voltage_rms": v_ll_rms,
            "frequency": freq,
            "load_kw": inputs.load_kw,
            "power_factor": pf,
            "line_length_km": inputs.line_length_km,
            "fault_category": category.value,
            "fault_type": inputs.fault_type.value,
            "fault_phase": fault_phase,
            "fault_phase_pair": fault_pair,
            "fault_distance_km": inputs.fault_distance_km,
            "fault_resistance_ohm": inputs.fault_resistance_ohm,
            "fault_start_time": t_start,
            "fault_duration": inputs.fault_duration,
            "protection_delay_ms": inputs.protection_delay_ms,
            "auto_reconfigure": auto_reconf,
        }

        voltage_meas = {
            "v_peak_v": round(float(v_ln_peak), 2),
            "va_rms_v": rms_vals["va_rms"],
            "vb_rms_v": rms_vals["vb_rms"],
            "vc_rms_v": rms_vals["vc_rms"],
            "voltage_sag_percent": detection_res["voltage_sag_percent"],
        }

        current_meas = {
            "i_peak_a": round(float(i_load_peak), 2),
            "ia_rms_a": rms_vals["ia_rms"],
            "ib_rms_a": rms_vals["ib_rms"],
            "ic_rms_a": rms_vals["ic_rms"],
            "current_surge_ratio": detection_res["current_surge_ratio"],
            "phase_imbalance_ratio": detection_res["phase_imbalance_ratio"],
        }

        result = SimulationResult(
            time=[round(x, 6) for x in t.tolist()],
            va=[round(x, 2) for x in va.tolist()],
            vb=[round(x, 2) for x in vb.tolist()],
            vc=[round(x, 2) for x in vc.tolist()],
            ia=[round(x, 2) for x in ia.tolist()],
            ib=[round(x, 2) for x in ib.tolist()],
            ic=[round(x, 2) for x in ic.tolist()],
            grid_status=grid_status,
            breaker_state=breaker_state,
            metrics=metrics,
            fault_summary=fault_summary,
            simulation_duration_ms=round(elapsed_ms, 2),
            simulation_parameters=param_dict,
            rms_values=rms_vals,
            voltage_measurements=voltage_meas,
            current_measurements=current_meas,
            fault_category=category,
            fault_type=inputs.fault_type,
            affected_phases=active_affected,
            fault_detected=fault_detected,
            fault_distance_km=loc_res["actual_fault_distance_km"],
            estimated_fault_distance_km=loc_res["estimated_fault_distance_km"],
            distance_error_km=loc_res["distance_error_km"],
            distance_error_percent=loc_res["distance_error_percent"],
            distance_percentage=loc_res["fault_distance_percentage"],
            sequence_components=seq_summary,
            positive_sequence=pos_seq,
            negative_sequence=neg_seq,
            zero_sequence=zero_seq,
            protection_events=protection_events,
            switching_events=switching_events,
            fault_start_time=t_start,
            fault_duration=inputs.fault_duration,
            fault_end_time=t_end,
            switching_state=switching_state,
            faulted_section_status=faulted_sec_status,
            isolated_section=isolated_sec,
        )

        # Stage 3: Attach Machine Learning predictions (separate from rule-based baseline)
        try:
            from ml.inference import MLInferenceService
            ml_pred, ml_loc = MLInferenceService.get_instance().predict(result, inputs.line_length_km)
            result.ml_prediction = ml_pred
            result.ml_localization = ml_loc
        except Exception:
            pass

        return result
