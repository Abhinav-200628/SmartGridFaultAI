"""
API integration unit tests for FastAPI endpoints.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root GET / returns project metadata and status."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "SmartGridFaultAI"
    assert data["status"] == "ONLINE"


def test_health_endpoint():
    """Verify GET /api/health returns HEALTHY status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["simulation_engine"] == "READY"


def test_simulation_run_endpoint_healthy():
    """Verify POST /api/simulation/run executes healthy simulation."""
    payload = {
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_type": "NORMAL",
        "fault_distance_km": 25.0,
        "fault_resistance_ohm": 1.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "total_time": 0.16,
        "sampling_rate": 5000,
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["grid_status"] == "HEALTHY"
    assert data["breaker_state"] == "CLOSED"
    assert len(data["time"]) == 800
    assert len(data["va"]) == 800
    assert len(data["ia"]) == 800
    assert data["fault_summary"] is None


def test_simulation_run_endpoint_fault():
    """Verify POST /api/simulation/run executes fault simulation."""
    payload = {
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_type": "LG_A",
        "fault_distance_km": 15.0,
        "fault_resistance_ohm": 1.5,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["grid_status"] == "FAULT_ISOLATED"
    assert data["breaker_state"] == "OPEN"
    assert data["fault_summary"] is not None
    assert data["fault_summary"]["fault_type"] == "LG_A"
    assert data["fault_summary"]["ground_involved"] is True


def test_simulation_validation_error():
    """Verify invalid inputs trigger 422 validation error."""
    payload = {
        "voltage_rms": 10.0,  # Invalid: below minimum 100V
        "frequency": 50.0,
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 422
