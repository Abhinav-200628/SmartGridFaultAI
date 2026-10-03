"""
Modular Dataset Generation Pipeline for SmartGridFaultAI.
Generates balanced, reproducible simulation samples by executing the physical
electrical simulation engine across varied grid configurations and fault regimes.
"""
import os
import sys
import json
import random
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

# Ensure backend root is on Python search path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models.schemas import SimulationInput, FaultCategory, FaultType
from app.simulation.engine import ElectricalSimulationEngine
from ml.feature_extractor import extract_features_from_simulation, FEATURE_COLUMNS


SUPPORTED_ML_CLASSES: List[str] = [
    "NORMAL",
    "LG",
    "LL",
    "LLG",
    "LLL",
    "OPEN_CIRCUIT",
    "SHORT_CIRCUIT",
]


def generate_single_sample(
    target_class: str,
    rng: random.Random,
    sample_index: int,
) -> Dict[str, Any]:
    """
    Generates a single physical simulation sample for the requested target class.
    Varies grid voltage, frequency, load power, power factor, line length,
    fault distance, fault resistance, and inception angle.
    """
    # Grid base parameter variations
    voltage_options = [10500.0, 11000.0, 11500.0, 33000.0]
    voltage_rms = rng.choice(voltage_options)
    freq = rng.choice([50.0, 60.0])
    load_kw = rng.uniform(200.0, 1500.0)
    pf = rng.uniform(0.80, 0.95)
    line_len = rng.choice([30.0, 50.0, 75.0, 100.0])

    # Fault distance within 5% to 95% of transmission span
    fault_dist = round(rng.uniform(0.05 * line_len, 0.95 * line_len), 2)
    fault_res = round(rng.uniform(0.1, 12.0), 2)
    fault_start = round(rng.uniform(0.03, 0.05), 3)
    fault_dur = round(rng.uniform(0.05, 0.08), 3)

    phase_choices = ["A", "B", "C"]
    pair_choices = ["A-B", "B-C", "C-A"]
    chosen_phase = rng.choice(phase_choices)
    chosen_pair = rng.choice(pair_choices)

    if target_class == "NORMAL":
        category = FaultCategory.NORMAL
        f_type = FaultType.NORMAL
        actual_distance = 0.0
        actual_rf = 0.0
        affected_str = "None"

    elif target_class == "LG":
        category = FaultCategory.SHORT_CIRCUIT
        f_type = FaultType.LG
        actual_distance = fault_dist
        actual_rf = fault_res
        affected_str = f"Phase {chosen_phase}"

    elif target_class == "LL":
        category = FaultCategory.SHORT_CIRCUIT
        f_type = FaultType.LL
        actual_distance = fault_dist
        actual_rf = fault_res
        affected_str = chosen_pair

    elif target_class == "LLG":
        category = FaultCategory.SHORT_CIRCUIT
        f_type = FaultType.LLG
        actual_distance = fault_dist
        actual_rf = fault_res
        affected_str = chosen_pair

    elif target_class == "LLL":
        category = FaultCategory.SHORT_CIRCUIT
        f_type = FaultType.LLL
        actual_distance = fault_dist
        actual_rf = round(rng.uniform(0.05, 3.0), 2)
        affected_str = "Three-Phase Symmetrical"

    elif target_class == "OPEN_CIRCUIT":
        category = FaultCategory.OPEN_CIRCUIT
        # Mix single-phase and three-phase breaks
        if rng.random() < 0.25:
            f_type = FaultType.THREE_PHASE_OPEN
            affected_str = "Three-Phase Open"
        else:
            open_subtypes = {
                "A": FaultType.PHASE_A_OPEN,
                "B": FaultType.PHASE_B_OPEN,
                "C": FaultType.PHASE_C_OPEN,
            }
            f_type = open_subtypes[chosen_phase]
            affected_str = f"Phase {chosen_phase} Open"
        actual_distance = fault_dist
        actual_rf = 0.0

    elif target_class == "SHORT_CIRCUIT":
        category = FaultCategory.SHORT_CIRCUIT
        f_type = FaultType.SHORT_CIRCUIT
        actual_distance = fault_dist
        actual_rf = fault_res
        affected_str = "Three-Phase Shunt Short"

    else:
        raise ValueError(f"Unknown target class: {target_class}")

    payload = SimulationInput(
        voltage_rms=voltage_rms,
        frequency=freq,
        load_kw=round(load_kw, 1),
        power_factor=round(pf, 3),
        line_length_km=line_len,
        fault_category=category,
        fault_type=f_type,
        fault_phase=chosen_phase,
        fault_phase_pair=chosen_pair,
        fault_distance_km=actual_distance if target_class != "NORMAL" else 25.0,
        fault_resistance_ohm=max(0.001, actual_rf) if target_class not in ["NORMAL", "OPEN_CIRCUIT"] else 1.0,
        fault_start_time=fault_start,
        fault_duration=fault_dur,
        protection_delay_ms=40.0,
        total_time=0.16,
        sampling_rate=5000,
    )

    # Execute physical electrical simulation
    sim_result = ElectricalSimulationEngine.run_simulation(payload)

    # Extract physically meaningful features without labels
    features = extract_features_from_simulation(sim_result, line_len)

    # Append target labels
    record = dict(features)
    record["fault_type"] = target_class
    record["fault_distance_km"] = actual_distance
    record["affected_phases"] = affected_str
    record["actual_rf_ohm"] = actual_rf
    record["sample_id"] = f"{target_class}_{sample_index:04d}"

    return record


def generate_dataset(
    samples_per_class: int = 60,
    random_seed: int = 42,
    output_csv_path: Optional[str] = None,
    output_meta_path: Optional[str] = None,
) -> pd.DataFrame:
    """
    Generates a balanced dataset for smart grid fault classification and localization.

    Parameters:
        samples_per_class: Number of simulation instances per fault class
        random_seed: Seed for reproducible random parameter generation
        output_csv_path: Path to save generated CSV file
        output_meta_path: Path to save dataset metadata JSON

    Returns:
        pd.DataFrame containing the generated samples and targets
    """
    rng = random.Random(random_seed)
    np.random.seed(random_seed)

    records: List[Dict[str, Any]] = []

    print(f"[DatasetGenerator] Generating dataset: {samples_per_class} samples/class x {len(SUPPORTED_ML_CLASSES)} classes...")
    for target_class in SUPPORTED_ML_CLASSES:
        for i in range(samples_per_class):
            sample = generate_single_sample(target_class, rng, i + 1)
            records.append(sample)

    df = pd.DataFrame(records)

    # Default paths
    if output_csv_path is None:
        output_csv_path = os.path.join(backend_dir, "data", "generated", "fault_dataset.csv")
    if output_meta_path is None:
        output_meta_path = os.path.join(backend_dir, "data", "generated", "metadata.json")

    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
    df.to_csv(output_csv_path, index=False)
    print(f"[DatasetGenerator] Saved {len(df)} samples to {output_csv_path}")

    # Calculate class distribution
    class_dist = df["fault_type"].value_counts().to_dict()

    metadata = {
        "dataset_name": "SmartGridFaultAI_Simulation_Dataset",
        "random_seed": random_seed,
        "total_samples": len(df),
        "samples_per_class": samples_per_class,
        "classes": SUPPORTED_ML_CLASSES,
        "class_distribution": class_dist,
        "feature_count": len(FEATURE_COLUMNS),
        "feature_columns": FEATURE_COLUMNS,
        "classification_target": "fault_type",
        "localization_target": "fault_distance_km",
        "description": "Synthetic 3-phase electrical measurements generated from physical ODE solver for Stage 3 ML benchmarking.",
        "disclaimer": "Trained exclusively on physical simulation waveforms. Real-world utility accuracy is neither claimed nor implied.",
    }

    with open(output_meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"[DatasetGenerator] Saved metadata to {output_meta_path}")

    return df


if __name__ == "__main__":
    generate_dataset()
