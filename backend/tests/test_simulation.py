"""
Unit tests for the physics-based electrical simulation engine.
Validates waveform generation, symmetrical balance, fault dynamics, and parameter sensitivity.
"""
import pytest
import math
import numpy as np
from app.models.schemas import (
    SimulationInput,
    FaultType,
    BreakerState,
    GridStatus,
)
from app.simulation.engine import ElectricalSimulationEngine


def test_healthy_operation_waveforms():
    """Verify that normal balanced operation generates accurate 3-phase waveforms."""
    sim_input = SimulationInput(
        voltage_rms=11000.0,
        frequency=50.0,
        load_kw=500.0,
        power_factor=0.85,
        line_length_km=50.0,
        fault_type=FaultType.NORMAL,
        total_time=0.16,
        sampling_rate=5000,
    )
    result = ElectricalSimulationEngine.run_simulation(sim_input)

    expected_num_points = int(0.16 * 5000)
    assert len(result.time) == expected_num_points
    assert len(result.va) == expected_num_points
    assert len(result.vb) == expected_num_points
    assert len(result.vc) == expected_num_points
    assert len(result.ia) == expected_num_points
    assert len(result.ib) == expected_num_points
    assert len(result.ic) == expected_num_points

    # Grid status should be HEALTHY and breaker CLOSED
    assert result.grid_status == GridStatus.HEALTHY
    assert result.breaker_state == BreakerState.CLOSED
    assert result.fault_summary is None

    # Expected peak phase voltage: 11000 / sqrt(3) * sqrt(2) ~ 8981.46 V
    expected_v_peak = 11000.0 * math.sqrt(2.0 / 3.0)
    assert math.isclose(result.metrics.v_peak_normal_v, expected_v_peak, rel_tol=0.01)

    # Expected peak current: (500 kW) / (sqrt(3) * 11 kV * 0.85) * sqrt(2) ~ 43.68 A
    expected_i_rms = 500000.0 / (math.sqrt(3.0) * 11000.0 * 0.85)
    expected_i_peak = expected_i_rms * math.sqrt(2.0)
    assert math.isclose(result.metrics.i_peak_normal_a, expected_i_peak, rel_tol=0.02)


def test_single_line_to_ground_fault():
    """Verify LG_A fault creates high current surge on Phase A and drops Phase A voltage."""
    sim_input = SimulationInput(
        voltage_rms=11000.0,
        frequency=50.0,
        load_kw=500.0,
        power_factor=0.85,
        line_length_km=50.0,
        fault_type=FaultType.LG_A,
        fault_distance_km=20.0,
        fault_resistance_ohm=1.0,
        fault_start_time=0.04,
        fault_duration=0.06,
        total_time=0.16,
        sampling_rate=5000,
    )
    result = ElectricalSimulationEngine.run_simulation(sim_input)

    assert result.grid_status == GridStatus.FAULT_ISOLATED
    assert result.breaker_state == BreakerState.OPEN
    assert result.fault_summary is not None
    assert result.fault_summary.fault_type == FaultType.LG_A
    assert result.fault_summary.ground_involved is True
    assert "Phase A" in result.fault_summary.affected_phases

    # Peak fault current should be much higher than normal load current (~44 A)
    assert result.fault_summary.max_fault_current_a > 200.0


def test_line_to_line_fault():
    """Verify LL_AB fault causes equal and opposite short-circuit current on phases A and B."""
    sim_input = SimulationInput(
        voltage_rms=11000.0,
        frequency=50.0,
        load_kw=500.0,
        power_factor=0.85,
        line_length_km=50.0,
        fault_type=FaultType.LL_AB,
        fault_distance_km=25.0,
        fault_resistance_ohm=2.0,
        fault_start_time=0.04,
        fault_duration=0.06,
    )
    result = ElectricalSimulationEngine.run_simulation(sim_input)

    assert result.fault_summary is not None
    assert result.fault_summary.ground_involved is False
    assert "Phase A" in result.fault_summary.affected_phases
    assert "Phase B" in result.fault_summary.affected_phases

    # Extract current during fault window (0.05s)
    t = np.array(result.time)
    ia = np.array(result.ia)
    ib = np.array(result.ib)
    fault_idx = (t >= 0.05) & (t <= 0.08)
    
    # Phase A and Phase B currents must be anti-phase (ia + ib ~ 0)
    sum_ab = np.abs(ia[fault_idx] + ib[fault_idx])
    max_ia = np.max(np.abs(ia[fault_idx]))
    assert np.mean(sum_ab) < 0.1 * max_ia


def test_three_phase_symmetrical_fault():
    """Verify LLL fault produces high fault currents across all three phases."""
    sim_input = SimulationInput(
        voltage_rms=11000.0,
        frequency=50.0,
        load_kw=500.0,
        power_factor=0.85,
        fault_type=FaultType.LLL,
        fault_distance_km=15.0,
        fault_resistance_ohm=0.5,
    )
    result = ElectricalSimulationEngine.run_simulation(sim_input)

    assert result.fault_summary is not None
    assert len(result.fault_summary.affected_phases) == 3
    assert result.fault_summary.max_fault_current_a > 500.0


def test_open_circuit_fault():
    """Verify OPEN_CIRCUIT sets Phase A current to 0 during the fault."""
    sim_input = SimulationInput(
        voltage_rms=11000.0,
        fault_type=FaultType.OPEN_CIRCUIT,
        fault_start_time=0.04,
        fault_duration=0.06,
    )
    result = ElectricalSimulationEngine.run_simulation(sim_input)

    t = np.array(result.time)
    ia = np.array(result.ia)
    fault_idx = (t >= 0.04) & (t < 0.10)
    # Interrupted phase current is zero
    assert np.all(ia[fault_idx] == 0.0)


def test_parameter_sensitivity_changes_waveforms():
    """Verify that changing user inputs actually modifies the calculated physical waveforms."""
    input_low_v = SimulationInput(voltage_rms=400.0, load_kw=50.0, fault_type=FaultType.NORMAL)
    input_high_v = SimulationInput(voltage_rms=33000.0, load_kw=50.0, fault_type=FaultType.NORMAL)

    res_low = ElectricalSimulationEngine.run_simulation(input_low_v)
    res_high = ElectricalSimulationEngine.run_simulation(input_high_v)

    # Voltages must be vastly different
    assert res_high.metrics.v_peak_normal_v > res_low.metrics.v_peak_normal_v * 50.0

    # Changing fault resistance changes fault current
    input_rf_low = SimulationInput(fault_type=FaultType.LG_A, fault_resistance_ohm=0.1)
    input_rf_high = SimulationInput(fault_type=FaultType.LG_A, fault_resistance_ohm=50.0)

    res_rf_low = ElectricalSimulationEngine.run_simulation(input_rf_low)
    res_rf_high = ElectricalSimulationEngine.run_simulation(input_rf_high)

    assert res_rf_low.fault_summary.max_fault_current_a > res_rf_high.fault_summary.max_fault_current_a
