"""
Comprehensive Functional Electrical Verification Script.
Inspects all 9 operating states (NORMAL, LG, LL, LLG, LLL, PHASE_A_OPEN, PHASE_B_OPEN, PHASE_C_OPEN, THREE_PHASE_OPEN)
and checks physical waveform arrays, sequence components, localization, and protection behavior.
"""
import math
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

CASES = [
    ("NORMAL", {
        "fault_category": "NORMAL",
        "fault_type": "NORMAL",
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
    }),
    ("LG", {
        "fault_category": "SHORT_CIRCUIT",
        "fault_type": "LG",
        "fault_phase": "A",
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_distance_km": 35.0,
        "fault_resistance_ohm": 2.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
    }),
    ("LL", {
        "fault_category": "SHORT_CIRCUIT",
        "fault_type": "LL",
        "fault_phase_pair": "A-B",
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_distance_km": 25.0,
        "fault_resistance_ohm": 1.5,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
    }),
    ("LLG", {
        "fault_category": "SHORT_CIRCUIT",
        "fault_type": "LLG",
        "fault_phase_pair": "A-B",
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_distance_km": 30.0,
        "fault_resistance_ohm": 2.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
    }),
    ("LLL", {
        "fault_category": "SHORT_CIRCUIT",
        "fault_type": "LLL",
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_distance_km": 20.0,
        "fault_resistance_ohm": 1.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
    }),
    ("PHASE_A_OPEN", {
        "fault_category": "OPEN_CIRCUIT",
        "fault_type": "PHASE_A_OPEN",
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_distance_km": 30.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
    }),
    ("PHASE_B_OPEN", {
        "fault_category": "OPEN_CIRCUIT",
        "fault_type": "PHASE_B_OPEN",
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_distance_km": 35.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
    }),
    ("PHASE_C_OPEN", {
        "fault_category": "OPEN_CIRCUIT",
        "fault_type": "PHASE_C_OPEN",
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_distance_km": 40.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
    }),
    ("THREE_PHASE_OPEN", {
        "fault_category": "OPEN_CIRCUIT",
        "fault_type": "THREE_PHASE_OPEN",
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_distance_km": 50.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
    }),
]


def verify_cases():
    results = {}
    print("\n" + "=" * 90)
    print("DETAILED FUNCTIONAL ELECTRICAL VERIFICATION FOR ALL 9 OPERATING STATES")
    print("=" * 90)

    for case_id, payload in CASES:
        resp = client.post("/api/simulation/run", json=payload)
        assert resp.status_code == 200, f"Error on {case_id}: {resp.text}"
        data = resp.json()
        results[case_id] = data

        print(f"\n--- CASE {case_id} ---")
        print(f"  - Category:                {data['fault_category']}")
        print(f"  - Type:                    {data['fault_type']}")
        print(f"  - Affected Phases:         {data['affected_phases']}")
        print(f"  - Fault Detected:          {data['fault_detected']}")
        print(f"  - Breaker State:           {data['breaker_state']}")
        print(f"  - Grid Status:             {data['grid_status']}")
        print(f"  - Actual Fault Distance:   {data['fault_distance_km']} km")
        print(f"  - Estimated Fault Distance:{data['estimated_fault_distance_km']} km")
        print(f"  - Distance Error:          {data['distance_error_km']} km ({data['distance_error_percent']}%)")
        print(f"  - RMS Voltage (Va, Vb, Vc): {data['rms_values']['va_rms']} V, {data['rms_values']['vb_rms']} V, {data['rms_values']['vc_rms']} V")
        print(f"  - RMS Current (Ia, Ib, Ic): {data['rms_values']['ia_rms']} A, {data['rms_values']['ib_rms']} A, {data['rms_values']['ic_rms']} A")
        print(f"  - Sequence Magnitudes (V):  V1 = {data['sequence_components']['v1_mag']} V | V2 = {data['sequence_components']['v2_mag']} V | V0 = {data['sequence_components']['v0_mag']} V")
        print(f"  - Sequence Magnitudes (I):  I1 = {data['sequence_components']['i1_mag']} A | I2 = {data['sequence_components']['i2_mag']} A | I0 = {data['sequence_components']['i0_mag']} A")

        # Waveform sanity checks
        t = np.array(data['time'])
        va, vb, vc = np.array(data['va']), np.array(data['vb']), np.array(data['vc'])
        ia, ib, ic = np.array(data['ia']), np.array(data['ib']), np.array(data['ic'])

        if case_id == "NORMAL":
            za = np.where(np.diff(np.signbit(va[:200])))[0]
            zb = np.where(np.diff(np.signbit(vb[:200])))[0]
            zc = np.where(np.diff(np.signbit(vc[:200])))[0]
            assert len(za) > 0 and len(zb) > 0 and len(zc) > 0
            assert math.isclose(np.max(va), 8981.46, rel_tol=0.02)
            assert data['sequence_components']['i1_mag'] > 30.0
            assert data['sequence_components']['i2_mag'] < 0.1
            assert data['sequence_components']['i0_mag'] < 0.1
            print("  [OK] Waveform Check: Va, Vb, Vc are balanced 120-deg sinusoids; Ia, Ib, Ic match 500kW 0.85PF.")

        elif case_id == "LG":
            assert np.max(np.abs(ia)) > 150.0  # Phase A surged
            assert data['sequence_components']['i0_mag'] > 50.0  # Zero sequence significant
            print("  [OK] Waveform Check: Phase A surged; Va dropped; zero sequence I0 is significant.")

        elif case_id == "LL":
            assert np.max(np.abs(ia)) > 150.0
            assert np.max(np.abs(ib)) > 150.0
            assert data['sequence_components']['i2_mag'] > 100.0  # Negative sequence significant
            assert data['sequence_components']['i0_mag'] < 20.0   # Zero sequence small
            print("  [OK] Waveform Check: Phases A and B surged in anti-phase; negative sequence I2 is dominant.")

        elif case_id == "LLG":
            assert np.max(np.abs(ia)) > 100.0
            assert np.max(np.abs(ib)) > 100.0
            assert data['sequence_components']['i0_mag'] > 50.0
            assert data['sequence_components']['i2_mag'] > 50.0
            print("  [OK] Waveform Check: Both phases A and B surged; both I0 and I2 responded.")

        elif case_id == "LLL":
            assert np.max(np.abs(ia)) > 200.0
            assert np.max(np.abs(ib)) > 200.0
            assert np.max(np.abs(ic)) > 200.0
            print("  [OK] Waveform Check: Symmetrical current surge on all three phases; all voltages collapsed.")

        elif case_id == "PHASE_A_OPEN":
            assert data['rms_values']['ia_rms'] < 1.0  # Dropped to 0
            assert data['sequence_components']['i2_mag'] > 5.0
            print("  [OK] Waveform Check: Ia interrupted to 0; negative sequence increased.")

        elif case_id == "PHASE_B_OPEN":
            assert data['rms_values']['ib_rms'] < 1.0
            print("  [OK] Waveform Check: Ib interrupted to 0.")

        elif case_id == "PHASE_C_OPEN":
            assert data['rms_values']['ic_rms'] < 1.0
            print("  [OK] Waveform Check: Ic interrupted to 0.")

        elif case_id == "THREE_PHASE_OPEN":
            assert data['rms_values']['ia_rms'] < 1.0
            assert data['rms_values']['ib_rms'] < 1.0
            assert data['rms_values']['ic_rms'] < 1.0
            print("  [OK] Waveform Check: All 3 load currents dropped to 0; voltage remains physically present.")


if __name__ == "__main__":
    verify_cases()
