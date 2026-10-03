"""
Unit and integration tests for Stage 4:
Automatic Switching, Fault Isolation, and Circuit Breaker Protection System.

Verifies:
A. NORMAL operation (breaker CLOSED, no isolation, grid status HEALTHY)
B. LG fault (detected, protection active, breaker opens after delay, section isolated)
C. LL fault (same sequence)
D. LLG fault (same sequence)
E. LLL fault (same sequence)
F. OPEN_CIRCUIT (represented correctly, not short circuit, isolated)
G. SHORT_CIRCUIT (abnormal current detected, breaker opens after configured delay)
H. Protection delay (changing protection delay changes breaker operation time)
I. Fault start time (breaker must not operate before fault occurs)
J. Normal case (breaker must not open unnecessarily)
K. Backward compatibility (existing /api/simulation/run fields and Stage 1-3 intact)
L. Service Restoration (tie-switch restoration leads to SYSTEM_RESTORED state)
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import (
    BreakerState,
    FaultCategory,
    FaultType,
    GridStatus,
    SimulationInput,
    SwitchingState,
)
from app.simulation.engine import ElectricalSimulationEngine
from app.simulation.reconfiguration import determine_switching_action


client = TestClient(app)


# -------------------------------------------------------------
# A. NORMAL OPERATION
# -------------------------------------------------------------
def test_A_normal_operation_switching_and_protection():
    """Verify that during normal operation, breaker remains CLOSED, grid is HEALTHY, and no section is isolated."""
    sim = SimulationInput(fault_type=FaultType.NORMAL)
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.fault_detected is False
    assert res.breaker_state == BreakerState.CLOSED
    assert res.grid_status == GridStatus.HEALTHY
    assert res.switching_state == SwitchingState.NORMAL
    assert res.faulted_section_status == "IN_SERVICE"
    assert res.isolated_section is None

    # Check switching events
    events = res.switching_events
    assert len(events) >= 1
    assert events[0].event == "SYSTEM_NORMAL"
    assert events[0].breaker_state == "CLOSED"
    assert events[0].time == 0.0


# -------------------------------------------------------------
# B. LG FAULT
# -------------------------------------------------------------
def test_B_lg_fault_automatic_switching():
    """Verify LG fault triggers detection, protection arming, breaker opening, and section isolation."""
    sim = SimulationInput(
        fault_type=FaultType.LG,
        fault_phase="A",
        fault_distance_km=15.0,
        line_length_km=50.0,
        fault_start_time=0.04,
        protection_delay_ms=40.0,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.fault_detected is True
    assert res.breaker_state == BreakerState.OPEN
    assert res.switching_state == SwitchingState.FAULT_ISOLATED
    assert res.grid_status == GridStatus.FAULT_ISOLATED
    assert res.faulted_section_status == "ISOLATED"
    assert res.isolated_section is not None
    assert res.isolated_section.status == "ISOLATED"
    assert res.isolated_section.section_id == "LINE_SEC_1_SENDING"
    assert res.isolated_section.from_km == 0.0
    assert res.isolated_section.to_km == 25.0
    assert res.isolated_section.healthy_section_status == "REMAINING_IN_SERVICE"

    # Verify event progression
    event_names = [e.event for e in res.switching_events]
    assert "SYSTEM_NORMAL" in event_names
    assert "FAULT_DETECTED" in event_names
    assert "PROTECTION_ACTIVE" in event_names
    assert "BREAKER_OPEN" in event_names
    assert "FAULT_ISOLATED" in event_names


# -------------------------------------------------------------
# C. LL FAULT
# -------------------------------------------------------------
def test_C_ll_fault_automatic_switching():
    """Verify LL fault causes automatic protection trip and sectionalizer isolation."""
    sim = SimulationInput(
        fault_type=FaultType.LL,
        fault_phase_pair="A-B",
        fault_distance_km=35.0,
        line_length_km=50.0,
        fault_start_time=0.04,
        protection_delay_ms=30.0,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.fault_detected is True
    assert res.breaker_state == BreakerState.OPEN
    assert res.switching_state == SwitchingState.FAULT_ISOLATED
    assert res.faulted_section_status == "ISOLATED"
    assert res.isolated_section is not None
    # Section isolation must be derived from estimated_fault_distance_km, not actual distance
    expected_sec = (
        "LINE_SEC_1_SENDING"
        if res.estimated_fault_distance_km <= 25.0
        else "LINE_SEC_2_RECEIVING"
    )
    assert res.isolated_section.section_id == expected_sec


def test_C2_fault_isolation_receiving_section():
    """Verify that a fault located in the receiving half correctly isolates LINE_SEC_2_RECEIVING."""
    sim = SimulationInput(
        fault_type=FaultType.LG,
        fault_phase="A",
        fault_distance_km=35.0,
        line_length_km=50.0,
        fault_start_time=0.04,
        protection_delay_ms=30.0,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.fault_detected is True
    assert res.estimated_fault_distance_km > 25.0
    assert res.isolated_section is not None
    assert res.isolated_section.section_id == "LINE_SEC_2_RECEIVING"
    assert res.isolated_section.from_km == 25.0
    assert res.isolated_section.to_km == 50.0
    assert res.isolated_section.healthy_section_status == "REMAINING_IN_SERVICE"


# -------------------------------------------------------------
# D. LLG FAULT
# -------------------------------------------------------------
def test_D_llg_fault_automatic_switching():
    """Verify LLG fault triggers full automatic switching and isolation sequence."""
    sim = SimulationInput(
        fault_type=FaultType.LLG,
        fault_phase_pair="B-C",
        fault_distance_km=20.0,
        line_length_km=60.0,
        fault_start_time=0.05,
        protection_delay_ms=35.0,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.fault_detected is True
    assert res.breaker_state == BreakerState.OPEN
    assert res.switching_state == SwitchingState.FAULT_ISOLATED
    assert res.faulted_section_status == "ISOLATED"


# -------------------------------------------------------------
# E. LLL FAULT
# -------------------------------------------------------------
def test_E_lll_fault_automatic_switching():
    """Verify symmetrical 3-phase short circuit triggers breaker operation and zone isolation."""
    sim = SimulationInput(
        fault_type=FaultType.LLL,
        fault_distance_km=22.0,
        line_length_km=50.0,
        fault_start_time=0.04,
        protection_delay_ms=25.0,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.fault_detected is True
    assert res.breaker_state == BreakerState.OPEN
    assert res.switching_state == SwitchingState.FAULT_ISOLATED
    assert res.isolated_section is not None


# -------------------------------------------------------------
# F. OPEN_CIRCUIT (NOT SHORT CIRCUIT)
# -------------------------------------------------------------
def test_F_open_circuit_switching_representation():
    """Verify open-circuit condition is represented accurately with open-conductor isolation and not confused with short circuit."""
    sim = SimulationInput(
        fault_type=FaultType.PHASE_A_OPEN,
        fault_phase="A",
        fault_distance_km=30.0,
        line_length_km=50.0,
        fault_start_time=0.04,
        protection_delay_ms=40.0,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.fault_category == FaultCategory.OPEN_CIRCUIT
    assert res.fault_detected is True
    assert res.breaker_state == BreakerState.OPEN
    assert res.faulted_section_status == "ISOLATED"
    assert res.isolated_section is not None
    assert res.isolated_section.isolation_method == "OPEN_CONDUCTOR_ISOLATION"


# -------------------------------------------------------------
# G. SHORT_CIRCUIT FAULT TYPE
# -------------------------------------------------------------
def test_G_short_circuit_fault_type_switching():
    """Verify SHORT_CIRCUIT fault type trips breaker after delay and isolates faulted segment."""
    sim = SimulationInput(
        fault_type=FaultType.SHORT_CIRCUIT,
        fault_distance_km=25.0,
        line_length_km=50.0,
        fault_resistance_ohm=1.0,
        fault_start_time=0.04,
        protection_delay_ms=30.0,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.fault_detected is True
    assert res.breaker_state == BreakerState.OPEN
    assert res.switching_state == SwitchingState.FAULT_ISOLATED
    assert res.isolated_section is not None


# -------------------------------------------------------------
# H. PROTECTION DELAY SENSITIVITY
# -------------------------------------------------------------
def test_H_protection_delay_changes_breaker_timing():
    """Verify that changing protection delay changes the timestamp of breaker opening dynamically."""
    sim_fast = SimulationInput(
        fault_type=FaultType.LG,
        fault_start_time=0.04,
        protection_delay_ms=20.0,
    )
    sim_slow = SimulationInput(
        fault_type=FaultType.LG,
        fault_start_time=0.04,
        protection_delay_ms=60.0,
    )
    res_fast = ElectricalSimulationEngine.run_simulation(sim_fast)
    res_slow = ElectricalSimulationEngine.run_simulation(sim_slow)

    open_event_fast = next(e for e in res_fast.switching_events if e.event == "BREAKER_OPEN")
    open_event_slow = next(e for e in res_slow.switching_events if e.event == "BREAKER_OPEN")

    assert open_event_slow.time > open_event_fast.time
    assert round(open_event_fast.time, 3) == round(0.04 + 0.020, 3)
    assert round(open_event_slow.time, 3) == round(0.04 + 0.060, 3)


# -------------------------------------------------------------
# I. FAULT START TIME SENSITIVITY
# -------------------------------------------------------------
def test_I_breaker_does_not_operate_before_fault_occurs():
    """Verify that breaker opening timestamp is strictly after fault start time."""
    fault_start = 0.06
    delay_ms = 40.0
    sim = SimulationInput(
        fault_type=FaultType.LG,
        fault_start_time=fault_start,
        protection_delay_ms=delay_ms,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)

    open_event = next(e for e in res.switching_events if e.event == "BREAKER_OPEN")
    assert open_event.time >= fault_start + (delay_ms / 1000.0)
    assert open_event.breaker_state == "OPEN"

    # Pre-fault event must have breaker CLOSED
    pre_fault_event = next(e for e in res.switching_events if e.event == "SYSTEM_NORMAL")
    assert pre_fault_event.breaker_state == "CLOSED"
    assert pre_fault_event.time < fault_start


# -------------------------------------------------------------
# J. NORMAL CASE DOES NOT TRIP BREAKER
# -------------------------------------------------------------
def test_J_normal_case_does_not_open_breaker():
    """Verify that under healthy conditions breaker remains CLOSED and no trip events are generated."""
    sim = SimulationInput(fault_type=FaultType.NORMAL, protection_delay_ms=30.0)
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.breaker_state == BreakerState.CLOSED
    assert res.grid_status == GridStatus.HEALTHY
    assert res.faulted_section_status == "IN_SERVICE"
    assert res.isolated_section is None

    # Check that no BREAKER_OPEN event exists
    event_names = [e.event for e in res.switching_events]
    assert "BREAKER_OPEN" not in event_names
    assert "FAULT_ISOLATED" not in event_names


# -------------------------------------------------------------
# K. BACKWARD COMPATIBILITY & API VALIDATION
# -------------------------------------------------------------
def test_K_api_simulation_run_includes_stage4_fields():
    """Verify POST /api/simulation/run returns all Stage 4 attributes without breaking existing clients."""
    payload = {
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_type": "LG",
        "fault_phase": "A",
        "fault_distance_km": 20.0,
        "fault_resistance_ohm": 1.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 30.0,
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Stage 1 & Stage 2 fields
    assert "time" in data
    assert "va" in data
    assert "ia" in data
    assert "fault_detected" in data
    assert data["fault_detected"] is True
    assert "estimated_fault_distance_km" in data
    assert data["breaker_state"] == "OPEN"
    assert data["grid_status"] == "FAULT_ISOLATED"

    # Stage 3 ML fields
    assert "ml_prediction" in data
    assert "ml_localization" in data

    # Stage 4 Automatic Switching fields
    assert "switching_state" in data
    assert data["switching_state"] == "FAULT_ISOLATED"
    assert "faulted_section_status" in data
    assert data["faulted_section_status"] == "ISOLATED"
    assert "isolated_section" in data
    assert data["isolated_section"] is not None
    assert data["isolated_section"]["status"] == "ISOLATED"
    assert data["isolated_section"]["from_km"] == 0.0
    assert data["isolated_section"]["to_km"] == 25.0
    assert len(data["switching_events"]) >= 4


# -------------------------------------------------------------
# L. SERVICE RESTORATION SUPPORT (auto_reconfigure=True)
# -------------------------------------------------------------
def test_L_service_restoration_reaches_system_restored():
    """Verify that when auto_reconfigure=True, switching state reaches SYSTEM_RESTORED."""
    sim = SimulationInput(
        fault_type=FaultType.LG,
        fault_distance_km=15.0,
        line_length_km=50.0,
        fault_start_time=0.04,
        protection_delay_ms=30.0,
        auto_reconfigure=True,
    )
    res = ElectricalSimulationEngine.run_simulation(sim)

    assert res.breaker_state == BreakerState.OPEN
    assert res.switching_state == SwitchingState.SYSTEM_RESTORED
    assert res.grid_status == GridStatus.SYSTEM_RESTORED
    assert res.faulted_section_status == "ISOLATED"

    event_names = [e.event for e in res.switching_events]
    assert "BREAKER_OPEN" in event_names
    assert "FAULT_ISOLATED" in event_names
    assert "RECONFIGURING" in event_names
    assert "SYSTEM_RESTORED" in event_names
