import React from 'react';
import {
  Zap,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Server,
  Layers,
  GitBranch,
  Power,
} from 'lucide-react';

/**
 * TransmissionLine Component
 * Fulfills Requirement 11:
 * "TRANSMISSION LINE VISUALIZATION"
 * Professional electrical single-line diagram (SLD):
 * GRID / SOURCE
 *       │
 *    BREAKER (CB1)
 *       │
 * ━━━━━━━━━━━━━━━━━━━━━━━━
 *   TRANSMISSION LINE
 * ━━━━━━━━━━━━━━━━━━━━━━━━
 *       │
 *     FAULT ⚡
 *       │
 *      LOAD
 * Breaker status visually changes: CLOSED (Green) -> OPEN (Red)
 * Fault point turns red with animated pulse during fault conditions.
 */
export default function TransmissionLine({ simulationData }) {
  const isDetected = Boolean(simulationData?.fault_detected && simulationData?.fault_type !== 'NORMAL');
  const breakerState = simulationData?.breaker_state || 'CLOSED';
  const isBreakerOpen = breakerState === 'OPEN';
  const isBreakerClosed = breakerState === 'CLOSED' || breakerState === 'RECLOSED';

  const estDist =
    simulationData?.estimated_fault_distance_km ??
    simulationData?.fault_distance_km ??
    25.0;
  const lineLength = simulationData?.simulation_parameters?.line_length_km ?? 50.0;
  const faultType = simulationData?.fault_type || 'NORMAL';

  const isRestored =
    simulationData?.grid_status === 'SYSTEM_RESTORED' ||
    simulationData?.switching_state === 'SYSTEM_RESTORED';

  const isolatedSec = simulationData?.isolated_section;
  const isSec1Isolated = isolatedSec?.section_id === 'LINE_SEC_1_SENDING' || (isDetected && estDist <= lineLength * 0.5);
  const isSec2Isolated = isolatedSec?.section_id === 'LINE_SEC_2_RECEIVING' || (isDetected && estDist > lineLength * 0.5);

  const faultPosPct = Math.max(8, Math.min(92, (estDist / lineLength) * 100));

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Layers size={18} />
          <span>TRANSMISSION LINE SINGLE-LINE DIAGRAM (SLD)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isRestored && (
            <span className="scada-badge badge-normal" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GitBranch size={12} /> FLISR TS1 CLOSED
            </span>
          )}
          <span className={`scada-badge ${isBreakerClosed ? 'badge-normal' : 'badge-fault'}`}>
            Breaker: {breakerState}
          </span>
        </div>
      </div>

      {/* Industrial Electrical SLD Container */}
      <div
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '24px 20px',
          overflowX: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minWidth: '780px',
            position: 'relative',
          }}
        >
          {/* 1. GRID / SOURCE SUBSTATION */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '2px solid var(--accent-blue)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)',
              }}
            >
              <Server size={24} />
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
              GRID SOURCE
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)' }}>
              11.0 kV • 50 Hz
            </div>
          </div>

          {/* Busbar Coupling Line 1 */}
          <div style={{ flex: '0 0 25px', height: '3px', background: isBreakerOpen ? '#64748b' : 'var(--accent-blue)' }} />

          {/* 2. PROTECTIVE CIRCUIT BREAKER (CB1) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-sm)',
                background: isBreakerClosed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)',
                border: `2px solid ${isBreakerClosed ? '#10b981' : '#ef4444'}`,
                color: isBreakerClosed ? '#34d399' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isBreakerClosed
                  ? '0 0 14px rgba(16, 185, 129, 0.4)'
                  : '0 0 16px rgba(239, 68, 68, 0.6)',
                transition: 'all 0.3s ease',
              }}
            >
              <Power size={22} />
            </div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: isBreakerClosed ? '#34d399' : '#f87171', marginTop: '6px' }}>
              BREAKER (CB1)
            </div>
            <div className="mono-val" style={{ fontSize: '0.68rem', color: isBreakerClosed ? '#34d399' : '#f87171' }}>
              {breakerState}
            </div>
          </div>

          {/* Busbar Coupling Line 2 */}
          <div
            style={{
              flex: '0 0 30px',
              height: '3px',
              background: isBreakerClosed ? 'var(--accent-blue)' : '#475569',
            }}
          />

          {/* 3. TRANSMISSION LINE CONDUCTOR (Section 1 & Section 2) */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              padding: '0 15px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Top Span Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
              <span>Section 1 (0 – {(lineLength * 0.5).toFixed(0)} km)</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>TRANSMISSION LINE ({lineLength.toFixed(0)} km)</span>
              <span>Section 2 ({(lineLength * 0.5).toFixed(0)} – {lineLength.toFixed(0)} km)</span>
            </div>

            {/* Conductor Bar */}
            <div
              style={{
                width: '100%',
                height: '8px',
                background: isBreakerOpen && !isRestored
                  ? '#334155'
                  : 'linear-gradient(90deg, #38bdf8 0%, #00f0ff 100%)',
                borderRadius: '4px',
                position: 'relative',
                boxShadow: isBreakerClosed ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
              }}
            >
              {/* Midpoint Sectionalizer S1 / Tie-Switch TS1 */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  background: isRestored ? '#10b981' : isBreakerOpen ? '#f59e0b' : '#38bdf8',
                  border: '2px solid #080d1a',
                  zIndex: 3,
                }}
                title="Midpoint Sectionalizer S1 / Tie-Switch TS1"
              />

              {/* Dynamic Fault Inception Point (Red with Flash) */}
              {isDetected && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${faultPosPct}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      border: '2px solid #fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      boxShadow: '0 0 16px rgba(239, 68, 68, 0.95)',
                      animation: 'pulse-glow-red 1.2s infinite',
                    }}
                  >
                    <Zap size={14} fill="#fff" />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '28px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: '#f87171',
                      background: 'rgba(15, 23, 42, 0.95)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ⚡ FAULT @ {estDist.toFixed(1)} km
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status Indicators */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.68rem', marginTop: '16px' }}>
              <span style={{ color: isSec1Isolated && isBreakerOpen ? '#f87171' : isBreakerClosed ? '#34d399' : 'var(--text-dim)' }}>
                {isSec1Isolated && isBreakerOpen ? '● Section 1 ISOLATED' : '● Section 1 In-Service'}
              </span>
              <span style={{ color: isRestored ? '#34d399' : 'var(--text-dim)' }}>
                {isRestored ? '● TS1 CLOSED (RESTORED)' : '○ Tie-Switch TS1 (OPEN)'}
              </span>
              <span style={{ color: isSec2Isolated && isBreakerOpen && !isRestored ? '#f87171' : isRestored ? '#34d399' : isBreakerClosed ? '#34d399' : 'var(--text-dim)' }}>
                {isRestored ? '● Section 2 RESTORED' : isSec2Isolated && isBreakerOpen ? '● Section 2 ISOLATED' : '● Section 2 In-Service'}
              </span>
            </div>
          </div>

          {/* Busbar Coupling Line 3 */}
          <div
            style={{
              flex: '0 0 25px',
              height: '3px',
              background: isRestored ? '#10b981' : isBreakerClosed ? 'var(--accent-blue)' : '#475569',
            }}
          />

          {/* 4. CONSUMER LOAD SUBSTATION */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(30, 41, 59, 0.9)',
                border: `2px solid ${isRestored || isBreakerClosed ? '#10b981' : '#64748b'}`,
                color: isRestored || isBreakerClosed ? '#34d399' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isRestored || isBreakerClosed ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              <Activity size={24} />
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
              CONSUMER LOAD
            </div>
            <div style={{ fontSize: '0.68rem', color: isRestored || isBreakerClosed ? '#34d399' : 'var(--text-dim)' }}>
              {isRestored ? 'Fed via Tie-Switch' : isBreakerClosed ? 'Fed via Main Feeder' : 'De-energized'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
