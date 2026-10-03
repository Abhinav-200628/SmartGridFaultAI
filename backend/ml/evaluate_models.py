"""
Model Evaluation and Diagnostics Script for SmartGridFaultAI.
Evaluates the trained Classifier and Localizer on test splits and outputs metrics.
"""
import os
import sys
import json
import math
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

# Ensure backend root is on Python search path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.feature_extractor import FEATURE_COLUMNS
from ml.dataset_generator import SUPPORTED_ML_CLASSES


def evaluate_all_models(
    dataset_csv: str = None,
    classifier_path: str = None,
    localizer_path: str = None,
    random_seed: int = 42,
) -> dict:
    """
    Evaluates both saved ML models on their respective test sets.
    """
    if dataset_csv is None:
        dataset_csv = os.path.join(backend_dir, "data", "generated", "fault_dataset.csv")
    if classifier_path is None:
        classifier_path = os.path.join(backend_dir, "models", "fault_classifier.joblib")
    if localizer_path is None:
        localizer_path = os.path.join(backend_dir, "models", "fault_localizer.joblib")

    if not os.path.exists(dataset_csv):
        raise FileNotFoundError(f"Dataset not found at {dataset_csv}. Run train_classifier first.")
    if not os.path.exists(classifier_path):
        raise FileNotFoundError(f"Classifier model not found at {classifier_path}.")
    if not os.path.exists(localizer_path):
        raise FileNotFoundError(f"Localizer model not found at {localizer_path}.")

    df = pd.read_csv(dataset_csv)
    clf = joblib.load(classifier_path)
    reg = joblib.load(localizer_path)

    # 1. Evaluate Classifier
    X_clf = df[FEATURE_COLUMNS]
    y_clf = df["fault_type"]
    _, X_clf_test, _, y_clf_test = train_test_split(
        X_clf, y_clf, test_size=0.20, random_state=random_seed, stratify=y_clf
    )
    y_clf_pred = clf.predict(X_clf_test)

    acc = accuracy_score(y_clf_test, y_clf_pred)
    prec_macro = precision_score(y_clf_test, y_clf_pred, average="macro", zero_division=0)
    prec_weighted = precision_score(y_clf_test, y_clf_pred, average="weighted", zero_division=0)
    rec_macro = recall_score(y_clf_test, y_clf_pred, average="macro", zero_division=0)
    rec_weighted = recall_score(y_clf_test, y_clf_pred, average="weighted", zero_division=0)
    f1_macro = f1_score(y_clf_test, y_clf_pred, average="macro", zero_division=0)
    f1_weighted = f1_score(y_clf_test, y_clf_pred, average="weighted", zero_division=0)
    cm = confusion_matrix(y_clf_test, y_clf_pred, labels=SUPPORTED_ML_CLASSES)

    # 2. Evaluate Localizer
    fault_df = df[df["fault_type"] != "NORMAL"]
    X_reg = fault_df[FEATURE_COLUMNS]
    y_reg = fault_df["fault_distance_km"]
    _, X_reg_test, _, y_reg_test = train_test_split(
        X_reg, y_reg, test_size=0.20, random_state=random_seed
    )
    y_reg_pred = reg.predict(X_reg_test)

    mae = mean_absolute_error(y_reg_test, y_reg_pred)
    mse = mean_squared_error(y_reg_test, y_reg_pred)
    rmse = math.sqrt(mse)
    r2 = r2_score(y_reg_test, y_reg_pred)

    print("=" * 70)
    print(" SmartGridFaultAI — Stage 3 ML Pipeline Evaluation Summary")
    print("=" * 70)
    print(f"Classifier Model:      {type(clf).__name__} (100 Trees)")
    print(f"Test Accuracy:         {acc * 100:.2f}%")
    print(f"Macro Precision:       {prec_macro * 100:.2f}% | Weighted: {prec_weighted * 100:.2f}%")
    print(f"Macro Recall:          {rec_macro * 100:.2f}% | Weighted: {rec_weighted * 100:.2f}%")
    print(f"Macro F1 Score:        {f1_macro * 100:.2f}% | Weighted: {f1_weighted * 100:.2f}%")
    print("-" * 70)
    print(f"Localizer Model:       {type(reg).__name__} (100 Trees)")
    print(f"Mean Absolute Error:   {mae:.2f} km")
    print(f"Root Mean Sq Error:    {rmse:.2f} km")
    print(f"R-squared (R²):        {r2:.4f}")
    print("=" * 70)

    return {
        "classifier": {
            "accuracy": round(acc, 4),
            "precision_macro": round(prec_macro, 4),
            "recall_macro": round(rec_macro, 4),
            "f1_macro": round(f1_macro, 4),
            "confusion_matrix": cm.tolist(),
        },
        "localizer": {
            "mae_km": round(mae, 3),
            "rmse_km": round(rmse, 3),
            "r2_score": round(r2, 4),
        }
    }


if __name__ == "__main__":
    evaluate_all_models()
