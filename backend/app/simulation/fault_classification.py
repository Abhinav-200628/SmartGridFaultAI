"""
Deterministic Rule-Based Baseline Fault Classifier.
NOTE: Stage 2 uses a deterministic rule-based baseline classifier based on Fortescue
symmetrical component ratios, current surge, and phase interruption signatures.
A trained machine-learning model will be integrated in a later stage.
"""
from typing import Dict, List, Any
from app.models.schemas import FaultCategory, FaultType, SymmetricalComponentsSummary


def classify_fault(
    fault_detected: bool,
    category: FaultCategory,
    affected_phases: List[str],
    seq_summary: SymmetricalComponentsSummary,
    surge_ratio: float,
    sag_percent: float,
    imbalance_ratio: float,
) -> Dict[str, Any]:
    """
    Classifies the fault type deterministically using physical sequence component ratios:
    - Normal: I0/I1 ~ 0, I2/I1 ~ 0, surge ~ 1.0
    - LLL: High surge, balanced (I0/I1 < 0.15, I2/I1 < 0.15), 3 phases
    - LLG: 2 phases, I0/I1 > 0.15 (ground return active)
    - LL: 2 phases, I0/I1 < 0.15, high I2/I1 (unbalanced, no ground)
    - LG: 1 phase, significant I0/I1 and I2/I1
    - Open-Circuit: Current drop, high negative sequence or complete interruption
    """
    classifier_note = (
        "Stage 2 uses a deterministic rule-based baseline classifier. "
        "A trained machine-learning model will be integrated in a later stage."
    )

    if not fault_detected or category == FaultCategory.NORMAL:
        return {
            "detected_fault_category": FaultCategory.NORMAL,
            "detected_fault_type": FaultType.NORMAL,
            "affected_phases": [],
            "classification_confidence": 0.99,
            "classifier_type": "Deterministic Rule-Based Baseline",
            "classifier_note": classifier_note,
        }

    i0_ratio = seq_summary.i0_i1_ratio
    i2_ratio = seq_summary.i2_i1_ratio
    num_phases = len(affected_phases)

    detected_type = FaultType.NORMAL
    confidence = 0.95

    # --- 1. SHORT-CIRCUIT CLASSIFICATION ---
    if category == FaultCategory.SHORT_CIRCUIT:
        if num_phases >= 3 or surge_ratio > 3.0:
            if i0_ratio > 0.15:
                detected_type = FaultType.LLLG
                confidence = 0.96
            else:
                detected_type = FaultType.LLL
                confidence = 0.98

        elif num_phases == 2:
            if i0_ratio > 0.18:
                detected_type = FaultType.LLG
                confidence = 0.96
            else:
                detected_type = FaultType.LL
                confidence = 0.97

        else:  # 1 phase or ground dominated
            detected_type = FaultType.LG
            confidence = 0.98

    # --- 2. OPEN-CIRCUIT CLASSIFICATION ---
    elif category == FaultCategory.OPEN_CIRCUIT:
        if num_phases >= 3:
            detected_type = FaultType.THREE_PHASE_OPEN
            confidence = 0.99
        elif "Phase A" in affected_phases:
            detected_type = FaultType.PHASE_A_OPEN
            confidence = 0.97
        elif "Phase B" in affected_phases:
            detected_type = FaultType.PHASE_B_OPEN
            confidence = 0.97
        elif "Phase C" in affected_phases:
            detected_type = FaultType.PHASE_C_OPEN
            confidence = 0.97
        else:
            detected_type = FaultType.PHASE_A_OPEN
            confidence = 0.90

    return {
        "detected_fault_category": category,
        "detected_fault_type": detected_type,
        "affected_phases": affected_phases,
        "classification_confidence": round(confidence, 2),
        "classifier_type": "Deterministic Rule-Based Baseline",
        "classifier_note": classifier_note,
    }
