"""
Pydantic schemas and Enums for SmartGridFaultAI simulation engine.
Comprehensive data models for Stage 1 and Stage 2 physical electrical simulation.
"""
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator, field_validator


class FaultCategory(str, Enum):
    """High-level fault category hierarchy."""
    NORMAL = "NORMAL"
    SHORT_CIRCUIT = "SHORT_CIRCUIT"
    OPEN_CIRCUIT = "OPEN_CIRCUIT"


class FaultType(str, Enum):
    """Specific smart grid fault classifications and operating states."""
    # Standard Stage 2 Short-Circuit and Open-Circuit Enums
    NORMAL = "NORMAL"
    LG = "LG"
    LL = "LL"
    LLG = "LLG"
    LLL = "LLL"
    LLLG = "LLLG"
    SHORT_CIRCUIT = "SHORT_CIRCUIT"
    OPEN_CIRCUIT = "OPEN_CIRCUIT"
    PHASE_A_OPEN = "PHASE_A_OPEN"
    PHASE_B_OPEN = "PHASE_B_OPEN"
    PHASE_C_OPEN = "PHASE_C_OPEN"
    THREE_PHASE_OPEN = "THREE_PHASE_OPEN"
    
    # Backwards-compatibility aliases from Stage 1
    LG_A = "LG_A"
    LG_B = "LG_B"
    LG_C = "LG_C"
    LL_AB = "LL_AB"
    LL_BC = "LL_BC"
    LL_CA = "LL_CA"
    LLG_AB = "LLG_AB"
    LLG_BC = "LLG_BC"
    LLG_CA = "LLG_CA"


class BreakerState(str, Enum):
    """Protective circuit breaker operating states."""
    CLOSED = "CLOSED"
    TRIP_SIGNAL = "TRIP_SIGNAL"
    OPEN = "OPEN"
    RECLOSED = "RECLOSED"


class SwitchingState(str, Enum):
    """Operating states of the automatic switching and fault isolation system."""
    NORMAL = "NORMAL"
    FAULT_DETECTED = "FAULT_DETECTED"
    PROTECTION_ACTIVE = "PROTECTION_ACTIVE"
    BREAKER_OPEN = "BREAKER_OPEN"
    FAULT_ISOLATED = "FAULT_ISOLATED"
    SYSTEM_RESTORED = "SYSTEM_RESTORED"


class GridStatus(str, Enum):
    """High-level SCADA grid operational status."""
    HEALTHY = "HEALTHY"
    FAULT_DETECTED = "FAULT_DETECTED"
    PROTECTION_ACTIVE = "PROTECTION_ACTIVE"
    FAULT_ISOLATED = "FAULT_ISOLATED"
    SYSTEM_RESTORED = "SYSTEM_RESTORED"
    RECONFIGURING = "RECONFIGURING"
    POWER_RESTORED = "POWER_RESTORED"
    SERVICE_RESTORED = "SERVICE_RESTORED"
    OPEN_CIRCUIT = "OPEN_CIRCUIT"
    SHORT_CIRCUIT = "SHORT_CIRCUIT"
    ISOLATING = "ISOLATING"
    ISOLATED = "ISOLATED"
    RESTORED = "RESTORED"


class IsolatedSection(BaseModel):
    """Details of the transmission line section isolated by automatic switching."""
    section_id: str = Field(default="LINE_SEC_1_SENDING", description="Identifier for the isolated line segment")
    from_km: float = Field(default=0.0, description="Start boundary of isolated segment in km")
    to_km: float = Field(default=0.0, description="End boundary of isolated segment in km")
    length_km: float = Field(default=0.0, description="Length of isolated segment in km")
    status: str = Field(default="ISOLATED", description="Status of this section: ISOLATED or IN_SERVICE")
    isolation_method: str = Field(default="AUTOMATIC_BREAKER_TRIP", description="Switching mechanism")
    affected_phases: List[str] = Field(default_factory=list, description="Phases isolated")
    healthy_section_status: str = Field(default="REMAINING_IN_SERVICE", description="Status of adjacent healthy line section")


class SequenceDetail(BaseModel):
    """Symmetrical sequence component detail (magnitude, phase, and phasor)."""
    magnitude_v: float = Field(default=0.0, description="Voltage sequence magnitude (V)")
    magnitude_a: float = Field(default=0.0, description="Current sequence magnitude (A)")
    angle_v_deg: float = Field(default=0.0, description="Voltage sequence phase angle (degrees)")
    angle_i_deg: float = Field(default=0.0, description="Current sequence phase angle (degrees)")
    real_v: float = Field(default=0.0, description="Real part of voltage phasor (V)")
    imag_v: float = Field(default=0.0, description="Imaginary part of voltage phasor (V)")
    real_i: float = Field(default=0.0, description="Real part of current phasor (A)")
    imag_i: float = Field(default=0.0, description="Imaginary part of current phasor (A)")


class SymmetricalComponentsSummary(BaseModel):
    """Summary of symmetrical sequence components during pre-fault and fault windows."""
    v0_mag: float = Field(default=0.0, description="Zero sequence voltage magnitude (V)")
    v1_mag: float = Field(default=0.0, description="Positive sequence voltage magnitude (V)")
    v2_mag: float = Field(default=0.0, description="Negative sequence voltage magnitude (V)")
    i0_mag: float = Field(default=0.0, description="Zero sequence current magnitude (A)")
    i1_mag: float = Field(default=0.0, description="Positive sequence current magnitude (A)")
    i2_mag: float = Field(default=0.0, description="Negative sequence current magnitude (A)")
    i0_i1_ratio: float = Field(default=0.0, description="Zero-to-positive sequence current ratio")
    i2_i1_ratio: float = Field(default=0.0, description="Negative-to-positive sequence current ratio")


class ProtectionEvent(BaseModel):
    """Timestamped protection event milestone."""
    timestamp_s: float
    timestamp_ms: float
    event_type: str
    description: str
    status: str
    event: Optional[str] = Field(default=None, description="Standardized event name (e.g. BREAKER_OPEN, FAULT_ISOLATED)")
    time: Optional[float] = Field(default=None, description="Event timestamp in seconds (alias for timestamp_s)")
    breaker_state: Optional[str] = Field(default=None, description="Circuit breaker operating state")
    reason: Optional[str] = Field(default=None, description="Protective relay trigger reason")


class SwitchingEvent(BaseModel):
    """Timestamped network switching / FLISR event milestone."""
    timestamp_s: float
    timestamp_ms: float
    switch_id: str
    action: str
    grid_status: str
    description: str
    event: Optional[str] = Field(default=None, description="Standardized switching event name")
    time: Optional[float] = Field(default=None, description="Event timestamp in seconds (alias for timestamp_s)")
    breaker_state: Optional[str] = Field(default=None, description="Circuit breaker operating state")
    reason: Optional[str] = Field(default=None, description="Automated switching trigger reason")


class MLPrediction(BaseModel):
    """Machine learning fault classification prediction output."""
    enabled: bool = Field(default=False, description="Whether ML inference was executed")
    fault_type: Optional[str] = Field(default=None, description="Predicted fault type class")
    confidence: Optional[float] = Field(default=None, description="Top predicted class probability (0.0 to 1.0)")
    model_probability: Optional[float] = Field(default=None, description="Model output probability (0.0 to 1.0)")
    class_probabilities: Optional[Dict[str, float]] = Field(default=None, description="Per-class probability distribution")
    model_name: Optional[str] = Field(default=None, description="Model architecture identifier")


class MLLocalization(BaseModel):
    """Machine learning fault distance regression output."""
    enabled: bool = Field(default=False, description="Whether ML localization was executed")
    estimated_fault_distance_km: Optional[float] = Field(default=None, description="Predicted fault distance in km")
    model_name: Optional[str] = Field(default=None, description="Regressor architecture identifier")


class SimulationInput(BaseModel):
    """User configurable parameters for dynamic 3-phase AC power simulation."""
    # Electrical System Base Parameters
    voltage_rms: float = Field(
        default=11000.0,
        ge=100.0,
        le=1000000.0,
        description="Line-to-Line RMS voltage in Volts (e.g. 11000 for 11kV, 400 for 400V, 132000 for 132kV)"
    )
    source_voltage_rms: Optional[float] = Field(
        default=None,
        description="Synonym/alias for voltage_rms"
    )
    frequency: float = Field(
        default=50.0,
        ge=10.0,
        le=100.0,
        description="System frequency in Hertz (e.g. 50.0 or 60.0)"
    )
    frequency_hz: Optional[float] = Field(
        default=None,
        description="Synonym/alias for frequency"
    )
    load_kw: float = Field(
        default=500.0,
        ge=0.1,
        le=500000.0,
        description="Three-phase active load demand in kW"
    )
    load_power_kw: Optional[float] = Field(
        default=None,
        description="Synonym/alias for load_kw"
    )
    power_factor: float = Field(
        default=0.85,
        ge=0.1,
        le=1.0,
        description="Operating load power factor (lagging inductive)"
    )
    
    # Transmission Line Parameters
    line_length_km: float = Field(
        default=50.0,
        ge=1.0,
        le=1000.0,
        description="Total transmission line length in kilometres"
    )
    line_resistance_per_km: float = Field(
        default=0.125,
        ge=0.001,
        le=10.0,
        description="Line series resistance in Ohm/km"
    )
    line_reactance_per_km: float = Field(
        default=0.393,
        ge=0.001,
        le=10.0,
        description="Line series reactance in Ohm/km at nominal frequency"
    )

    # Fault Hierarchy and Type Parameters
    fault_category: Optional[FaultCategory] = Field(
        default=None,
        description="High-level category: NORMAL, SHORT_CIRCUIT, or OPEN_CIRCUIT"
    )
    fault_type: FaultType = Field(
        default=FaultType.NORMAL,
        description="Specific fault type (NORMAL, LG, LL, LLG, LLL, PHASE_A_OPEN, etc.)"
    )
    fault_phase: Optional[str] = Field(
        default="A",
        description="Faulted phase for single-phase faults: 'A', 'B', or 'C'"
    )
    fault_phase_pair: Optional[str] = Field(
        default="A-B",
        description="Faulted phase pair for line-to-line faults: 'A-B', 'B-C', or 'C-A'"
    )
    fault_distance_km: float = Field(
        default=25.0,
        ge=0.1,
        description="Fault location from sending-end substation in kilometres"
    )
    fault_resistance_ohm: float = Field(
        default=1.0,
        ge=0.001,
        le=1000.0,
        description="Fault arc and contact resistance in Ohms"
    )
    fault_start_time: float = Field(
        default=0.04,
        ge=0.0,
        description="Fault inception time in seconds"
    )
    fault_duration: float = Field(
        default=0.06,
        ge=0.001,
        description="Fault duration before breaker clearing in seconds"
    )
    
    # Open-Circuit Specific Aliases
    open_phase: Optional[str] = Field(
        default=None,
        description="Conductor phase experiencing open circuit: 'A', 'B', or 'C'"
    )
    open_location_km: Optional[float] = Field(
        default=None,
        description="Open circuit distance in km"
    )
    open_start_time: Optional[float] = Field(
        default=None,
        description="Open circuit inception time in seconds"
    )
    open_duration: Optional[float] = Field(
        default=None,
        description="Open circuit duration in seconds"
    )

    # Protection & Time Configuration
    protection_delay_ms: float = Field(
        default=40.0,
        ge=1.0,
        le=500.0,
        description="Protection relay and circuit breaker clearing delay in milliseconds"
    )
    auto_reconfigure: bool = Field(
        default=False,
        description="Whether automated tie-switch closing is armed to restore healthy line sections"
    )
    total_time: float = Field(
        default=0.16,
        ge=0.02,
        le=2.0,
        description="Total duration of the time-domain simulation window in seconds"
    )
    sampling_rate: int = Field(
        default=5000,
        ge=1000,
        le=50000,
        description="Sampling frequency in Hertz (samples per second)"
    )

    @field_validator("fault_distance_km")
    @classmethod
    def validate_distance_within_line(cls, v: float, info) -> float:
        line_len = info.data.get("line_length_km", 50.0) if info.data else 50.0
        if v > line_len:
            return min(v, line_len)
        return v

    @model_validator(mode="before")
    @classmethod
    def harmonize_aliases(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        # Alias mapping for voltage, frequency, load
        if values.get("source_voltage_rms") is not None and values.get("voltage_rms") is None:
            values["voltage_rms"] = values["source_voltage_rms"]
        if values.get("frequency_hz") is not None and values.get("frequency") is None:
            values["frequency"] = values["frequency_hz"]
        if values.get("load_power_kw") is not None and values.get("load_kw") is None:
            values["load_kw"] = values["load_power_kw"]

        # Alias mapping for open-circuit parameters
        if values.get("open_start_time") is not None:
            values["fault_start_time"] = values["open_start_time"]
        if values.get("open_duration") is not None:
            values["fault_duration"] = values["open_duration"]
        if values.get("open_location_km") is not None:
            values["fault_distance_km"] = values["open_location_km"]
        if values.get("open_phase") is not None and values.get("fault_phase") is None:
            values["fault_phase"] = values["open_phase"]

        return values


class SimulationMetrics(BaseModel):
    """Calculated power system metrics from the simulation."""
    v_peak_normal_v: float = Field(description="Nominal line-to-neutral peak voltage (V)")
    v_rms_normal_v: float = Field(description="Nominal line-to-line RMS voltage (V)")
    i_peak_normal_a: float = Field(description="Nominal steady-state peak phase current (A)")
    i_rms_normal_a: float = Field(description="Nominal steady-state RMS phase current (A)")
    v_peak_fault_v: float = Field(description="Maximum phase voltage during simulation (V)")
    i_peak_fault_a: float = Field(description="Maximum peak phase current during simulation (A)")
    apparent_power_kva: float = Field(description="Three-phase apparent power (kVA)")
    active_power_kw: float = Field(description="Three-phase active power (kW)")
    reactive_power_kvar: float = Field(description="Three-phase reactive power (kVAR)")
    line_impedance_ohm: float = Field(description="Total positive-sequence line impedance magnitude (Ohm)")


class FaultSummary(BaseModel):
    """Summary of fault conditions and impacted phases."""
    fault_type: FaultType
    fault_distance_km: float
    fault_resistance_ohm: float
    fault_start_time_s: float
    fault_end_time_s: float
    max_fault_current_a: float
    affected_phases: List[str]
    ground_involved: bool


class SimulationResult(BaseModel):
    """Complete simulation output payload containing dynamic 3-phase waveforms."""
    # Waveform Time-Series Data
    time: List[float] = Field(description="Time series points in seconds")
    va: List[float] = Field(description="Phase A instantaneous voltage (V)")
    vb: List[float] = Field(description="Phase B instantaneous voltage (V)")
    vc: List[float] = Field(description="Phase C instantaneous voltage (V)")
    ia: List[float] = Field(description="Phase A instantaneous current (A)")
    ib: List[float] = Field(description="Phase B instantaneous current (A)")
    ic: List[float] = Field(description="Phase C instantaneous current (A)")

    # Grid & Breaker States
    grid_status: GridStatus
    breaker_state: BreakerState
    metrics: SimulationMetrics
    fault_summary: Optional[FaultSummary] = None
    simulation_duration_ms: float = Field(description="Computational runtime in milliseconds")

    # Stage 2 Extended Attributes
    simulation_parameters: Dict[str, Any] = Field(default_factory=dict, description="Input parameters used")
    rms_values: Dict[str, float] = Field(default_factory=dict, description="Per-phase RMS voltage and current")
    voltage_measurements: Dict[str, float] = Field(default_factory=dict, description="Voltage measurement summary")
    current_measurements: Dict[str, float] = Field(default_factory=dict, description="Current measurement summary")
    fault_category: FaultCategory = Field(default=FaultCategory.NORMAL, description="Identified fault category")
    fault_type: FaultType = Field(default=FaultType.NORMAL, description="Specific fault type")
    affected_phases: List[str] = Field(default_factory=list, description="Phases experiencing disturbance")
    fault_detected: bool = Field(default=False, description="Whether a fault condition was detected")
    fault_distance_km: float = Field(default=0.0, description="Actual physical fault distance (km)")
    estimated_fault_distance_km: float = Field(default=0.0, description="Calculated estimated fault distance (km)")
    distance_error_km: float = Field(default=0.0, description="Absolute fault distance error (km)")
    distance_error_percent: float = Field(default=0.0, description="Percentage distance error relative to line length")
    distance_percentage: float = Field(default=0.0, description="Fault location as percentage of line length")

    # Symmetrical Components
    sequence_components: SymmetricalComponentsSummary = Field(default_factory=SymmetricalComponentsSummary)
    positive_sequence: SequenceDetail = Field(default_factory=SequenceDetail)
    negative_sequence: SequenceDetail = Field(default_factory=SequenceDetail)
    zero_sequence: SequenceDetail = Field(default_factory=SequenceDetail)

    # Protection & Switching Event Timelines
    protection_events: List[ProtectionEvent] = Field(default_factory=list, description="Protection timeline events")
    switching_events: List[SwitchingEvent] = Field(default_factory=list, description="Switching reconfiguration events")
    fault_start_time: float = Field(default=0.0, description="Fault inception timestamp (s)")
    fault_duration: float = Field(default=0.0, description="Fault duration (s)")
    fault_end_time: float = Field(default=0.0, description="Fault clearance timestamp (s)")

    # Stage 3 Machine Learning Inference Outputs
    ml_prediction: Optional[MLPrediction] = Field(default=None, description="ML fault classification output")
    ml_localization: Optional[MLLocalization] = Field(default=None, description="ML fault localization regression output")

    # Stage 4 Automatic Switching and Fault Isolation Outputs
    switching_state: SwitchingState = Field(
        default=SwitchingState.NORMAL,
        description="Current automatic switching operational state (NORMAL, FAULT_ISOLATED, SYSTEM_RESTORED)"
    )
    faulted_section_status: str = Field(
        default="IN_SERVICE",
        description="Operational status of the faulted transmission section (IN_SERVICE or ISOLATED)"
    )
    isolated_section: Optional[IsolatedSection] = Field(
        default=None,
        description="Physical section boundaries and parameters of isolated segment"
    )
