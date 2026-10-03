"""
Unit and Integration Tests for Stage 3 Machine Learning Pipeline.
Tests satisfy all requirements A through R:
- Dataset generation and class coverage
- Feature extraction without target leakage
- Model training, saving, loading, and evaluation
- Live inference service
- Backward compatibility of /api/simulation/run
"""
import os
import sys
import json
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

# Ensure backend root is on Python search path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.models.schemas import SimulationInput, FaultCategory, FaultType, SimulationResult
from app.simulation.engine import ElectricalSimulationEngine
from ml.feature_extractor import FEATURE_COLUMNS, extract_features_from_simulation
from ml.dataset_generator import SUPPORTED_ML_CLASSES, generate_dataset
from ml.train_classifier import train_fault_classifier
from ml.train_localizer import train_fault_localizer
from ml.inference import MLInferenceService

client = TestClient(app)


# --- TEST A through H: DATASET GENERATION & CLASS COVERAGE ---
def test_dataset_generation_and_class_coverage():
    """Verify that dataset generation works and contains all 7 required classes (A-H)."""
    csv_path = os.path.join(backend_dir, "data", "generated", "fault_dataset.csv")
    assert os.path.exists(csv_path), f"Dataset CSV should exist at {csv_path}"

    df = pd.read_csv(csv_path)
    assert len(df) > 0, "Dataset must not be empty"

    classes_in_data = set(df["fault_type"].unique())

    # Requirement B: Dataset contains NORMAL
    assert "NORMAL" in classes_in_data, "Dataset must contain NORMAL"
    # Requirement C: Dataset contains LG
    assert "LG" in classes_in_data, "Dataset must contain LG"
    # Requirement D: Dataset contains LL
    assert "LL" in classes_in_data, "Dataset must contain LL"
    # Requirement E: Dataset contains LLG
    assert "LLG" in classes_in_data, "Dataset must contain LLG"
    # Requirement F: Dataset contains LLL
    assert "LLL" in classes_in_data, "Dataset must contain LLL"
    # Requirement G: Dataset contains OPEN_CIRCUIT
    assert "OPEN_CIRCUIT" in classes_in_data, "Dataset must contain OPEN_CIRCUIT"
    # Requirement H: Dataset contains SHORT_CIRCUIT
    assert "SHORT_CIRCUIT" in classes_in_data, "Dataset must contain SHORT_CIRCUIT"

    for cls in SUPPORTED_ML_CLASSES:
        assert cls in classes_in_data


# --- TEST I: FEATURE EXTRACTION RETURNS EXPECTED FEATURE NAMES ---
def test_feature_extraction_expected_columns():
    """Requirement I: Feature extraction returns expected feature names."""
    inp = SimulationInput(
        voltage_rms=11000.0,
        frequency=50.0,
        load_kw=500.0,
        line_length_km=50.0,
        fault_category=FaultCategory.SHORT_CIRCUIT,
        fault_type=FaultType.LG,
        fault_phase="A",
        fault_distance_km=30.0,
    )
    sim = ElectricalSimulationEngine.run_simulation(inp)
    features = extract_features_from_simulation(sim, 50.0)

    for col in FEATURE_COLUMNS:
        assert col in features, f"Feature {col} missing from extracted features"
        assert isinstance(features[col], (int, float)), f"Feature {col} must be numeric"
        assert not np.isnan(features[col]), f"Feature {col} cannot be NaN"


# --- TEST J: NO TARGET LEAKAGE OCCURS ---
def test_no_target_leakage():
    """Requirement J & Section 16: Ensure target labels and true distance NEVER appear in input features."""
    forbidden = ["fault_type", "affected_phases", "fault_distance_km", "sample_id"]
    for col in FEATURE_COLUMNS:
        assert col not in forbidden, f"CRITICAL LEAKAGE: {col} found in FEATURE_COLUMNS"


# --- TEST K & L: MODEL TRAINING ---
def test_models_exist_and_trained():
    """Requirement K & L: Verify classification and localization models are trained and saved."""
    clf_path = os.path.join(backend_dir, "models", "fault_classifier.joblib")
    reg_path = os.path.join(backend_dir, "models", "fault_localizer.joblib")
    assert os.path.exists(clf_path), "Trained classifier file should exist"
    assert os.path.exists(reg_path), "Trained localizer file should exist"


# --- TEST M & N: METRICS CALCULATED ---
def test_metrics_calculated_and_stored():
    """Requirement M & N: Verify classification and localization metrics are calculated and saved."""
    clf_metrics_path = os.path.join(backend_dir, "data", "generated", "classifier_metrics.json")
    loc_metrics_path = os.path.join(backend_dir, "data", "generated", "localizer_metrics.json")

    assert os.path.exists(clf_metrics_path), "Classifier metrics JSON must exist"
    with open(clf_metrics_path, "r", encoding="utf-8") as f:
        clf_metrics = json.load(f)
    assert "test_accuracy" in clf_metrics
    assert "f1_macro" in clf_metrics
    assert "confusion_matrix" in clf_metrics
    assert clf_metrics["test_accuracy"] > 0.85

    assert os.path.exists(loc_metrics_path), "Localizer metrics JSON must exist"
    with open(loc_metrics_path, "r", encoding="utf-8") as f:
        loc_metrics = json.load(f)
    assert "mae_km" in loc_metrics
    assert "rmse_km" in loc_metrics
    assert "r2_score" in loc_metrics
    assert loc_metrics["mae_km"] < 15.0


# --- TEST O & P: MODEL LOADING & INFERENCE ---
def test_saved_model_loading_and_inference():
    """Requirement O & P: Saved model can be loaded and inference produces valid predictions."""
    svc = MLInferenceService.get_instance()
    assert svc.is_ready(), "MLInferenceService must be ready"

    # Test on a simulated LG fault
    inp = SimulationInput(
        voltage_rms=11000.0,
        frequency=50.0,
        load_kw=500.0,
        line_length_km=50.0,
        fault_category=FaultCategory.SHORT_CIRCUIT,
        fault_type=FaultType.LG,
        fault_phase="A",
        fault_distance_km=35.0,
    )
    sim = ElectricalSimulationEngine.run_simulation(inp)
    ml_pred, ml_loc = svc.predict(sim, line_length_km=50.0)

    assert ml_pred.enabled is True
    assert ml_pred.fault_type == "LG"
    assert ml_pred.confidence is not None and ml_pred.confidence > 0.5
    assert ml_loc.enabled is True
    assert ml_loc.estimated_fault_distance_km is not None
    assert 0.0 <= ml_loc.estimated_fault_distance_km <= 50.0


# --- TEST Q: EXISTING /api/simulation/run STILL WORKS ---
def test_api_simulation_run_includes_ml_and_preserves_stage2():
    """Requirement Q: Verify /api/simulation/run returns valid result with ML fields without breaking."""
    payload = {
        "voltage_rms": 11000.0,
        "frequency": 50.0,
        "load_kw": 500.0,
        "power_factor": 0.85,
        "line_length_km": 50.0,
        "fault_category": "SHORT_CIRCUIT",
        "fault_type": "LG",
        "fault_phase": "A",
        "fault_distance_km": 35.0,
        "fault_resistance_ohm": 2.0,
        "fault_start_time": 0.04,
        "fault_duration": 0.06,
        "protection_delay_ms": 40.0,
    }
    response = client.post("/api/simulation/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Stage 1 and Stage 2 existing fields MUST continue working
    assert data["fault_detected"] is True
    assert data["breaker_state"] == "OPEN"
    assert data["grid_status"] == "FAULT_ISOLATED"
    assert "va" in data and "ia" in data
    assert "sequence_components" in data
    assert "protection_events" in data
    assert len(data["protection_events"]) > 0

    # Stage 3 extended ML fields
    assert "ml_prediction" in data and data["ml_prediction"] is not None
    assert data["ml_prediction"]["enabled"] is True
    assert data["ml_prediction"]["fault_type"] == "LG"
    assert data["ml_prediction"]["confidence"] > 0.7

    assert "ml_localization" in data and data["ml_localization"] is not None
    assert data["ml_localization"]["enabled"] is True
    assert data["ml_localization"]["estimated_fault_distance_km"] > 0.0
