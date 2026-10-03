import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Power,
  GitBranch,
  ArrowRight,
  Zap,
} from 'lucide-react';

/**
 * ProtectionPanel Component
 * Fulfills Requirement 12:
 * "PROTECTION & SWITCHING"
 * Displays step sequence:
 * NORMAL -> FAULT DETECTED -> PROTECTION DELAY -> BREAKER OPEN -> FAULT ISOLATED -> POST-FAULT STATE
 * Highlights the current active state.
 * Displays actual backend protection events and sectionalizer coordinates.
 */
export default function ProtectionPanel({ simulationData, onOperatorOverride }) {
  const isDetected = Boolean(simulationData?.fault_detected && simulationData?.fault_type !== 'NORMAL');
  
  // Local state for manual operator overrides
  const [operatorOverride, setOperatorOverride] = useState(null);

  // Active breaker state
  const rawBreakerState = simulationData?.breaker_state || 'CLOSED';
  const breakerState = operatorOverride?.breakerState || rawBreakerState;
  const isBreakerOpen = breakerState === 'OPEN';
  const isBreakerClosed = breakerState === 'CLOSED' || breakerState === 'RECLOSED';

  // Active switching and isolation state
  const rawSwitchingState = simulationData?.switching_state || 'NORMAL';
  const switchingState = operatorOverride?.switchingState || rawSwitchingState;
  const isRestored = switchingState === 'SYSTEM_RESTORED' || simulationData?.grid_status === 'SYSTEM_RESTORED';
  const isIsolated = switchingState === 'FAULT_ISOLATED' || isRestored || isBreakerOpen;

  const protectionDelayMs =
    simulationData?.simulation_parameters?.protection_delay_ms ?? 40.0;

  const isolatedSec = simulationData?.isolated_section;
  const protectionEvents = simulationData?.protection_events || [];

  // Determine current active step in the protection sequence
  // 1: NORMAL, 2: FAULT DETECTED, 3: PROTECTION DELAY, 4: BREAKER OPEN, 5: FAULT ISOLATED, 6: POST-FAULT STATE
  let currentStep = 1;
  if (isDetected) {
    currentStep = 2; // Fault Detected
    if (simulationData?.protection_trip_time > 0) {
      currentStep = 3; // Delay armed
    }
    if (isBreakerOpen) {
      currentStep = 4; // Breaker Open
      if (isIsolated) {
        currentStep = 5; // Fault Isolated
      }
      if (isRestored) {
        currentStep = 6; // Post-Fault State / System Restored
      }
    }
  }

  const steps = [
    { id: 1, label: 'NORMAL', desc: 'Grid nominal' },
    { id: 2, label: 'FAULT DETECTED', desc: 'Overcurrent pickup' },
    { id: 3, label: 'PROTECTION DELAY', desc: `${protectionDelayMs.toFixed(0)} ms timer` },
    { id: 4, label: 'BREAKER OPEN', desc: 'CB1 contacts parted' },
    { id: 5, label: 'FAULT ISOLATED', desc: 'Sectionalizer lockout' },
    { id: 6, label: 'POST-FAULT STATE', desc: isRestored ? 'TS1 Closed (Restored)' : 'De-energized standby' },
  ];

  // Manual Operator Action Handlers
  const handleManualTrip = () => {
    const override = {
      breakerState: 'OPEN',
      switchingState: 'BREAKER_OPEN',
      action: 'OPERATOR_MANUAL_TRIP',
      desc: 'Operator manually dispatched remote trip command; CB1 contacts parted',
    };
    setOperatorOverride(override);
    if (onOperatorOverride) onOperatorOverride(override);
  };

  const handleManualClose = () => {
    const override = {
      breakerState: 'CLOSED',
      switchingState: 'NORMAL',
      action: 'OPERATOR_MANUAL_CLOSE',
      desc: 'Operator manually reclosed substation breaker CB1; line energized',
    };
    setOperatorOverride(override);
    if (onOperatorOverride) onOperatorOverride(override);
  };

  const handleTieSwitchToggle = () => {
    const override = {
      breakerState: 'OPEN',
      switchingState: 'SYSTEM_RESTORED',
      action: 'OPERATOR_TIE_RECONFIGURE',
      desc: 'Operator initiated closing of tie-switch TS1; healthy section restored',
    };
    setOperatorOverride(override);
    if (onOperatorOverride) onOperatorOverride(override);
  };

  const handleResetOverride = () => {
    setOperatorOverride(null);
  };

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Shield size={18} />
          <span>PROTECTION &amp; SWITCHING</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`scada-badge ${isRestored ? 'badge-normal' : isBreakerOpen ? 'badge-fault' : 'badge-normal'}`}>
            State: {switchingState}
          </span>
          <span className={`scada-badge ${isBreakerClosed ? 'badge-normal' : 'badge-fault'}`}>
            Breaker: {breakerState}
          </span>
        </div>
      </div>

      {/* Step Sequence Stepper Indicator (Requirement 12) */}
      <div className="protection-stepper">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isPassed = currentStep > step.id;
          const isRed = step.id === 2 || step.id === 4;
          const isGreen = step.id === 1 || step.id === 6;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`stepper-step ${isActive ? 'active' : ''} ${isPassed ? 'completed' : ''} ${
                  isActive && isRed ? 'step-red' : isActive && isGreen ? 'step-green' : ''
                }`}
                style={{
                  border: isActive
                    ? isRed
                      ? '1px solid #ef4444'
                      : isGreen
                      ? '1px solid #10b981'
                      : '1px solid var(--accent-cyan)'
                    : '1px solid transparent',
                }}
              >
                <div style={{ fontSize: '0.62rem', color: isActive ? 'var(--accent-cyan)' : 'var(--text-dim)', fontWeight: 700 }}>
                  STEP {step.id}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: isActive
                      ? isRed
                        ? '#f87171'
                        : isGreen
                        ? '#34d399'
                        : 'var(--accent-cyan)'
                      : isPassed
                      ? 'var(--text-muted)'
                      : 'var(--text-dim)',
                    margin: '2px 0',
                  }}
                >
                  {step.label}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                  {step.desc}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <span className="stepper-arrow" style={{ color: isPassed ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.15)' }}>
                  →
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Primary Telemetry Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        {/* 1. Breaker Operating State */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {isBreakerClosed ? (
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
            ) : (
              <ShieldAlert size={14} style={{ color: '#ef4444' }} />
            )}
            <span>Circuit Breaker (CB1)</span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.2rem', fontWeight: 800, color: isBreakerClosed ? '#34d399' : '#f87171', margin: '4px 0' }}>
            {breakerState}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {isBreakerClosed ? 'Latched & Conducting' : 'Tripped by Protective Relay'}
          </div>
        </div>

        {/* 2. Protection Clearing Delay */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>Clearing Delay Timer</span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
            {protectionDelayMs.toFixed(0)} ms
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            Inverse definite minimum time (IDMT)
          </div>
        </div>

        {/* 3. Section Isolation Status */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <CheckCircle size={14} style={{ color: isBreakerOpen ? '#38bdf8' : '#10b981' }} />
            <span>Section Isolation</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isBreakerOpen ? '#38bdf8' : '#f8fafc', margin: '4px 0' }}>
            {isolatedSec ? isolatedSec.status : 'IN_SERVICE'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {isolatedSec ? `${isolatedSec.section_id} (${isolatedSec.from_km}-${isolatedSec.to_km} km)` : 'Full Line In Service'}
          </div>
        </div>
      </div>

      {/* Actual Backend Protection Events (Requirement 12) */}
      {protectionEvents.length > 0 && (
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '14px',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={13} />
            <span>Protection Event Log (Recorded by Relay)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
            {protectionEvents.map((ev, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.74rem',
                  padding: '4px 0',
                  borderBottom: i < protectionEvents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="mono-val" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {ev.time != null ? `${(ev.time * 1000).toFixed(1)} ms` : `${(ev.timestamp * 1000).toFixed(1)} ms`}
                  </span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{ev.event || ev.device}</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{ev.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCADA Remote Operator Override Controls */}
      <div
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span>Manual SCADA Operator Overrides</span>
          </div>
          {operatorOverride && (
            <button
              type="button"
              onClick={handleResetOverride}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--text-muted)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                cursor: 'pointer',
              }}
            >
              Reset to Auto
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleManualTrip}
            className="btn-danger"
            style={{
              padding: '5px 10px',
              fontSize: '0.72rem',
              background: isBreakerOpen && operatorOverride ? 'rgba(239,68,68,0.35)' : '',
            }}
          >
            <Power size={12} />
            <span>Trip Breaker (CB1 Open)</span>
          </button>

          <button
            type="button"
            onClick={handleManualClose}
            className="btn-secondary"
            style={{
              padding: '5px 10px',
              fontSize: '0.72rem',
              borderColor: isBreakerClosed && operatorOverride ? '#10b981' : '',
              color: isBreakerClosed && operatorOverride ? '#34d399' : '',
            }}
          >
            <ShieldCheck size={12} />
            <span>Reclose Breaker (CB1 Close)</span>
          </button>

          <button
            type="button"
            onClick={handleTieSwitchToggle}
            className="btn-secondary"
            style={{
              padding: '5px 10px',
              fontSize: '0.72rem',
              borderColor: isRestored ? '#10b981' : '',
              color: isRestored ? '#34d399' : '',
            }}
          >
            <GitBranch size={12} />
            <span>Tie-Switch TS1 (Restore Section 2)</span>
          </button>
        </div>

        {operatorOverride && (
          <div style={{ marginTop: '6px', fontSize: '0.68rem', color: 'var(--accent-cyan)' }}>
            <strong>Manual Override Active:</strong> {operatorOverride.desc}
          </div>
        )}
      </div>
    </div>
  );
}
