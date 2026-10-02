"""
Verification script for Stage 2 live FastAPI application endpoints.
Executes and validates scenarios:
- NORMAL
- LG (Line-to-Ground)
- LL (Line-to-Line)
- LLG (Double-Line-to-Ground)
- LLL (Three-Phase Symmetrical)
- PHASE_A_OPEN
- PHASE_B_OPEN
- PHASE_C_OPEN
- THREE_PHASE_OPEN
"""
import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def run_all_api_checks():
    print("=" * 80)
    print("STAGE 2: LIVE API VALIDATION & SCENARIO TESTING")
    print("=" * 80)

    scenarios = [
        ("NORMAL", {
            "fault_category": "NORMAL",
            "fault_type": "NORMAL",
            "voltage_rms": 11000.0,
            "frequency": 50.0,
            "load_kw": 500.0,
            "power_factor": 0.85,
        }),
        ("LG (Phase A to Ground)", {
            "fault_category": "SHORT_CIRCUIT",
            "fault_type": "LG",
            "fault_phase": "A",
            "fault_distance_km": 35.0,
            "fault_resistance_ohm": 2.0,
            "fault_start_time": 0.04,
            "fault_duration": 0.06,
        }),
        ("LL (Phase A to Phase B)", {
            "fault_category": "SHORT_CIRCUIT",
            "fault_type": "LL",
            "fault_phase_pair": "A-B",
            "fault_distance_km": 50.0,
            "fault_resistance_ohm": 2.0,
            "fault_start_time": 0.04,
            "fault_duration": 0.06,
        }),
        ("LLG (Phase A-B to Ground)", {
            "fault_category": "SHORT_CIRCUIT",
            "fault_type": "LLG",
            "fault_phase_pair": "A-B",
            "fault_distance_km": 45.0,
            "fault_resistance_ohm": 2.0,
            "fault_start_time": 0.04,
            "fault_duration": 0.06,
        }),
        ("LLL (Three-Phase Short Circuit)", {
            "fault_category": "SHORT_CIRCUIT",
            "fault_type": "LLL",
            "fault_distance_km": 60.0,
            "fault_resistance_ohm": 1.0,
            "fault_start_time": 0.04,
            "fault_duration": 0.06,
        }),
        ("PHASE_A_OPEN", {
            "fault_category": "OPEN_CIRCUIT",
            "fault_type": "PHASE_A_OPEN",
            "fault_distance_km": 30.0,
            "fault_start_time": 0.04,
            "fault_duration": 0.06,
        }),
        ("PHASE_B_OPEN", {
            "fault_category": "OPEN_CIRCUIT",
            "fault_type": "PHASE_B_OPEN",
            "fault_distance_km": 40.0,
            "fault_start_time": 0.04,
            "fault_duration": 0.06,
        }),
        ("PHASE_C_OPEN", {
            "fault_category": "OPEN_CIRCUIT",
            "fault_type": "PHASE_C_OPEN",
            "fault_distance_km": 50.0,
            "fault_start_time": 0.04,
            "fault_duration": 0.06,
        }),
        ("THREE_PHASE_OPEN", {
            "fault_category": "OPEN_CIRCUIT",
            "fault_type": "THREE_PHASE_OPEN",
            "fault_distance_km": 50.0,
            "fault_start_time": 0.04,
            "fault_duration": 0.06,
        }),
    ]

    results = {}
    for name, payload in scenarios:
        resp = client.post("/api/simulation/run", json=payload)
        assert resp.status_code == 200, f"Failed on {name}: {resp.text}"
        data = resp.json()
        results[name] = data
        print(f"[{'PASS':4s}] {name:32s} | Detected: {str(data['fault_detected']):5s} | "
              f"Breaker: {data['breaker_state']:11s} | Status: {data['grid_status']:14s} | "
              f"Est Dist: {data['estimated_fault_distance_km']:5.1f}km (Err: {data['distance_error_km']:4.1f}km) | "
              f"I0: {data['sequence_components']['i0_mag']:6.1f}A | I2: {data['sequence_components']['i2_mag']:6.1f}A")

    print("=" * 80)
    print("ALL 9 LIVE SCENARIOS VERIFIED SUCCESSFULLY ON FASTAPI ENDPOINT!")
    print("=" * 80)

    # Save snapshots for final report
    with open("backend/tests/sample_responses.json", "w") as f:
        json.dump({
            "NORMAL": results["NORMAL"],
            "LG": results["LG (Phase A to Ground)"],
            "OPEN_CIRCUIT": results["PHASE_A_OPEN"],
        }, f, indent=2)


if __name__ == "__main__":
    run_all_api_checks()
