import React, { useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
  Info,
} from 'lucide-react';

/**
 * Alerts Component
 * Real-time SCADA System Alert and Warning Feed.
 * Dynamically computes alerts for:
 * - Normal operation (Nominal state)
 * - Fault detected (Critical alert)
 * - Protection activated (Relay pickup warning)
 * - Breaker opened (Mechanism status)
 * - Fault isolated (FLISR isolation success)
 * - Invalid API response (API payload error)
 * - Backend connection failure (Network / offline warning)
 */
export default function Alerts({ simulationData, backendStatus, errorMessage }) {
  const alerts = useMemo(() => {
    const list = [];
    const now = new Date().toLocaleTimeString();

    // 1. Backend Connection Failure
    if (backendStatus && !backendStatus.connected) {
      list.push({
        id: 'backend-offline',
        severity: 'CRITICAL',
        title: 'Backend Connection Offline',
        message: 'FastAPI simulation engine is unreachable at http://127.0.0.1:8000. Real-time ODE calculations suspended.',
        time: now,
      });
    }

    // 2. Invalid API Response / Error Message
    if (errorMessage) {
      list.push({
        id: 'api-error',
        severity: 'ERROR',
        title: 'Simulation Execution Error',
        message: String(errorMessage),
        time: now,
      });
    }

    if (!simulationData) return list;

    const isDetected = Boolean(simulationData.fault_detected);
    const breakerState = simulationData.breaker_state || 'CLOSED';
    const isBreakerOpen = breakerState === 'OPEN';
    const faultType = simulationData.fault_type || 'NORMAL';
    const affected = simulationData.affected_phases?.length > 0
      ? `Phase ${simulationData.affected_phases.join(', ')}`
      : 'All Phases';
    const estDist = simulationData.estimated_fault_distance_km ?? simulationData.fault_distance_km ?? 25.0;
    const delayMs = simulationData.simulation_parameters?.protection_delay_ms ?? 40.0;

    // 3. Fault Detected Alert
    if (isDetected) {
      list.push({
        id: 'fault-detected',
        severity: 'CRITICAL',
        title: `Electrical Fault Detected: ${faultType}`,
        message: `High-speed relay pickup: ${faultType} active on ${affected} at approx ${estDist.toFixed(1)} km.`,
        time: now,
      });

      // 4. Protection Activated Alert
      list.push({
        id: 'protection-active',
        severity: 'WARNING',
        title: 'Protection Sequence Armed',
        message: `Inverse-time clearing delay armed (${delayMs.toFixed(0)} ms). Trip signal issued to circuit breaker CB1.`,
        time: now,
      });
    }

    // 5. Breaker Opened Alert
    if (isBreakerOpen) {
      list.push({
        id: 'breaker-open',
        severity: 'WARNING',
        title: 'Circuit Breaker CB1 Tripped (OPEN)',
        message: 'Primary line circuit breaker CB1 has opened contacts to clear fault current.',
        time: now,
      });
    }

    // 6. Fault Isolated Alert
    if (
      simulationData.grid_status === 'FAULT_ISOLATED' ||
      simulationData.grid_status === 'ISOLATED' ||
      simulationData.grid_status === 'POWER_RESTORED' ||
      isBreakerOpen
    ) {
      list.push({
        id: 'fault-isolated',
        severity: 'INFO',
        title: 'Fault Section Successfully Isolated',
        message: `Line section at ${estDist.toFixed(1)} km isolated. Healthy downstream loads restored via automated switching.`,
        time: now,
      });
    }

    // 7. Normal Operation Alert (if no fault and connected)
    if (!isDetected && (!backendStatus || backendStatus.connected) && !errorMessage) {
      list.push({
        id: 'grid-healthy',
        severity: 'SUCCESS',
        title: 'Nominal Power Flow (System Healthy)',
        message: 'Three-phase balanced 50 Hz power transmission. Current, voltage, and sequence components within IEEE tolerances.',
        time: now,
      });
    }

    return list;
  }, [simulationData, backendStatus, errorMessage]);

  const getAlertStyle = (severity) => {
    switch (severity) {
      case 'CRITICAL':
      case 'ERROR':
        return {
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.35)',
          color: '#f87171',
          icon: <AlertOctagon size={16} style={{ color: '#ef4444' }} />,
        };
      case 'WARNING':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.35)',
          color: '#fbbf24',
          icon: <AlertTriangle size={16} style={{ color: '#f59e0b' }} />,
        };
      case 'INFO':
        return {
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.35)',
          color: '#38bdf8',
          icon: <ShieldAlert size={16} style={{ color: '#38bdf8' }} />,
        };
      case 'SUCCESS':
      default:
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.35)',
          color: '#34d399',
          icon: <CheckCircle2 size={16} style={{ color: '#10b981' }} />,
        };
    }
  };

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Bell size={18} />
          <span>System Alerts & Operational Diagnostics</span>
        </div>
        <span className="scada-badge badge-info">
          {alerts.length} Active {alerts.length === 1 ? 'Notice' : 'Notices'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {alerts.map((item) => {
          const style = getAlertStyle(item.severity);
          return (
            <div
              key={item.id}
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>{style.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: style.color }}>
                    {item.title}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                    {item.time}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {item.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
