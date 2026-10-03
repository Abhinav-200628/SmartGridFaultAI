import React from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Clock,
  MapPin,
  TrendingDown,
  TrendingUp,
  Scale,
} from 'lucide-react';

/**
 * FaultDetection / Fault Analysis Component
 * Fulfills Requirement 7:
 * Displays dedicated FAULT ANALYSIS section:
 * - Fault Detected
 * - Fault Type
 * - Affected Phase(s)
 * - Fault Start Time
 * - Fault Duration
 * - Fault Resistance
 * - Fault Distance
 * Clear visual status indicators with dynamic Red/Green alerts.
 */
export default function FaultDetection({ simulationData }) {
  const isDetected = Boolean(simulationData?.fault_detected && simulationData?.fault_type !== 'NORMAL');
  const faultType = isDetected ? (simulationData?.fault_type || 'SHORT_CIRCUIT') : 'NORMAL';
  const gridStatus = simulationData?.grid_status || 'READY';

  // Affected phases
  const affectedPhases = simulationData?.affected_phases || [];
  const affectedDisplay = affectedPhases.length > 0
    ? affectedPhases.map((p) => `Phase ${p}`).join(', ')
    : isDetected
    ? 'All 3 Phases'
    : 'None (Balanced Positive Sequence)';

  // Distance
  const faultDist = simulationData?.fault_distance_km ?? simulationData?.simulation_parameters?.fault_distance_km ?? 25.0;
  const faultDistDisplay = isDetected ? `${faultDist.toFixed(1)} km` : 'N/A (Healthy)';

  // Timing & Resistance
  const startTime = simulationData?.fault_start_time ?? simulationData?.simulation_parameters?.fault_start_time ?? 0.04;
  const duration = simulationData?.fault_duration ?? simulationData?.simulation_parameters?.fault_duration ?? 0.06;
  const resistance = simulationData?.simulation_parameters?.fault_resistance_ohm ?? 1.0;

  // Measurement deviations
  const vSagPct = simulationData?.voltage_measurements?.voltage_sag_percent ?? 0.0;
  const iSurgeRatio = simulationData?.current_measurements?.current_surge_ratio ?? 1.0;
  const phaseImbalance = simulationData?.current_measurements?.phase_imbalance_ratio ?? 0.0;

  return (
    <div className="scada-card" style={{ borderLeft: isDetected ? '4px solid #ef4444' : '4px solid #10b981' }}>
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Activity size={18} style={{ color: isDetected ? '#ef4444' : 'var(--accent-cyan)' }} />
          <span>FAULT ANALYSIS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`scada-badge ${isDetected ? 'badge-fault' : 'badge-normal'}`}>
            {isDetected ? '● FAULT DETECTED' : '● SYSTEM HEALTHY'}
          </span>
          <span className="scada-badge badge-info">
            {gridStatus}
          </span>
        </div>
      </div>

      {/* Prominent High-Contrast Status Callout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          padding: '12px 14px',
          borderRadius: 'var(--radius-sm)',
          background: isDetected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
          border: `1px solid ${isDetected ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Fault Status
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: isDetected ? '#f87171' : '#34d399', marginTop: '2px' }}>
            {isDetected ? 'FAULT DETECTED' : 'NO FAULT'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Fault Type
          </div>
          <div className="mono-val" style={{ fontSize: '1rem', fontWeight: 800, color: isDetected ? '#fbbf24' : '#34d399', marginTop: '2px' }}>
            {faultType}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Affected Phase
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
            {isDetected ? (affectedPhases.length ? affectedPhases.join(', ') : 'A') : 'None'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Fault Distance
          </div>
          <div className="mono-val" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '2px' }}>
            {faultDistDisplay}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Protection Status
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isDetected ? '#38bdf8' : '#34d399', marginTop: '2px' }}>
            {isDetected ? (simulationData?.protection_status || 'ACTIVE') : 'HEALTHY'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Breaker State
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: (simulationData?.breaker_state === 'OPEN') ? '#f87171' : '#34d399', marginTop: '2px' }}>
            {simulationData?.breaker_state || (isDetected ? 'OPEN' : 'CLOSED')}
          </div>
        </div>
      </div>

      {/* Detailed Technical Parameters Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Fault Start (t₁)</div>
          <div className="mono-val" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
            {(startTime * 1000).toFixed(1)} ms
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Inception time</div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Fault Duration (Δt)</div>
          <div className="mono-val" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
            {(duration * 1000).toFixed(1)} ms
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Interruption span</div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Fault Resistance (Rf)</div>
          <div className="mono-val" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
            {resistance.toFixed(2)} Ω
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Transition path</div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Current Surge</div>
          <div className="mono-val" style={{ fontSize: '1rem', fontWeight: 700, color: iSurgeRatio > 1.5 ? '#f87171' : 'var(--accent-blue)', marginTop: '3px' }}>
            {iSurgeRatio.toFixed(2)}×
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>Relative to load</div>
        </div>
      </div>

      {/* Summary Footer */}
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
        <span>Voltage Sag: <strong style={{ color: vSagPct > 10 ? '#f87171' : 'var(--text-main)' }}>{vSagPct.toFixed(1)}%</strong></span>
        <span>Current Imbalance: <strong style={{ color: phaseImbalance > 15 ? '#fbbf24' : 'var(--text-main)' }}>{phaseImbalance.toFixed(1)}%</strong></span>
      </div>
    </div>
  );
}
