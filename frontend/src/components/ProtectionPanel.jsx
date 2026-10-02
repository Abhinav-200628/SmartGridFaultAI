import React from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

/**
 * ProtectionPanel Component
 * Displays automated protection and circuit breaker telemetry:
 * - Breaker State (CLOSED / OPEN / TRIP_SIGNAL / RECLOSED)
 * - Protection Status (STANDBY / ACTIVE / FAULT_ISOLATED)
 * - Protection Delay (ms)
 * - Fault Isolation Status (ISOLATED / CONNECTED)
 * - Number of protection events
 */
export default function ProtectionPanel({ simulationData }) {
  const isDetected = Boolean(simulationData?.fault_detected);
  const breakerState = simulationData?.breaker_state || 'CLOSED';
  const isBreakerOpen = breakerState === 'OPEN';
  const isBreakerClosed = breakerState === 'CLOSED' || breakerState === 'RECLOSED';

  const protectionDelayMs =
    simulationData?.simulation_parameters?.protection_delay_ms ?? 40.0;

  const eventCount = simulationData?.protection_events?.length ?? 0;

  // Determine Protection Status text and badge
  let protectionStatus = 'STANDBY (Nominal)';
  let isolationStatus = 'CONNECTED (Normal Grid)';

  if (isDetected) {
    if (isBreakerOpen) {
      protectionStatus = 'FAULT CLEARED (Breaker Open)';
      isolationStatus = 'FAULT SECTION ISOLATED';
    } else {
      protectionStatus = 'PROTECTION ACTIVE (Trip Signal Armed)';
      isolationStatus = 'FAULT ACTIVE (Clearing Delay in Progress)';
    }
  }

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Shield size={18} />
          <span>Protection Relay & Circuit Breaker System</span>
        </div>
        <span className={`scada-badge ${isBreakerClosed ? 'badge-normal' : 'badge-fault'}`}>
          Breaker: {breakerState}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* 1. Breaker State */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {isBreakerClosed ? (
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
            ) : (
              <ShieldAlert size={14} style={{ color: '#ef4444' }} />
            )}
            <span>Breaker Operating State</span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: isBreakerClosed ? '#34d399' : '#f87171', margin: '4px 0' }}>
            {breakerState}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {isBreakerClosed ? 'Main Contacts Closed & Latched' : 'Contacts Separated • Arc Quenched'}
          </div>
        </div>

        {/* 2. Protection Status */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <AlertTriangle size={14} style={{ color: isDetected ? '#f59e0b' : '#38bdf8' }} />
            <span>Relay Protection Status</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {protectionStatus}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {isDetected ? 'Inverse-Time Overcurrent & Distance' : 'Relay Disarmed • Normal Limits'}
          </div>
        </div>

        {/* 3. Protection Delay */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>Breaker Clearing Delay</span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
            {protectionDelayMs.toFixed(0)} ms
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Total Relay Pickup + Mechanism Time
          </div>
        </div>

        {/* 4. Fault Isolation Status */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <CheckCircle size={14} style={{ color: isBreakerOpen ? '#38bdf8' : '#10b981' }} />
            <span>Fault Isolation Status</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isBreakerOpen ? '#38bdf8' : '#f8fafc', margin: '4px 0' }}>
            {isolationStatus}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {isBreakerOpen ? 'Section Disconnected from Grid' : 'Standard Continuous Feed'}
          </div>
        </div>

        {/* 5. Number of Protection Events */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <RotateCcw size={14} style={{ color: 'var(--accent-blue)' }} />
            <span>Protection Milestones</span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {eventCount} {eventCount === 1 ? 'Event' : 'Events'} Logged
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            High-Speed SCADA Sequence Log
          </div>
        </div>
      </div>
    </div>
  );
}
