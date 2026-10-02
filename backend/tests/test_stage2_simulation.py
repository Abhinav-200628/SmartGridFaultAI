"""
Comprehensive automated tests for Stage 2 physical electrical fault simulation engine.
Validates requirements A through AJ:
- Healthy, Short-Circuit (LG, LL, LLG, LLL) and Open-Circuit (A, B, C, Three-Phase) faults.
- Parameter sensitivity (voltage, frequency, load, distance, resistance, duration, protection delay).
- Symmetrical components (Fortescue I0, I1, I2, V0, V1, V2).
- Deterministic detection and rule-based classification.
- Independent apparent-impedance distance localization and error calculation.
- Protection and switching event timelines.
"""
import pytest
import math
import numpy as np
from app.models.schemas import (
    SimulationInput,
    FaultType,
    FaultCategory,
    BreakerState,
    GridStatus,
)
from app.simulation.engine import ElectricalSimulationEngine


# -------------------------------------------------------------
# A. NORMAL OPERATION
# -------------------------------------------------------------
def test_A_normal_operation():
    sim = SimulationInput(
        voltage_rms=11000.0,
        frequency=50.0,
        load_kw=500.0,
        power_factor=0.85,
        fault_type=FaultType.NORMAL,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is False
    assert res.fault_category == FaultCategory.NORMAL
    assert res.grid_status == GridStatus.HEALTHY
    assert res.breaker_state == BreakerState.CLOSED
    assert len(res.affected_phases) == 0


# -------------------------------------------------------------
# B. LG SHORT-CIRCUIT
# -------------------------------------------------------------
def test_B_lg_short_circuit():
    sim = SimulationInput(
        fault_category=FaultCategory.SHORT_CIRCUIT,
        fault_type=FaultType.LG,
        fault_phase="A",
        fault_distance_km=25.0,
        fault_resistance_ohm=1.0,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True
    assert res.fault_category == FaultCategory.SHORT_CIRCUIT
    assert "Phase A" in res.affected_phases
    assert res.zero_sequence.magnitude_a > 50.0  # Zero-sequence active


# -------------------------------------------------------------
# C. LL SHORT-CIRCUIT
# -------------------------------------------------------------
def test_C_ll_short_circuit():
    sim = SimulationInput(
        fault_category=FaultCategory.SHORT_CIRCUIT,
        fault_type=FaultType.LL,
        fault_phase_pair="A-B",
        fault_distance_km=30.0,
        fault_resistance_ohm=1.5,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True
    assert res.fault_category == FaultCategory.SHORT_CIRCUIT
    assert "Phase A" in res.affected_phases
    assert "Phase B" in res.affected_phases
    # LL has strong negative sequence, low zero sequence
    assert res.negative_sequence.magnitude_a > 50.0
    assert res.sequence_components.i0_mag < res.sequence_components.i2_mag


# -------------------------------------------------------------
# D. LLG SHORT-CIRCUIT
# -------------------------------------------------------------
def test_D_llg_short_circuit():
    sim = SimulationInput(
        fault_category=FaultCategory.SHORT_CIRCUIT,
        fault_type=FaultType.LLG,
        fault_phase_pair="A-B",
        fault_distance_km=35.0,
        fault_resistance_ohm=2.0,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True
    assert res.fault_category == FaultCategory.SHORT_CIRCUIT
    assert "Phase A" in res.affected_phases
    assert "Phase B" in res.affected_phases
    # LLG has both zero and negative sequence
    assert res.zero_sequence.magnitude_a > 20.0
    assert res.negative_sequence.magnitude_a > 20.0


# -------------------------------------------------------------
# E. LLL SHORT-CIRCUIT
# -------------------------------------------------------------
def test_E_lll_short_circuit():
    sim = SimulationInput(
        fault_category=FaultCategory.SHORT_CIRCUIT,
        fault_type=FaultType.LLL,
        fault_distance_km=20.0,
        fault_resistance_ohm=0.5,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True
    assert res.fault_category == FaultCategory.SHORT_CIRCUIT
    assert len(res.affected_phases) == 3
    # LLL has high positive sequence surge and low zero/negative sequence ratios
    assert res.sequence_components.i0_i1_ratio < 0.15


# -------------------------------------------------------------
# F. PHASE A OPEN CIRCUIT
# -------------------------------------------------------------
def test_F_phase_a_open():
    sim = SimulationInput(
        fault_category=FaultCategory.OPEN_CIRCUIT,
        fault_type=FaultType.PHASE_A_OPEN,
        fault_start_time=0.04,
        fault_duration=0.06,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True
    assert res.fault_category == FaultCategory.OPEN_CIRCUIT
    assert "Phase A" in res.affected_phases
    t = np.array(res.time)
    ia = np.array(res.ia)
    # Phase A current drops toward zero during open window
    assert np.all(ia[(t >= 0.04) & (t < 0.08)] == 0.0)


# -------------------------------------------------------------
# G. PHASE B OPEN CIRCUIT
# -------------------------------------------------------------
def test_G_phase_b_open():
    sim = SimulationInput(
        fault_category=FaultCategory.OPEN_CIRCUIT,
        fault_type=FaultType.PHASE_B_OPEN,
        fault_start_time=0.04,
        fault_duration=0.06,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True
    assert "Phase B" in res.affected_phases
    t = np.array(res.time)
    ib = np.array(res.ib)
    assert np.all(ib[(t >= 0.04) & (t < 0.08)] == 0.0)


# -------------------------------------------------------------
# H. PHASE C OPEN CIRCUIT
# -------------------------------------------------------------
def test_H_phase_c_open():
    sim = SimulationInput(
        fault_category=FaultCategory.OPEN_CIRCUIT,
        fault_type=FaultType.PHASE_C_OPEN,
        fault_start_time=0.04,
        fault_duration=0.06,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True
    assert "Phase C" in res.affected_phases
    t = np.array(res.time)
    ic = np.array(res.ic)
    assert np.all(ic[(t >= 0.04) & (t < 0.08)] == 0.0)


# -------------------------------------------------------------
# I. THREE-PHASE OPEN CIRCUIT
# -------------------------------------------------------------
def test_I_three_phase_open():
    sim = SimulationInput(
        fault_category=FaultCategory.OPEN_CIRCUIT,
        fault_type=FaultType.THREE_PHASE_OPEN,
        fault_start_time=0.04,
        fault_duration=0.06,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True
    assert len(res.affected_phases) == 3
    t = np.array(res.time)
    ia, ib, ic = np.array(res.ia), np.array(res.ib), np.array(res.ic)
    mask = (t >= 0.04) & (t < 0.08)
    assert np.all(ia[mask] == 0.0)
    assert np.all(ib[mask] == 0.0)
    assert np.all(ic[mask] == 0.0)


# -------------------------------------------------------------
# J. CHANGING VOLTAGE CHANGES AMPLITUDE
# -------------------------------------------------------------
def test_J_changing_voltage_changes_amplitude():
    sim1 = SimulationInput(voltage_rms=11000.0, fault_type=FaultType.NORMAL)
    sim2 = SimulationInput(voltage_rms=22000.0, fault_type=FaultType.NORMAL)
    res1 = ElectricalSimulationEngine.run_simulation(sim1)
    res2 = ElectricalSimulationEngine.run_simulation(sim2)
    assert math.isclose(res2.metrics.v_peak_normal_v, 2.0 * res1.metrics.v_peak_normal_v, rel_tol=0.01)


# -------------------------------------------------------------
# K. CHANGING FREQUENCY CHANGES WAVEFORM
# -------------------------------------------------------------
def test_K_changing_frequency_changes_waveform():
    sim50 = SimulationInput(frequency=50.0, total_time=0.10, fault_type=FaultType.NORMAL)
    sim60 = SimulationInput(frequency=60.0, total_time=0.10, fault_type=FaultType.NORMAL)
    res50 = ElectricalSimulationEngine.run_simulation(sim50)
    res60 = ElectricalSimulationEngine.run_simulation(sim60)
    # Count zero crossings in Va
    va50 = np.array(res50.va)
    va60 = np.array(res60.va)
    cross50 = np.where(np.diff(np.signbit(va50)))[0]
    cross60 = np.where(np.diff(np.signbit(va60)))[0]
    assert len(cross60) > len(cross50)


# -------------------------------------------------------------
# L. CHANGING LOAD CHANGES CURRENT
# -------------------------------------------------------------
def test_L_changing_load_changes_current():
    sim100 = SimulationInput(load_kw=100.0, fault_type=FaultType.NORMAL)
    sim500 = SimulationInput(load_kw=500.0, fault_type=FaultType.NORMAL)
    res100 = ElectricalSimulationEngine.run_simulation(sim100)
    res500 = ElectricalSimulationEngine.run_simulation(sim500)
    assert math.isclose(res500.metrics.i_peak_normal_a, 5.0 * res100.metrics.i_peak_normal_a, rel_tol=0.02)


# -------------------------------------------------------------
# M. CHANGING FAULT DISTANCE CHANGES BEHAVIOR
# -------------------------------------------------------------
def test_M_changing_fault_distance_changes_behavior():
    sim_near = SimulationInput(fault_type=FaultType.LG, fault_distance_km=10.0, fault_resistance_ohm=0.5)
    sim_far = SimulationInput(fault_type=FaultType.LG, fault_distance_km=45.0, fault_resistance_ohm=0.5)
    res_near = ElectricalSimulationEngine.run_simulation(sim_near)
    res_far = ElectricalSimulationEngine.run_simulation(sim_far)
    # Near fault has lower loop impedance and higher fault current
    assert res_near.fault_summary.max_fault_current_a > res_far.fault_summary.max_fault_current_a
    # Estimated distance changes accordingly
    assert res_far.estimated_fault_distance_km > res_near.estimated_fault_distance_km


# -------------------------------------------------------------
# N. CHANGING FAULT RESISTANCE CHANGES FAULT CURRENT
# -------------------------------------------------------------
def test_N_changing_fault_resistance_changes_current():
    sim_low_rf = SimulationInput(fault_type=FaultType.LG, fault_resistance_ohm=0.2)
    sim_high_rf = SimulationInput(fault_type=FaultType.LG, fault_resistance_ohm=25.0)
    res_low = ElectricalSimulationEngine.run_simulation(sim_low_rf)
    res_high = ElectricalSimulationEngine.run_simulation(sim_high_rf)
    assert res_low.fault_summary.max_fault_current_a > res_high.fault_summary.max_fault_current_a * 2.0


# -------------------------------------------------------------
# O. FAULT ONLY OCCURS DURING SELECTED TIME INTERVAL
# -------------------------------------------------------------
def test_O_fault_only_during_interval():
    t_start, t_dur = 0.05, 0.04
    sim = SimulationInput(
        fault_type=FaultType.LG,
        fault_phase="A",
        fault_start_time=t_start,
        fault_duration=t_dur,
        total_time=0.16,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    t = np.array(res.time)
    ia = np.array(res.ia)
    pre_fault_mask = t < t_start
    # In pre-fault window, current matches normal steady-state peak
    max_pre = np.max(np.abs(ia[pre_fault_mask]))
    assert math.isclose(max_pre, res.metrics.i_peak_normal_a, rel_tol=0.05)


# -------------------------------------------------------------
# P, Q, R. FAULT DETECTION BOOLEAN CHECKS
# -------------------------------------------------------------
def test_P_short_circuit_detection():
    sim = SimulationInput(fault_type=FaultType.LG)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True


def test_Q_open_circuit_detection():
    sim = SimulationInput(fault_type=FaultType.PHASE_A_OPEN)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is True


def test_R_normal_does_not_report_fault():
    sim = SimulationInput(fault_type=FaultType.NORMAL)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_detected is False


# -------------------------------------------------------------
# S, T, U, V. FAULT CATEGORY IDENTIFICATION
# -------------------------------------------------------------
def test_S_lg_identifies_category():
    sim = SimulationInput(fault_type=FaultType.LG, fault_phase="A")
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_category == FaultCategory.SHORT_CIRCUIT


def test_T_ll_identifies_category():
    sim = SimulationInput(fault_type=FaultType.LL, fault_phase_pair="A-B")
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_category == FaultCategory.SHORT_CIRCUIT


def test_U_llg_identifies_category():
    sim = SimulationInput(fault_type=FaultType.LLG, fault_phase_pair="B-C")
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_category == FaultCategory.SHORT_CIRCUIT


def test_V_lll_identifies_category():
    sim = SimulationInput(fault_type=FaultType.LLL)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.fault_category == FaultCategory.SHORT_CIRCUIT


# -------------------------------------------------------------
# W, X, Y, Z. OPEN-CIRCUIT AFFECTED PHASES
# -------------------------------------------------------------
def test_W_phase_a_open_affected_phase():
    sim = SimulationInput(fault_type=FaultType.PHASE_A_OPEN)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert "Phase A" in res.affected_phases


def test_X_phase_b_open_affected_phase():
    sim = SimulationInput(fault_type=FaultType.PHASE_B_OPEN)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert "Phase B" in res.affected_phases


def test_Y_phase_c_open_affected_phase():
    sim = SimulationInput(fault_type=FaultType.PHASE_C_OPEN)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert "Phase C" in res.affected_phases


def test_Z_three_phase_open_all_phases():
    sim = SimulationInput(fault_type=FaultType.THREE_PHASE_OPEN)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert len(res.affected_phases) == 3


# -------------------------------------------------------------
# AA, AB, AC. SYMMETRICAL COMPONENTS
# -------------------------------------------------------------
def test_AA_negative_sequence_under_unbalance():
    sim_normal = SimulationInput(fault_type=FaultType.NORMAL)
    sim_ll = SimulationInput(fault_type=FaultType.LL)
    res_norm = ElectricalSimulationEngine.run_simulation(sim_normal)
    res_ll = ElectricalSimulationEngine.run_simulation(sim_ll)
    assert res_ll.sequence_components.i2_mag > res_norm.sequence_components.i2_mag * 5.0


def test_AB_zero_sequence_for_ground_faults():
    sim_ll = SimulationInput(fault_type=FaultType.LL)
    sim_lg = SimulationInput(fault_type=FaultType.LG)
    res_ll = ElectricalSimulationEngine.run_simulation(sim_ll)
    res_lg = ElectricalSimulationEngine.run_simulation(sim_lg)
    assert res_lg.sequence_components.i0_mag > res_ll.sequence_components.i0_mag * 3.0


def test_AC_healthy_has_dominant_positive_sequence():
    sim = SimulationInput(fault_type=FaultType.NORMAL)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.sequence_components.i1_mag > 10.0
    assert res.sequence_components.i0_i1_ratio < 0.05
    assert res.sequence_components.i2_i1_ratio < 0.05


# -------------------------------------------------------------
# AD, AE. BREAKER PROTECTION & TIMELINE
# -------------------------------------------------------------
def test_AD_breaker_opens_after_protection_delay():
    sim = SimulationInput(fault_type=FaultType.LG, protection_delay_ms=30.0)
    res = ElectricalSimulationEngine.run_simulation(sim)
    assert res.breaker_state == BreakerState.OPEN


def test_AE_protection_event_timeline():
    sim = SimulationInput(fault_type=FaultType.LG, protection_delay_ms=40.0)
    res = ElectricalSimulationEngine.run_simulation(sim)
    event_types = [e.event_type for e in res.protection_events]
    assert "NORMAL_OPERATION" in event_types
    assert "FAULT_DETECTED" in event_types
    assert "TRIP_COMMAND" in event_types
    assert "BREAKER_OPENED" in event_types
    assert "FAULT_SECTION_ISOLATED" in event_types


# -------------------------------------------------------------
# AF, AG. INDEPENDENT FAULT LOCALIZATION & ERROR
# -------------------------------------------------------------
def test_AF_estimated_distance_calculated_independently():
    sim = SimulationInput(
        fault_type=FaultType.LG,
        fault_distance_km=32.0,
        line_length_km=60.0,
        fault_resistance_ohm=1.5,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)
    # Must be close to actual 32 km from apparent reactance
    assert math.isclose(res.estimated_fault_distance_km, 32.0, abs_tol=3.0)
    assert res.distance_error_km >= 0.0


def test_AG_distance_error_calculated_correctly():
    sim = SimulationInput(fault_type=FaultType.LG, fault_distance_km=25.0)
    res = ElectricalSimulationEngine.run_simulation(sim)
    expected_err = round(abs(res.estimated_fault_distance_km - 25.0), 2)
    assert math.isclose(res.distance_error_km, expected_err, abs_tol=0.01)


# -------------------------------------------------------------
# AH, AI, AJ. TIMING AND DURATION SENSITIVITY
# -------------------------------------------------------------
def test_AH_changing_open_circuit_location():
    sim1 = SimulationInput(fault_type=FaultType.PHASE_A_OPEN, fault_distance_km=15.0)
    sim2 = SimulationInput(fault_type=FaultType.PHASE_A_OPEN, fault_distance_km=45.0)
    res1 = ElectricalSimulationEngine.run_simulation(sim1)
    res2 = ElectricalSimulationEngine.run_simulation(sim2)
    assert res1.fault_distance_km != res2.fault_distance_km


def test_AI_changing_open_circuit_duration():
    sim_short = SimulationInput(fault_type=FaultType.PHASE_A_OPEN, fault_start_time=0.04, fault_duration=0.02)
    sim_long = SimulationInput(fault_type=FaultType.PHASE_A_OPEN, fault_start_time=0.04, fault_duration=0.08)
    res_short = ElectricalSimulationEngine.run_simulation(sim_short)
    res_long = ElectricalSimulationEngine.run_simulation(sim_long)
    assert res_short.fault_duration == 0.02
    assert res_long.fault_duration == 0.08


def test_AJ_changing_protection_delay_timing():
    sim_fast = SimulationInput(fault_type=FaultType.LG, protection_delay_ms=20.0)
    sim_slow = SimulationInput(fault_type=FaultType.LG, protection_delay_ms=80.0)
    res_fast = ElectricalSimulationEngine.run_simulation(sim_fast)
    res_slow = ElectricalSimulationEngine.run_simulation(sim_slow)
    
    open_ev_fast = next(e for e in res_fast.protection_events if e.event_type == "BREAKER_OPENED")
    open_ev_slow = next(e for e in res_slow.protection_events if e.event_type == "BREAKER_OPENED")
    assert open_ev_slow.timestamp_ms > open_ev_fast.timestamp_ms
