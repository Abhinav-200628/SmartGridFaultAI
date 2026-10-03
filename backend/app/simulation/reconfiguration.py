"""
FLISR and Automatic Switching Reconfiguration Module (Stage 4).
Deterministic automatic switching, fault-type-aware fault isolation, and circuit breaker
protection event generation for 3-phase AC power transmission networks.

Follows strict engineering sequence:
NORMAL -> FAULT_DETECTED -> PROTECTION_ACTIVE -> BREAKER_OPEN -> FAULT_ISOLATED -> (SYSTEM_RESTORED)
"""
from typing import List, Tuple, Optional
from app.models.schemas import (
    BreakerState,
    FaultCategory,
    FaultType,
    GridStatus,
    IsolatedSection,
    SwitchingEvent,
    SwitchingState,
)


def determine_switching_action(
    fault_detected: bool,
    fault_category: FaultCategory,
    fault_type: FaultType,
    affected_phases: List[str],
    estimated_fault_distance_km: float,
    total_line_length_km: float,
    fault_start_time: float,
    protection_delay_ms: float,
    total_time: float = 0.16,
    auto_reconfigure: bool = False,
) -> Tuple[SwitchingState, BreakerState, Optional[IsolatedSection], str, GridStatus, List[SwitchingEvent]]:
    """
    Determines deterministic automatic switching actions and fault isolation state.

    Parameters:
    -----------
    fault_detected : bool
        Whether a fault was detected by the electrical detection module.
    fault_category : FaultCategory
        NORMAL, SHORT_CIRCUIT, or OPEN_CIRCUIT.
    fault_type : FaultType
        Specific fault type (NORMAL, LG, LL, LLG, LLL, OPEN_CIRCUIT, SHORT_CIRCUIT, etc.).
    affected_phases : List[str]
        Phases actively experiencing the disturbance (e.g. ['A'], ['A', 'B']).
    estimated_fault_distance_km : float
        Fault location in km estimated from terminal electrical measurements.
    total_line_length_km : float
        Total transmission line length in km.
    fault_start_time : float
        Inception time of the fault disturbance in seconds.
    protection_delay_ms : float
        Configured protection relay pickup + mechanism clearing delay in milliseconds.
    total_time : float
        Duration of the simulation window in seconds.
    auto_reconfigure : bool
        Whether automatic tie-switch restoration is armed for healthy line sections.

    Returns:
    --------
    Tuple of:
        - switching_state: SwitchingState
        - breaker_state: BreakerState
        - isolated_section: Optional[IsolatedSection]
        - faulted_section_status: str ("IN_SERVICE" or "ISOLATED")
        - grid_status: GridStatus
        - switching_events: List[SwitchingEvent]
    """
    events: List[SwitchingEvent] = []

    # -------------------------------------------------------------
    # 1. NORMAL CASE (No fault detected or fault_type == NORMAL)
    # -------------------------------------------------------------
    if not fault_detected or fault_category == FaultCategory.NORMAL or fault_type == FaultType.NORMAL:
        events.append(SwitchingEvent(
            timestamp_s=0.0,
            timestamp_ms=0.0,
            time=0.0,
            event="SYSTEM_NORMAL",
            switch_id="MAIN_FEEDER_CB1",
            action="MAINTAIN_CLOSED",
            breaker_state="CLOSED",
            grid_status=GridStatus.HEALTHY.value,
            reason="NOMINAL_OPERATION",
            description="Primary substation feeder CB1 closed; power transmission nominal and balanced.",
        ))
        return (
            SwitchingState.NORMAL,
            BreakerState.CLOSED,
            None,
            "IN_SERVICE",
            GridStatus.HEALTHY,
            events,
        )

    # -------------------------------------------------------------
    # 2. FAULT DETECTED: CALCULATE DYNAMIC TIMESTAMPS
    # -------------------------------------------------------------
    t_start = fault_start_time
    delay_s = max(0.005, protection_delay_ms / 1000.0)

    # Event 1: Pre-fault steady state baseline at t=0
    events.append(SwitchingEvent(
        timestamp_s=0.0,
        timestamp_ms=0.0,
        time=0.0,
        event="SYSTEM_NORMAL",
        switch_id="MAIN_FEEDER_CB1",
        action="MAINTAIN_CLOSED",
        breaker_state="CLOSED",
        grid_status=GridStatus.HEALTHY.value,
        reason="PRE_FAULT_STEADY_STATE",
        description="Normal steady-state 3-phase power delivery prior to disturbance; Breaker CB1 closed.",
    ))

    # Event 2: Fault Detected (relay pickup ~5ms after inception)
    t_detect = round(t_start + 0.005, 5)
    phases_str = ", ".join(affected_phases) if affected_phases else "UNKNOWN"
    events.append(SwitchingEvent(
        timestamp_s=t_detect,
        timestamp_ms=round(t_detect * 1000.0, 2),
        time=t_detect,
        event="FAULT_DETECTED",
        switch_id="SCADA_SUPERVISORY",
        action="ALERT_FLISR_DISPATCH",
        breaker_state="CLOSED",
        grid_status=GridStatus.FAULT_DETECTED.value,
        reason=f"FAULT_{fault_type.value}_DETECTED",
        description=f"Fault condition acknowledged on phase(s) {phases_str}; FLISR protection armed.",
    ))

    # Event 3: Protection Active (Trip coil energized ~10ms after inception)
    t_trip = round(t_start + 0.010, 5)
    events.append(SwitchingEvent(
        timestamp_s=t_trip,
        timestamp_ms=round(t_trip * 1000.0, 2),
        time=t_trip,
        event="PROTECTION_ACTIVE",
        switch_id="RELAY_50_51",
        action="ARM_TRIP_TIMER",
        breaker_state="CLOSED",
        grid_status=GridStatus.PROTECTION_ACTIVE.value,
        reason="CLEARING_DELAY_IN_PROGRESS",
        description=f"Inverse-time protection active; {protection_delay_ms:.1f}ms clearing countdown initiated.",
    ))

    # Event 4: Breaker Open (Contacts parted after protection delay)
    t_open = round(t_start + delay_s, 5)
    events.append(SwitchingEvent(
        timestamp_s=t_open,
        timestamp_ms=round(t_open * 1000.0, 2),
        time=t_open,
        event="BREAKER_OPEN",
        switch_id="SECTIONALIZER_CB1",
        action="OPEN_TRIP",
        breaker_state="OPEN",
        grid_status=GridStatus.ISOLATING.value,
        reason="PROTECTION_DELAY_EXPIRED",
        description=f"Substation breaker CB1 parted contacts; fault arc extinguished after {protection_delay_ms:.1f}ms delay.",
    ))

    # -------------------------------------------------------------
    # 3. PHYSICAL FAULT ISOLATION BOUNDARIES (Using Estimated Distance)
    # -------------------------------------------------------------
    L = max(1.0, total_line_length_km)
    d_est = max(0.1, min(estimated_fault_distance_km, L))
    d_mid = round(L / 2.0, 2)

    # Determine sectionalizer isolation boundaries
    is_open_circuit = (
        fault_category == FaultCategory.OPEN_CIRCUIT
        or "OPEN" in fault_type.value
    )
    isolation_method = (
        "OPEN_CONDUCTOR_ISOLATION" if is_open_circuit else "AUTOMATIC_BREAKER_TRIP"
    )

    if d_est <= d_mid:
        section_id = "LINE_SEC_1_SENDING"
        from_km = 0.0
        to_km = d_mid
        length_km = d_mid
        healthy_section_str = f"Section 2 ({d_mid:.1f} - {L:.1f} km)"
    else:
        section_id = "LINE_SEC_2_RECEIVING"
        from_km = d_mid
        to_km = round(L, 2)
        length_km = round(L - d_mid, 2)
        healthy_section_str = f"Section 1 (0.0 - {d_mid:.1f} km)"

    isolated_section = IsolatedSection(
        section_id=section_id,
        from_km=from_km,
        to_km=to_km,
        length_km=length_km,
        status="ISOLATED",
        isolation_method=isolation_method,
        affected_phases=affected_phases,
        healthy_section_status="REMAINING_IN_SERVICE",
    )

    # Event 5: Fault Isolated (Downstream sectionalizer CB2 trips)
    t_iso = round(t_open + 0.005, 5)
    iso_desc = (
        f"Conductor discontinuity on {phases_str} isolated; {section_id} ({from_km:.1f} to {to_km:.1f} km) de-energized."
        if is_open_circuit
        else f"Sectionalizer CB2 opened; faulted segment {section_id} ({from_km:.1f} to {to_km:.1f} km) fully isolated."
    )
    events.append(SwitchingEvent(
        timestamp_s=t_iso,
        timestamp_ms=round(t_iso * 1000.0, 2),
        time=t_iso,
        event="FAULT_ISOLATED",
        switch_id="SECTIONALIZER_CB2",
        action="ISOLATE_SECTION",
        breaker_state="OPEN",
        grid_status=GridStatus.FAULT_ISOLATED.value,
        reason="DISCONNECT_FAULTED_ZONE",
        description=iso_desc,
    ))

    # -------------------------------------------------------------
    # 4. RESTORATION LOGIC (If auto_reconfigure enabled)
    # -------------------------------------------------------------
    if auto_reconfigure:
        # Event 6: Reconfiguration initiating
        t_reconfig = round(t_open + 0.025, 5)
        events.append(SwitchingEvent(
            timestamp_s=t_reconfig,
            timestamp_ms=round(t_reconfig * 1000.0, 2),
            time=t_reconfig,
            event="RECONFIGURING",
            switch_id="TIE_SWITCH_TS1",
            action="INITIATE_CLOSING",
            breaker_state="OPEN",
            grid_status=GridStatus.RECONFIGURING.value,
            reason="AUTOMATIC_SERVICE_RESTORATION",
            description=f"Synchronizing alternate Feeder-2 tie-switch TS1 to restore {healthy_section_str}.",
        ))

        # Event 7: Restoration complete
        t_restore = round(t_open + 0.045, 5)
        events.append(SwitchingEvent(
            timestamp_s=t_restore,
            timestamp_ms=round(t_restore * 1000.0, 2),
            time=t_restore,
            event="SYSTEM_RESTORED",
            switch_id="TIE_SWITCH_TS1",
            action="CLOSE_COMPLETED",
            breaker_state="OPEN",
            grid_status=GridStatus.SYSTEM_RESTORED.value,
            reason="HEALTHY_SECTION_ENERGIZED",
            description=f"Tie-switch TS1 closed; healthy {healthy_section_str} restored to service.",
        ))

        return (
            SwitchingState.SYSTEM_RESTORED,
            BreakerState.OPEN,
            isolated_section,
            "ISOLATED",
            GridStatus.SYSTEM_RESTORED,
            events,
        )

    # Standard fault isolation without auto-restoration
    return (
        SwitchingState.FAULT_ISOLATED,
        BreakerState.OPEN,
        isolated_section,
        "ISOLATED",
        GridStatus.FAULT_ISOLATED,
        events,
    )


def generate_switching_timeline(
    fault_detected: bool,
    fault_category: FaultCategory,
    fault_type: FaultType,
    fault_start_time: float,
    protection_delay_ms: float,
    auto_reconfigure: bool = False,
) -> Tuple[GridStatus, List[SwitchingEvent]]:
    """
    Backwards-compatible wrapper for legacy callers.
    Delegates to determine_switching_action with standard default topology.
    """
    _, _, _, _, grid_status, events = determine_switching_action(
        fault_detected=fault_detected,
        fault_category=fault_category,
        fault_type=fault_type,
        affected_phases=[],
        estimated_fault_distance_km=25.0,
        total_line_length_km=50.0,
        fault_start_time=fault_start_time,
        protection_delay_ms=protection_delay_ms,
        auto_reconfigure=auto_reconfigure,
    )
    return grid_status, events
