"""
Complete Reproducible Machine Learning Pipeline Runner for SmartGridFaultAI.
Executes dataset generation, model training, evaluation, saving, and inference testing.
"""
import os
import sys
import time

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.dataset_generator import generate_dataset
from ml.train_classifier import train_fault_classifier
from ml.train_localizer import train_fault_localizer
from ml.evaluate_models import evaluate_all_models
from ml.inference import MLInferenceService
from app.models.schemas import SimulationInput, FaultCategory, FaultType
from app.simulation.engine import ElectricalSimulationEngine


def run_full_ml_pipeline(samples_per_class: int = 60, random_seed: int = 42):
    """
    Executes the entire Step 3 ML pipeline from end-to-end.
    """
    start_time = time.perf_counter()
    print("=" * 70)
    print(" SmartGridFaultAI — Stage 3 Machine Learning Pipeline Execution")
    print("=" * 70)

    # 1. Dataset Generation
    print("\n[Step 1/5] Generating physical simulation dataset...")
    df = generate_dataset(samples_per_class=samples_per_class, random_seed=random_seed)
    print(f"-> Generated {len(df)} total samples ({len(df.columns)} columns)")
    print(f"-> Class Distribution:\n{df['fault_type'].value_counts().to_string()}")

    # 2. Train Fault Classifier
    print("\n[Step 2/5] Training Random Forest Fault Classifier...")
    clf, clf_metrics = train_fault_classifier(random_seed=random_seed)

    # 3. Train Fault Distance Localizer
    print("\n[Step 3/5] Training Random Forest Fault Distance Localizer...")
    reg, reg_metrics = train_fault_localizer(random_seed=random_seed)

    # 4. Independent Evaluation on Test Set
    print("\n[Step 4/5] Running Model Evaluation...")
    eval_res = evaluate_all_models(random_seed=random_seed)

    # 5. Live Inference Verification
    print("\n[Step 5/5] Testing Live Model Inference Service...")
    svc = MLInferenceService()

    test_scenarios = [
        ("NORMAL", FaultCategory.NORMAL, FaultType.NORMAL, 0.0, 1.0),
        ("LG (Phase A)", FaultCategory.SHORT_CIRCUIT, FaultType.LG, 35.0, 2.0),
        ("LL (Phases A-B)", FaultCategory.SHORT_CIRCUIT, FaultType.LL, 25.0, 1.5),
        ("LLG (Phases A-B)", FaultCategory.SHORT_CIRCUIT, FaultType.LLG, 30.0, 2.0),
        ("LLL (Three-Phase)", FaultCategory.SHORT_CIRCUIT, FaultType.LLL, 20.0, 0.5),
        ("OPEN_CIRCUIT (Phase A)", FaultCategory.OPEN_CIRCUIT, FaultType.PHASE_A_OPEN, 30.0, 1.0),
        ("SHORT_CIRCUIT (Shunt)", FaultCategory.SHORT_CIRCUIT, FaultType.SHORT_CIRCUIT, 40.0, 2.5),
    ]

    print("\nRunning Inference on Test Scenarios:")
    for name, cat, ftype, dist, rf in test_scenarios:
        inp = SimulationInput(
            voltage_rms=11000.0,
            line_length_km=50.0,
            fault_category=cat,
            fault_type=ftype,
            fault_distance_km=dist if dist > 0 else 25.0,
            fault_resistance_ohm=rf,
            fault_start_time=0.04,
            fault_duration=0.06,
        )
        sim_out = ElectricalSimulationEngine.run_simulation(inp)
        ml_pred, ml_loc = svc.predict(sim_out, line_length_km=50.0)

        d_str = f"{ml_loc.estimated_fault_distance_km:.1f} km" if ml_loc.enabled and ml_loc.estimated_fault_distance_km is not None else "N/A"
        prob_str = f"{ml_pred.confidence * 100:.1f}%" if ml_pred.confidence else "N/A"
        print(f"  [{name:<24}] -> ML Predicted: {ml_pred.fault_type:<14} (Prob: {prob_str:<6}) | Est Dist: {d_str} (Actual: {dist} km)")

    elapsed = time.perf_counter() - start_time
    print("\n" + "=" * 70)
    print(f" Pipeline Complete in {elapsed:.2f} seconds!")
    print("=" * 70)


if __name__ == "__main__":
    run_full_ml_pipeline()
