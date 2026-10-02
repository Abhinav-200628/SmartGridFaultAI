"""
Symmetrical Components Analysis Module.
Implements the Fortescue transformation for 3-phase AC voltage and current waveforms.
Calculates Positive (1), Negative (2), and Zero (0) sequence components.
"""
import cmath
import math
import numpy as np
from typing import Tuple, Dict, Any
from app.models.schemas import SequenceDetail, SymmetricalComponentsSummary

# Fortescue complex operator: a = e^(j*120°) = -0.5 + j*sqrt(3)/2
A_OP = cmath.rect(1.0, 2.0 * math.pi / 3.0)
A2_OP = cmath.rect(1.0, 4.0 * math.pi / 3.0)


def extract_fundamental_phasor(
    waveform: np.ndarray,
    sampling_rate: int,
    freq: float,
    start_idx: int = 0,
    num_cycles: int = 1,
) -> complex:
    """
    Extracts the fundamental frequency RMS phasor using Discrete Fourier Transform (DFT).
    phasor = (sqrt(2) / N) * sum(x[n] * e^(-j * 2*pi * n / N_cycle))
    """
    samples_per_cycle = int(round(sampling_rate / freq))
    window_length = samples_per_cycle * num_cycles
    
    end_idx = min(len(waveform), start_idx + window_length)
    segment = waveform[start_idx:end_idx]
    n_pts = len(segment)
    if n_pts == 0:
        return 0.0 + 0.0j

    n_arr = np.arange(n_pts)
    # Fundamental correlation kernel
    kernel = np.exp(-1j * 2.0 * np.pi * freq * (n_arr / sampling_rate))
    dft_val = np.sum(segment * kernel) / n_pts
    # Convert peak DFT to RMS phasor (multiply by sqrt(2) / sqrt(2) * 2 = sqrt(2))
    rms_phasor = dft_val * math.sqrt(2.0)
    return complex(rms_phasor)


def compute_symmetrical_components(
    fa: complex,
    fb: complex,
    fc: complex,
) -> Tuple[complex, complex, complex]:
    """
    Applies Fortescue transformation matrix:
    [F0; F1; F2] = (1/3) * [1 1 1; 1 a a^2; 1 a^2 a] * [Fa; Fb; Fc]
    Returns (F0, F1, F2) zero, positive, and negative sequence phasors.
    """
    f0 = (fa + fb + fc) / 3.0
    f1 = (fa + A_OP * fb + A2_OP * fc) / 3.0
    f2 = (fa + A2_OP * fb + A_OP * fc) / 3.0
    return f0, f1, f2


def analyze_symmetrical_components(
    va: np.ndarray,
    vb: np.ndarray,
    vc: np.ndarray,
    ia: np.ndarray,
    ib: np.ndarray,
    ic: np.ndarray,
    sampling_rate: int,
    freq: float,
    window_start_sec: float,
    window_duration_sec: float,
) -> Dict[str, Any]:
    """
    Analyzes symmetrical components for voltage and current over a specified window.
    Returns SequenceDetail objects and SymmetricalComponentsSummary.
    """
    start_idx = max(0, int(window_start_sec * sampling_rate))
    samples_per_cycle = max(10, int(round(sampling_rate / freq)))
    # Ensure window contains at least 1 cycle
    num_samples = max(samples_per_cycle, int(window_duration_sec * sampling_rate))
    
    # Extract fundamental phasors
    v_a_ph = extract_fundamental_phasor(va, sampling_rate, freq, start_idx, num_cycles=1)
    v_b_ph = extract_fundamental_phasor(vb, sampling_rate, freq, start_idx, num_cycles=1)
    v_c_ph = extract_fundamental_phasor(vc, sampling_rate, freq, start_idx, num_cycles=1)

    i_a_ph = extract_fundamental_phasor(ia, sampling_rate, freq, start_idx, num_cycles=1)
    i_b_ph = extract_fundamental_phasor(ib, sampling_rate, freq, start_idx, num_cycles=1)
    i_c_ph = extract_fundamental_phasor(ic, sampling_rate, freq, start_idx, num_cycles=1)

    # Calculate Fortescue sequence components
    v0, v1, v2 = compute_symmetrical_components(v_a_ph, v_b_ph, v_c_ph)
    i0, i1, i2 = compute_symmetrical_components(i_a_ph, i_b_ph, i_c_ph)

    # Magnitudes and angles
    v0_mag, v0_ang = abs(v0), math.degrees(cmath.phase(v0))
    v1_mag, v1_ang = abs(v1), math.degrees(cmath.phase(v1))
    v2_mag, v2_ang = abs(v2), math.degrees(cmath.phase(v2))

    i0_mag, i0_ang = abs(i0), math.degrees(cmath.phase(i0))
    i1_mag, i1_ang = abs(i1), math.degrees(cmath.phase(i1))
    i2_mag, i2_ang = abs(i2), math.degrees(cmath.phase(i2))

    i0_i1_ratio = (i0_mag / max(1e-3, i1_mag)) if i1_mag > 1e-3 else 0.0
    i2_i1_ratio = (i2_mag / max(1e-3, i1_mag)) if i1_mag > 1e-3 else 0.0

    pos_seq = SequenceDetail(
        magnitude_v=round(v1_mag, 2),
        magnitude_a=round(i1_mag, 2),
        angle_v_deg=round(v1_ang, 2),
        angle_i_deg=round(i1_ang, 2),
        real_v=round(v1.real, 2),
        imag_v=round(v1.imag, 2),
        real_i=round(i1.real, 2),
        imag_i=round(i1.imag, 2),
    )

    neg_seq = SequenceDetail(
        magnitude_v=round(v2_mag, 2),
        magnitude_a=round(i2_mag, 2),
        angle_v_deg=round(v2_ang, 2),
        angle_i_deg=round(i2_ang, 2),
        real_v=round(v2.real, 2),
        imag_v=round(v2.imag, 2),
        real_i=round(i2.real, 2),
        imag_i=round(i2.imag, 2),
    )

    zero_seq = SequenceDetail(
        magnitude_v=round(v0_mag, 2),
        magnitude_a=round(i0_mag, 2),
        angle_v_deg=round(v0_ang, 2),
        angle_i_deg=round(i0_ang, 2),
        real_v=round(v0.real, 2),
        imag_v=round(v0.imag, 2),
        real_i=round(i0.real, 2),
        imag_i=round(i0.imag, 2),
    )

    summary = SymmetricalComponentsSummary(
        v0_mag=round(v0_mag, 2),
        v1_mag=round(v1_mag, 2),
        v2_mag=round(v2_mag, 2),
        i0_mag=round(i0_mag, 2),
        i1_mag=round(i1_mag, 2),
        i2_mag=round(i2_mag, 2),
        i0_i1_ratio=round(i0_i1_ratio, 4),
        i2_i1_ratio=round(i2_i1_ratio, 4),
    )

    return {
        "summary": summary,
        "positive_sequence": pos_seq,
        "negative_sequence": neg_seq,
        "zero_sequence": zero_seq,
        "phasors": {
            "va": v_a_ph, "vb": v_b_ph, "vc": v_c_ph,
            "ia": i_a_ph, "ib": i_b_ph, "ic": i_c_ph,
            "v0": v0, "v1": v1, "v2": v2,
            "i0": i0, "i1": i1, "i2": i2,
        }
    }
