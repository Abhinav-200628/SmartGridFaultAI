"""
Machine Learning Fault Classifier Training Script for SmartGridFaultAI.
Trains and evaluates a Random Forest multiclass classifier on simulated electrical features.
"""
import os
import sys
import json
from typing import Dict, Any, Tuple
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

# Ensure backend root is on Python search path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.feature_extractor import FEATURE_COLUMNS
from ml.dataset_generator import SUPPORTED_ML_CLASSES, generate_dataset


def train_fault_classifier(
    dataset_csv: str = None,
    model_save_path: str = None,
    feature_columns_path: str = None,
    metrics_save_path: str = None,
    test_size: float = 0.20,
    random_seed: int = 42,
) -> Tuple[RandomForestClassifier, Dict[str, Any]]:
    """
    Trains a multiclass Random Forest fault classifier with a stratified train/test split.

    Returns:
        (trained_model, evaluation_metrics_dict)
    """
    if dataset_csv is None:
        dataset_csv = os.path.join(backend_dir, "data", "generated", "fault_dataset.csv")
    if model_save_path is None:
        model_save_path = os.path.join(backend_dir, "models", "fault_classifier.joblib")
    if feature_columns_path is None:
        feature_columns_path = os.path.join(backend_dir, "models", "feature_columns.json")
    if metrics_save_path is None:
        metrics_save_path = os.path.join(backend_dir, "data", "generated", "classifier_metrics.json")

    # If dataset doesn't exist, generate it
    if not os.path.exists(dataset_csv):
        print(f"[TrainClassifier] Dataset not found at {dataset_csv}. Generating...")
        generate_dataset(samples_per_class=60, random_seed=random_seed, output_csv_path=dataset_csv)

    df = pd.read_csv(dataset_csv)
    print(f"[TrainClassifier] Loaded {len(df)} samples from {dataset_csv}")

    # Strict Data Leakage Check:
    # Ensure neither fault_type, affected_phases, nor fault_distance_km appear in X
    leakage_targets = {"fault_type", "affected_phases", "fault_distance_km", "sample_id", "actual_rf_ohm"}
    for col in FEATURE_COLUMNS:
        assert col not in leakage_targets, f"DATA LEAKAGE DETECTED: {col} is in FEATURE_COLUMNS!"

    X = df[FEATURE_COLUMNS].copy()
    y = df["fault_type"].copy()

    # Stratified Train/Test Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_seed,
        stratify=y,
    )

    print(f"[TrainClassifier] Train set: {len(X_train)} samples, Test set: {len(X_test)} samples")

    # Train Random Forest Classifier
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=random_seed,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # Evaluate on Test Set
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)

    acc = float(accuracy_score(y_test, y_pred))
    prec_macro = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    prec_weighted = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    rec_macro = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    rec_weighted = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1_macro = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    cm = confusion_matrix(y_test, y_pred, labels=SUPPORTED_ML_CLASSES).tolist()
    report = classification_report(y_test, y_pred, labels=SUPPORTED_ML_CLASSES, output_dict=True, zero_division=0)

    # Feature Importances
    importances = dict(zip(FEATURE_COLUMNS, [round(float(x), 4) for x in clf.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    metrics_dict = {
        "model_name": "RandomForestClassifier",
        "random_seed": random_seed,
        "n_estimators": 100,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "classes": SUPPORTED_ML_CLASSES,
        "test_accuracy": round(acc, 4),
        "precision_macro": round(prec_macro, 4),
        "precision_weighted": round(prec_weighted, 4),
        "recall_macro": round(rec_macro, 4),
        "recall_weighted": round(rec_weighted, 4),
        "f1_macro": round(f1_macro, 4),
        "f1_weighted": round(f1_weighted, 4),
        "confusion_matrix": cm,
        "per_class_report": report,
        "top_features": list(sorted_importances.items())[:10],
    }

    # Save Model, Columns, and Metrics
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    joblib.dump(clf, model_save_path)
    print(f"[TrainClassifier] Saved classifier to {model_save_path}")

    with open(feature_columns_path, "w", encoding="utf-8") as f:
        json.dump(FEATURE_COLUMNS, f, indent=2)
    print(f"[TrainClassifier] Saved feature columns to {feature_columns_path}")

    os.makedirs(os.path.dirname(metrics_save_path), exist_ok=True)
    with open(metrics_save_path, "w", encoding="utf-8") as f:
        json.dump(metrics_dict, f, indent=2)
    print(f"[TrainClassifier] Saved metrics to {metrics_save_path}")

    # Display clean evaluation summary
    print("=" * 65)
    print(" FAULT CLASSIFIER EVALUATION REPORT (TEST SET)")
    print("=" * 65)
    print(f" Test Accuracy:      {acc * 100:.2f}%")
    print(f" Precision (Macro):  {prec_macro * 100:.2f}% | (Weighted): {prec_weighted * 100:.2f}%")
    print(f" Recall (Macro):     {rec_macro * 100:.2f}% | (Weighted): {rec_weighted * 100:.2f}%")
    print(f" F1 Score (Macro):   {f1_macro * 100:.2f}% | (Weighted): {f1_weighted * 100:.2f}%")
    print("-" * 65)
    print(" Per-Class Results:")
    for cls_name in SUPPORTED_ML_CLASSES:
        if cls_name in report:
            p = report[cls_name]["precision"] * 100
            r = report[cls_name]["recall"] * 100
            f = report[cls_name]["f1-score"] * 100
            s = int(report[cls_name]["support"])
            print(f"  - {cls_name:<14}: Precision={p:5.1f}%, Recall={r:5.1f}%, F1={f:5.1f}% (N={s})")
    print("=" * 65)

    return clf, metrics_dict


if __name__ == "__main__":
    train_fault_classifier()
