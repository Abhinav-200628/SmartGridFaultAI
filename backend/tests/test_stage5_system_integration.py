"""
Stage 5: System Integration Verification Suite
================================================
Validates end-to-end integration across:
- Stage 1: FastAPI server architecture, Pydantic schemas, and endpoints
- Stage 2: Three-phase physical electrical simulation engine, Fortescue sequence components
- Stage 3: ML dataset features, Random Forest classifier, and ML distance regressor
- Stage 4: Automatic switching, sectionalizer coordination, fault isolation, and restoration
- Stage 5: End-to-end payload integrity, dual-engine outputs, telemetry readiness
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_stage5_end_to_end_normal_operation():
    """Verify end-to-end normal operation returns full integrated payload with all stage fields intact."""
    payload = {
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_category": "NORMAL",
        "fault_type": "NORMAL",
        "fault_phase": "A",
        "fault_distance_km": 25.0,
        "fault_resistance_ohm": 1.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
        "line_resistance_per_km": 0.125,
        "line_reactance_per_km": 0.393,
        "total_time": 0.16,
        "auto_reconfigure": False,
    }

    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Stage 1 & 2 Core fields
    assert "time" in data
    assert "va" in data and "vb" in data and "vc" in data
    assert "ia" in data and "ib" in data and "ic" in data
    assert "sequence_components" in data
    assert data["fault_detected"] is False
    assert data["breaker_state"] == "CLOSED"
    assert data["fault_type"] == "NORMAL"
    assert data["grid_status"] == "HEALTHY"

    # Stage 3 ML Fields
    assert "ml_prediction" in data
    ml_pred = data["ml_prediction"]
    assert ml_pred is not None
    assert ml_pred["enabled"] is True
    assert "fault_type" in ml_pred
    assert "confidence" in ml_pred
    assert "class_probabilities" in ml_pred
    assert 0.0 <= ml_pred["confidence"] <= 1.0
    assert len(ml_pred["class_probabilities"]) == 7  # 7 classes
    prob_sum = sum(ml_pred["class_probabilities"].values())
    assert abs(prob_sum - 1.0) < 0.05

    # Stage 4 Switching Fields
    assert "switching_state" in data
    assert data["switching_state"] == "NORMAL"
    assert data["faulted_section_status"] == "IN_SERVICE"
    assert data["isolated_section"] is None


def test_stage5_end_to_end_lg_fault_with_dual_engine_outputs():
    """Verify single-line-to-ground fault executes physics engine, ML classifier, and ML regressor."""
    payload = {
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_category": "SHORT_CIRCUIT",
        "fault_type": "LG",
        "fault_phase": "A",
        "fault_distance_km": 20.0,
        "fault_resistance_ohm": 2.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
        "line_resistance_per_km": 0.125,
        "line_reactance_per_km": 0.393,
        "total_time": 0.16,
        "auto_reconfigure": False,
    }

    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Stage 1 & 2 validation
    assert data["fault_detected"] is True
    assert data["fault_type"] == "LG"
    assert data["breaker_state"] == "OPEN"
    assert any("A" in p for p in data["affected_phases"])

    # Physics reactance localization
    assert "fault_distance_km" in data
    assert 0 <= data["estimated_fault_distance_km"] <= 50.0
    assert "distance_error_km" in data

    # Stage 3 ML Classification
    assert data["ml_prediction"] is not None
    assert data["ml_prediction"]["enabled"] is True
    assert data["ml_prediction"]["fault_type"] in ["LG", "SHORT_CIRCUIT"]
    assert data["ml_prediction"]["confidence"] > 0.5

    # Stage 3 ML Localization
    assert data["ml_localization"] is not None
    assert data["ml_localization"]["enabled"] is True
    assert "estimated_fault_distance_km" in data["ml_localization"]
    ml_dist = data["ml_localization"]["estimated_fault_distance_km"]
    assert 0.0 <= ml_dist <= 50.0

    # Stage 4 Switching & Sectionalization
    assert data["switching_state"] == "FAULT_ISOLATED"
    assert data["faulted_section_status"] == "ISOLATED"
    assert data["isolated_section"] is not None
    assert data["isolated_section"]["status"] == "ISOLATED"


def test_stage5_auto_reconfigure_flisr_tie_switch():
    """Verify auto_reconfigure enables service restoration (SYSTEM_RESTORED) via tie-switch TS1."""
    payload = {
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_type": "LG",
        "fault_phase": "A",
        "fault_distance_km": 15.0,
        "fault_resistance_ohm": 1.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 30.0,
        "auto_reconfigure": True,
    }

    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["fault_detected"] is True
    assert data["faulted_section_status"] == "ISOLATED"
    assert data["isolated_section"] is not None
    # When auto_reconfigure is True, FLISR activates tie-switch to restore unfaulted section
    assert data["switching_state"] == "SYSTEM_RESTORED"
    assert data["grid_status"] == "SYSTEM_RESTORED"

    # Switching operations log
    event_names = [e["event"] for e in data["switching_events"]]
    assert "BREAKER_OPEN" in event_names
    assert "FAULT_ISOLATED" in event_names
    assert "RECONFIGURING" in event_names
    assert "SYSTEM_RESTORED" in event_names


def test_stage5_telemetry_waveform_export_readiness():
    """Verify waveform and telemetry series contain necessary keys and uniform sample lengths for CSV/JSON export."""
    payload = {
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_category": "SHORT_CIRCUIT",
        "fault_type": "LLG",
        "fault_phase_pair": "B-C",
        "fault_distance_km": 15.0,
        "fault_resistance_ohm": 1.5,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
        "line_resistance_per_km": 0.125,
        "line_reactance_per_km": 0.393,
        "total_time": 0.16,
        "auto_reconfigure": False,
    }

    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    times = data["time"]
    va = data["va"]
    vb = data["vb"]
    vc = data["vc"]
    ia = data["ia"]
    ib = data["ib"]
    ic = data["ic"]

    # Sample consistency check (fundamental requirement for CSV export)
    n = len(times)
    assert n > 500
    assert len(va) == n
    assert len(vb) == n
    assert len(vc) == n
    assert len(ia) == n
    assert len(ib) == n
    assert len(ic) == n

    # Symmetrical components check
    seq = data["sequence_components"]
    assert "v0_mag" in seq and "v1_mag" in seq and "v2_mag" in seq
    assert "i0_mag" in seq and "i1_mag" in seq and "i2_mag" in seq


def test_stage5_open_circuit_system_integration():
    """Verify Stage 5 integration handles asymmetrical open-circuit fault with sequence components and breaker action."""
    payload = {
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_category": "OPEN_CIRCUIT",
        "fault_type": "OPEN_CIRCUIT",
        "fault_phase": "A",
        "fault_distance_km": 25.0,
        "fault_resistance_ohm": 1.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
        "line_resistance_per_km": 0.125,
        "line_reactance_per_km": 0.393,
        "total_time": 0.16,
        "auto_reconfigure": False,
    }

    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["fault_detected"] is True
    assert data["fault_type"] == "OPEN_CIRCUIT"
    assert any("A" in p for p in data["affected_phases"])
    assert data["switching_state"] in ["FAULT_ISOLATED", "NORMAL"]
    assert data["ml_prediction"] is not None
    assert data["ml_prediction"]["enabled"] is True
    assert "fault_type" in data["ml_prediction"]
