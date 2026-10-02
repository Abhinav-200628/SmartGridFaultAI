"""
FLISR (Fault Location, Isolation, and Service Restoration) Reconfiguration Module.
Models backend state progression and automated tie-switching logic to restore healthy loads.
"""
from typing import List, Tuple
from app.models.schemas import GridStatus, FaultCategory, FaultType, SwitchingEvent


def generate_switching_timeline(
    fault_detected: bool,
    fault_category: FaultCategory,
    fault_type: FaultType,
    fault_start_time: float,
    protection_delay_ms: float,
    auto_reconfigure: bool = False,
) -> Tuple[GridStatus, List[SwitchingEvent]]:
    """
    Simulates FLISR automated switching sequences:
    - Fault detection -> Sectionalizer opening -> Tie-switch closing -> Load restoration.
    Returns the final SCADA GridStatus and a list of SwitchingEvents.
    """
    events: List[SwitchingEvent] = []

    if not fault_detected or fault_category == FaultCategory.NORMAL or fault_type == FaultType.NORMAL:
        events.append(SwitchingEvent(
            timestamp_s=0.0,
            timestamp_ms=0.0,
            switch_id="MAIN_FEEDER_CB1",
            action="MAINTAIN_CLOSED",
            grid_status=GridStatus.HEALTHY.value,
            description="Primary feeder CB1 and CB2 closed; normal power flow",
        ))
        return GridStatus.HEALTHY, events

    t_start = fault_start_time
    delay_s = max(0.005, protection_delay_ms / 1000.0)

    # State 1: Fault detected
    t_det = t_start + 0.005
    events.append(SwitchingEvent(
        timestamp_s=round(t_det, 5),
        timestamp_ms=round(t_det * 1000.0, 2),
        switch_id="SCADA_SUPERVISORY",
        action="ALERT_FLISR_DISPATCH",
        grid_status=GridStatus.FAULT_DETECTED.value,
        description=f"Fault event acknowledged: {fault_type.value}. FLISR sequence armed",
    ))

    # State 2: Isolating (Sectionalizer CB1 trips)
    t_open = t_start + delay_s
    events.append(SwitchingEvent(
        timestamp_s=round(t_open, 5),
        timestamp_ms=round(t_open * 1000.0, 2),
        switch_id="SECTIONALIZER_CB1",
        action="OPEN_TRIP",
        grid_status=GridStatus.ISOLATING.value,
        description="Upstream substation breaker CB1 opened to cut fault current",
    ))

    # State 3: Downstream breaker CB2 trips (Isolated)
    t_iso = t_open + 0.005
    events.append(SwitchingEvent(
        timestamp_s=round(t_iso, 5),
        timestamp_ms=round(t_iso * 1000.0, 2),
        switch_id="SECTIONALIZER_CB2",
        action="OPEN_TRIP",
        grid_status=GridStatus.FAULT_ISOLATED.value,
        description="Downstream section breaker CB2 opened; faulted segment fully isolated",
    ))

    if auto_reconfigure:
        # State 4: Reconfiguring
        t_reconfig = t_open + 0.025
        events.append(SwitchingEvent(
            timestamp_s=round(t_reconfig, 5),
            timestamp_ms=round(t_reconfig * 1000.0, 2),
            switch_id="TIE_SWITCH_TS1",
            action="INITIATE_CLOSING",
            grid_status=GridStatus.RECONFIGURING.value,
            description="Synchronizing alternate Feeder-2 / Microgrid tie-switch TS1",
        ))

        # State 5: Restored / Power Restored
        t_restored = t_open + 0.045
        events.append(SwitchingEvent(
            timestamp_s=round(t_restored, 5),
            timestamp_ms=round(t_restored * 1000.0, 2),
            switch_id="TIE_SWITCH_TS1",
            action="CLOSE_COMPLETED",
            grid_status=GridStatus.RESTORED.value,
            description="Tie-switch TS1 successfully closed; healthy downstream load re-energized",
        ))
        return GridStatus.RESTORED, events

    return GridStatus.FAULT_ISOLATED, events
