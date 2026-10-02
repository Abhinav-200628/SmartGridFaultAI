import React from 'react';
import {
  Zap,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Server,
  Layers,
} from 'lucide-react';

/**
 * TransmissionLine Component
 * Single-line diagram (SLD) visualizer showing:
 * Generator / Source -> Transmission Line -> Fault Location -> Breaker -> Load
 *
 * Dynamically indicates:
 * - Normal state vs Fault state
 * - Fault location (using backend estimated_fault_distance_km)
 * - Faulted section
 * - Breaker CLOSED vs Breaker OPEN
 * - Isolated section / power restoration
 */
export default function TransmissionLine({ simulationData }) {
  const isDetected = Boolean(simulationData?.fault_detected);
  const breakerState = simulationData?.breaker_state || 'CLOSED';
  const isBreakerOpen = breakerState === 'OPEN';
  const isBreakerClosed = breakerState === 'CLOSED' || breakerState === 'RECLOSED';

  const estDist =
    simulationData?.estimated_fault_distance_km ??
    simulationData?.fault_distance_km ??
    25.0;
  const lineLength = simulationData?.simulation_parameters?.line_length_km ?? 50.0;
  const faultType = simulationData?.fault_type || 'NORMAL';
  const isIsolated =
    simulationData?.grid_status === 'FAULT_ISOLATED' ||
    simulationData?.grid_status === 'ISOLATED' ||
    simulationData?.grid_status === 'POWER_RESTORED' ||
    isBreakerOpen;

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Layers size={18} />
          <span>Transmission Line Single-Line Diagram (SLD)</span>
        </div>
        <span className={`scada-badge ${isBreakerClosed ? 'badge-normal' : 'badge-fault'}`}>
          Breaker: {breakerState}
        </span>
      </div>

      {/* Single-Line Diagram Flow Container */}
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
            minWidth: '650px',
            position: 'relative',
          }}
        >
          {/* 1. Generator / Source Substation */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7, #00f0ff)',
                color: '#070c18',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
              }}
            >
              <Zap size={26} />
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
              Generator / Source
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)' }}>
              11 kV Substation A
            </div>
          </div>

          {/* Line Segment 1 (Sending End to Fault Point) */}
          <div style={{ flex: 1, position: 'relative', margin: '0 10px' }}>
            <div
              style={{
                height: '4px',
                background: isDetected ? '#ef4444' : '#38bdf8',
                boxShadow: isDetected ? '0 0 8px rgba(239, 68, 68, 0.7)' : '0 0 6px rgba(56, 189, 248, 0.5)',
              }}
            />
            <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Transmission Line (0 to {isDetected ? estDist.toFixed(1) : (lineLength * 0.5).toFixed(0)} km)
            </div>
          </div>

          {/* 2. Fault Location Node */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-sm)',
                background: isDetected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                border: `2px solid ${isDetected ? '#ef4444' : '#10b981'}`,
                color: isDetected ? '#f87171' : '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isDetected ? '0 0 16px rgba(239, 68, 68, 0.5)' : 'none',
              }}
            >
              {isDetected ? <Activity size={24} /> : <ShieldCheck size={24} />}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isDetected ? '#f87171' : '#34d399', marginTop: '8px' }}>
              {isDetected ? 'Fault Location' : 'Normal Line'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              {isDetected ? `${estDist.toFixed(2)} km (${faultType})` : 'Continuous Conductor'}
            </div>
          </div>

          {/* Line Segment 2 (Fault Point to Breaker) */}
          <div style={{ flex: 1, position: 'relative', margin: '0 10px' }}>
            <div
              style={{
                height: '4px',
                background: isIsolated ? '#64748b' : isDetected ? '#ef4444' : '#38bdf8',
                boxShadow: isIsolated ? 'none' : '0 0 6px rgba(56, 189, 248, 0.5)',
              }}
            />
            <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              {isIsolated ? 'Isolated Section' : 'Power Flow'}
            </div>
          </div>

          {/* 3. Circuit Breaker (CB1) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-sm)',
                background: isBreakerClosed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `2px dashed ${isBreakerClosed ? '#10b981' : '#ef4444'}`,
                color: isBreakerClosed ? '#10b981' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isBreakerClosed ? '0 0 10px rgba(16, 185, 129, 0.3)' : '0 0 14px rgba(239, 68, 68, 0.6)',
              }}
            >
              {isBreakerClosed ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
              Breaker (CB1)
            </div>
            <div style={{ fontSize: '0.68rem', color: isBreakerClosed ? '#34d399' : '#f87171', fontWeight: 700 }}>
              {breakerState}
            </div>
          </div>

          {/* Line Segment 3 (Breaker to Load) */}
          <div style={{ flex: 1, position: 'relative', margin: '0 10px' }}>
            <div
              style={{
                height: '4px',
                background: isBreakerClosed ? '#10b981' : '#f59e0b',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
              }}
            />
            <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              {isBreakerClosed ? 'Feeders Energized' : 'Restored via Alternate Feeder'}
            </div>
          </div>

          {/* 4. Load Center / Substation B */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid var(--border-color)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Server size={24} />
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
              Consumer Load
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              Substation B (500 kW)
            </div>
          </div>
        </div>

        {/* Legend / Status Bar */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <strong>Status:</strong>{' '}
            {isDetected
              ? isIsolated
                ? `Fault at ${estDist.toFixed(1)} km ISOLATED • Healthy Load Restored`
                : `Fault at ${estDist.toFixed(1)} km ACTIVE • Clearing Delay Armed`
              : 'Continuous Transmission Line • Normal 50 Hz Power Flow'}
          </div>
          <div>
            <strong>Circuit Breaker:</strong> {isBreakerClosed ? 'CLOSED (Normal In-Service)' : 'OPEN (Tripped via Protection Relay)'}
          </div>
        </div>
      </div>
    </div>
  );
}
