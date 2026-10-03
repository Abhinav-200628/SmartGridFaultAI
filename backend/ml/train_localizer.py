"""
Machine Learning Fault Localizer Training Script for SmartGridFaultAI.
Trains and evaluates a regression model to estimate fault distance (km)
using measured electrical features without target leakage.
"""
import os
import sys
import json
import math
from typing import Dict, Any, Tuple
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

# Ensure backend root is on Python search path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.feature_extractor import FEATURE_COLUMNS
from ml.dataset_generator import generate_dataset


def train_fault_localizer(
    dataset_csv: str = None,
    model_save_path: str = None,
    metrics_save_path: str = None,
    test_size: float = 0.20,
    random_seed: int = 42,
) -> Tuple[RandomForestRegressor, Dict[str, Any]]:
    """
    Trains a Random Forest Regressor to predict fault distance (km).

    CRITICAL LEAKAGE PREVENTION:
    - Input features X ONLY contain electrical measurements.
    - True fault_distance_km is strictly the regression target y.

    Returns:
        (trained_regressor, evaluation_metrics_dict)
    """
    if dataset_csv is None:
        dataset_csv = os.path.join(backend_dir, "data", "generated", "fault_dataset.csv")
    if model_save_path is None:
        model_save_path = os.path.join(backend_dir, "models", "fault_localizer.joblib")
    if metrics_save_path is None:
        metrics_save_path = os.path.join(backend_dir, "data", "generated", "localizer_metrics.json")

    # If dataset doesn't exist, generate it
    if not os.path.exists(dataset_csv):
        print(f"[TrainLocalizer] Dataset not found at {dataset_csv}. Generating...")
        generate_dataset(samples_per_class=60, random_seed=random_seed, output_csv_path=dataset_csv)

    df = pd.read_csv(dataset_csv)

    # Filter to faulted instances only (fault distance is defined only when a fault occurs)
    fault_df = df[df["fault_type"] != "NORMAL"].copy()
    print(f"[TrainLocalizer] Extracted {len(fault_df)} faulted samples (NORMAL excluded for distance regression)")

    # Strict Data Leakage Check
    assert "fault_distance_km" not in FEATURE_COLUMNS, "CRITICAL ERROR: fault_distance_km found in input features!"

    X = fault_df[FEATURE_COLUMNS].copy()
    y = fault_df["fault_distance_km"].copy()

    # Train/Test Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_seed,
    )

    print(f"[TrainLocalizer] Train set: {len(X_train)} samples, Test set: {len(X_test)} samples")

    # Train Random Forest Regressor
    reg = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=random_seed,
        n_jobs=-1,
    )
    reg.fit(X_train, y_train)

    # Evaluate on Test Set
    y_pred = reg.predict(X_test)

    mae = float(mean_absolute_error(y_test, y_pred))
    mse = float(mean_squared_error(y_test, y_pred))
    rmse = float(math.sqrt(mse))
    r2 = float(r2_score(y_test, y_pred))

    # Calculate percentage error relative to line length
    mean_span = float(X_test["line_length_km"].mean())
    pct_error = (mae / max(1.0, mean_span)) * 100.0

    metrics_dict = {
        "model_name": "RandomForestRegressor",
        "random_seed": random_seed,
        "n_estimators": 100,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "mean_line_length_km": round(mean_span, 2),
        "mae_km": round(mae, 3),
        "rmse_km": round(rmse, 3),
        "r2_score": round(r2, 4),
        "relative_error_percent": round(pct_error, 2),
        "description": "Baseline regression model estimating fault distance (km) from sending-terminal measurements.",
        "disclaimer": "Calculated strictly on test-set simulations. Real-world utility accuracy is not claimed.",
    }

    # Save Model and Metrics
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    joblib.dump(reg, model_save_path)
    print(f"[TrainLocalizer] Saved localizer to {model_save_path}")

    os.makedirs(os.path.dirname(metrics_save_path), exist_ok=True)
    with open(metrics_save_path, "w", encoding="utf-8") as f:
        json.dump(metrics_dict, f, indent=2)
    print(f"[TrainLocalizer] Saved metrics to {metrics_save_path}")

    # Display clean evaluation summary
    print("=" * 65)
    print(" FAULT LOCALIZATION REGRESSOR EVALUATION (TEST SET)")
    print("=" * 65)
    print(f" Mean Absolute Error (MAE): {mae:.2f} km")
    print(f" Root Mean Square Error:    {rmse:.2f} km")
    print(f" R-squared (R²):            {r2:.4f}")
    print(f" Relative Error of Span:    {pct_error:.2f}% (Average span = {mean_span:.1f} km)")
    print("=" * 65)

    return reg, metrics_dict


if __name__ == "__main__":
    train_fault_localizer()
