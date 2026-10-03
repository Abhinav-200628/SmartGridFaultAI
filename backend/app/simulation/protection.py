"""
Circuit Breaker and Protection Relay Logic Module.
Simulates overcurrent, negative sequence, and differential protection timing
and generates a millisecond-stamped protection event audit log.
"""
from typing import List, Tuple
from app.models.schemas import (
    BreakerState,
    FaultCategory,
    FaultType,
    ProtectionEvent,
)


def generate_protection_timeline(
    fault_detected: bool,
    fault_category: FaultCategory,
    fault_type: FaultType,
    fault_start_time: float,
    protection_delay_ms: float,
    total_time: float,
) -> Tuple[BreakerState, List[ProtectionEvent]]:
    """
    Generates chronological protection milestones and final breaker operating state.
    """
    events: List[ProtectionEvent] = []

    # Initial steady-state event
    events.append(ProtectionEvent(
        timestamp_s=0.0,
        timestamp_ms=0.0,
        event_type="NORMAL_OPERATION",
        event="SYSTEM_NORMAL",
        time=0.0,
        breaker_state="CLOSED",
        reason="NOMINAL_OPERATION",
        description="Grid operating nominally at balanced conditions; Breaker CLOSED",
        status="NORMAL",
    ))

    if not fault_detected or fault_category == FaultCategory.NORMAL or fault_type == FaultType.NORMAL:
        return BreakerState.CLOSED, events

    t_start = fault_start_time
    delay_s = max(0.005, protection_delay_ms / 1000.0)

    # 1. Fault Detection Event (relay pickup ~5-8ms)
    t_detect = t_start + 0.005
    events.append(ProtectionEvent(
        timestamp_s=round(t_detect, 5),
        timestamp_ms=round(t_detect * 1000.0, 2),
        event_type="FAULT_DETECTED",
        event="FAULT_DETECTED",
        time=round(t_detect, 5),
        breaker_state="CLOSED",
        reason=f"FAULT_{fault_type.value}_DETECTED",
        description=f"Protection relay picked up: {fault_type.value} ({fault_category.value})",
        status="WARNING",
    ))

    # 2. Trip Command Event (~10ms after inception)
    t_trip = t_start + 0.010
    events.append(ProtectionEvent(
        timestamp_s=round(t_trip, 5),
        timestamp_ms=round(t_trip * 1000.0, 2),
        event_type="TRIP_COMMAND",
        event="PROTECTION_ACTIVE",
        time=round(t_trip, 5),
        breaker_state="CLOSED",
        reason="RELAY_TRIP_COMMAND",
        description="Relay trip signal issued to main breaker trip coil; clearing delay armed",
        status="ACTION",
    ))

    # 3. Breaker Contact Parting & Opening
    t_open = t_start + delay_s
    events.append(ProtectionEvent(
        timestamp_s=round(t_open, 5),
        timestamp_ms=round(t_open * 1000.0, 2),
        event_type="BREAKER_OPENED",
        event="BREAKER_OPEN",
        time=round(t_open, 5),
        breaker_state="OPEN",
        reason="PROTECTION_DELAY_EXPIRED",
        description=f"Circuit breaker contacts fully parted; arc extinguished after {protection_delay_ms:.1f}ms",
        status="ACTION",
    ))

    # 4. Fault Section Isolation
    t_iso = t_open + 0.005
    events.append(ProtectionEvent(
        timestamp_s=round(t_iso, 5),
        timestamp_ms=round(t_iso * 1000.0, 2),
        event_type="FAULT_SECTION_ISOLATED",
        event="FAULT_ISOLATED",
        time=round(t_iso, 5),
        breaker_state="OPEN",
        reason="DISCONNECT_FAULTED_ZONE",
        description="Faulted transmission section completely de-energized and safely isolated",
        status="SUCCESS",
    ))

    # 5. Network Reconfiguration Preparation
    t_reconfig = t_open + 0.020
    events.append(ProtectionEvent(
        timestamp_s=round(t_reconfig, 5),
        timestamp_ms=round(t_reconfig * 1000.0, 2),
        event_type="NETWORK_RECONFIGURATION",
        event="SERVICE_RESTORATION_ARMED",
        time=round(t_reconfig, 5),
        breaker_state="OPEN",
        reason="FLISR_AUTOMATION_INITIATED",
        description="FLISR automation initiated; downstream healthy loads queued for restoration",
        status="INFO",
    ))

    return BreakerState.OPEN, events
