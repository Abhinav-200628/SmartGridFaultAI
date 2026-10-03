"""
Model Inference Service for SmartGridFaultAI.
Loads the trained Random Forest classifier and regression localizer,
executes feature extraction on live simulation waveforms, and returns predictions.
"""
import os
import sys
import json
from typing import Dict, Any, Optional, Tuple
import joblib
import pandas as pd
import numpy as np

# Ensure backend root is on Python search path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models.schemas import MLPrediction, MLLocalization
from ml.feature_extractor import extract_features_from_simulation, FEATURE_COLUMNS


class MLInferenceService:
    """
    Singleton service for executing ML inference on simulation outputs.
    Maintains separate classification and localization predictions distinct
    from the baseline deterministic rule-based algorithms.
    """
    _instance: Optional["MLInferenceService"] = None

    def __init__(self, models_dir: Optional[str] = None):
        if models_dir is None:
            models_dir = os.path.join(backend_dir, "models")
        self.models_dir = models_dir

        self.classifier_path = os.path.join(models_dir, "fault_classifier.joblib")
        self.localizer_path = os.path.join(models_dir, "fault_localizer.joblib")
        self.feature_columns_path = os.path.join(models_dir, "feature_columns.json")

        self.classifier = None
        self.localizer = None
        self.feature_columns = FEATURE_COLUMNS
        self.classes = []

        self._load_models()

    @classmethod
    def get_instance(cls) -> "MLInferenceService":
        if cls._instance is None:
            cls._instance = MLInferenceService()
        return cls._instance

    def _load_models(self) -> bool:
        """Loads models from disk if present."""
        try:
            if os.path.exists(self.feature_columns_path):
                with open(self.feature_columns_path, "r", encoding="utf-8") as f:
                    self.feature_columns = json.load(f)

            if os.path.exists(self.classifier_path):
                self.classifier = joblib.load(self.classifier_path)
                self.classes = list(getattr(self.classifier, "classes_", []))

            if os.path.exists(self.localizer_path):
                self.localizer = joblib.load(self.localizer_path)

            return self.is_ready()
        except Exception as exc:
            print(f"[MLInferenceService] Warning: Error loading models: {exc}")
            return False

    def is_ready(self) -> bool:
        """Returns True if at least the classifier is loaded."""
        return self.classifier is not None

    def predict(
        self,
        sim_result: Any,
        line_length_km: float = 50.0,
    ) -> Tuple[MLPrediction, MLLocalization]:
        """
        Executes ML inference on a simulation result.

        Returns:
            Tuple[MLPrediction, MLLocalization]
        """
        # If models are not ready, return disabled response
        if not self.is_ready():
            # Attempt to re-load in case models were trained recently
            if not self._load_models():
                return (
                    MLPrediction(
                        enabled=False,
                        model_name="RandomForestClassifier (Not Trained/Loaded)",
                    ),
                    MLLocalization(
                        enabled=False,
                        model_name="RandomForestRegressor (Not Trained/Loaded)",
                    ),
                )

        try:
            # 1. Feature Extraction
            features_dict = extract_features_from_simulation(sim_result, line_length_km)

            # 2. DataFrame with exact column order
            df_in = pd.DataFrame([[features_dict[col] for col in self.feature_columns]], columns=self.feature_columns)

            # 3. Classifier Prediction & Class Probabilities
            pred_class = str(self.classifier.predict(df_in)[0])
            pred_prob = 1.0
            prob_dict = {}

            if hasattr(self.classifier, "predict_proba"):
                probs = self.classifier.predict_proba(df_in)[0]
                for cls_name, p in zip(self.classes, probs):
                    prob_dict[str(cls_name)] = round(float(p), 4)
                if pred_class in prob_dict:
                    pred_prob = prob_dict[pred_class]
                else:
                    pred_prob = float(np.max(probs))

            ml_pred = MLPrediction(
                enabled=True,
                fault_type=pred_class,
                confidence=round(float(pred_prob), 4),
                model_probability=round(float(pred_prob), 4),
                class_probabilities=prob_dict,
                model_name=type(self.classifier).__name__,
            )

            # 4. Localization Prediction
            # Note: For NORMAL steady-state, distance is physically 0.0
            if pred_class == "NORMAL":
                ml_loc = MLLocalization(
                    enabled=True,
                    estimated_fault_distance_km=0.0,
                    model_name=type(self.localizer).__name__ if self.localizer else "N/A",
                )
            elif self.localizer is not None:
                est_d = float(self.localizer.predict(df_in)[0])
                # Clamp predicted distance to physical transmission span
                clamped_d = max(0.1, min(line_length_km, est_d))
                ml_loc = MLLocalization(
                    enabled=True,
                    estimated_fault_distance_km=round(clamped_d, 2),
                    model_name=type(self.localizer).__name__,
                )
            else:
                ml_loc = MLLocalization(
                    enabled=False,
                    model_name="Localizer Not Loaded",
                )

            return ml_pred, ml_loc

        except Exception as exc:
            print(f"[MLInferenceService] Error during inference: {exc}")
            return (
                MLPrediction(
                    enabled=False,
                    model_name=f"Inference Error: {str(exc)}",
                ),
                MLLocalization(
                    enabled=False,
                    model_name=f"Inference Error: {str(exc)}",
                ),
            )
