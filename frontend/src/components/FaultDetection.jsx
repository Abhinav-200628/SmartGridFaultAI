import React from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingDown,
  TrendingUp,
  Scale,
} from 'lucide-react';

/**
 * FaultDetection Component
 * Displays real-time deterministic electrical fault detection indicators:
 * - Fault Detected: YES / NO
 * - Grid Status
 * - RMS Voltage & Phase RMS
 * - RMS Current & Phase Currents
 * - Voltage Deviation (Sag/Surge %)
 * - Current Deviation (Surge Ratio)
 * - Negative Sequence Magnitude (V2, I2)
 * - Zero Sequence Magnitude (V0, I0)
 * - Phase Current Imbalance Ratio
 */
export default function FaultDetection({ simulationData }) {
  const isDetected = Boolean(simulationData?.fault_detected);
  const gridStatus = simulationData?.grid_status || 'READY';

  // Nominal and Phase RMS Voltage
  const vRmsNominal = simulationData?.metrics?.v_rms_normal_v ?? 11000.0;
  const vaRms = simulationData?.rms_values?.va_rms ?? (vRmsNominal / Math.sqrt(3));
  const vbRms = simulationData?.rms_values?.vb_rms ?? (vRmsNominal / Math.sqrt(3));
  const vcRms = simulationData?.rms_values?.vc_rms ?? (vRmsNominal / Math.sqrt(3));

  // Nominal and Phase RMS Current
  const iRmsNominal = simulationData?.metrics?.i_rms_normal_a ?? 30.0;
  const iaRms = simulationData?.rms_values?.ia_rms ?? iRmsNominal;
  const ibRms = simulationData?.rms_values?.ib_rms ?? iRmsNominal;
  const icRms = simulationData?.rms_values?.ic_rms ?? iRmsNominal;

  // Deviations & Imbalance from backend measurements
  const vSagPct = simulationData?.voltage_measurements?.voltage_sag_percent ?? 0.0;
  const iSurgeRatio = simulationData?.current_measurements?.current_surge_ratio ?? 1.0;
  const phaseImbalance = simulationData?.current_measurements?.phase_imbalance_ratio ?? 0.0;

  // Symmetrical Sequence Magnitudes
  const v2Mag = simulationData?.sequence_components?.v2_mag ?? 0.0;
  const i2Mag = simulationData?.sequence_components?.i2_mag ?? 0.0;
  const v0Mag = simulationData?.sequence_components?.v0_mag ?? 0.0;
  const i0Mag = simulationData?.sequence_components?.i0_mag ?? 0.0;

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Activity size={18} />
          <span>Electrical Fault Detection System</span>
        </div>
        <div className="status-pill">
          <span className={`pill-dot ${isDetected ? 'offline' : 'online'}`} />
          <span style={{ fontWeight: 700 }}>
            {isDetected ? 'DISTURBANCE DETECTED' : 'SYSTEM HEALTHY'}
          </span>
        </div>
      </div>

      {/* Detection Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderRadius: 'var(--radius-sm)',
          background: isDetected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
          border: `1px solid ${isDetected ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isDetected ? (
            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
          ) : (
            <CheckCircle2 size={24} style={{ color: '#10b981' }} />
          )}
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Relay Fault Condition
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isDetected ? '#f87171' : '#34d399' }}>
              Fault Detected: {isDetected ? 'YES' : 'NO'}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Operating Grid Status
          </div>
          <span
            className={`scada-badge ${
              !isDetected ? 'badge-normal' : gridStatus === 'FAULT_ISOLATED' ? 'badge-info' : 'badge-fault'
            }`}
            style={{ fontSize: '0.85rem', padding: '4px 10px' }}
          >
            {gridStatus}
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* RMS Voltage */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Zap size={14} style={{ color: 'var(--accent-blue)' }} />
            <span>Bus RMS Voltage</span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {vRmsNominal >= 1000 ? `${(vRmsNominal / 1000).toFixed(2)} kV` : `${vRmsNominal.toFixed(1)} V`}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Va: {vaRms.toFixed(0)}V | Vb: {vbRms.toFixed(0)}V | Vc: {vcRms.toFixed(0)}V
          </div>
        </div>

        {/* RMS Current */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Activity size={14} style={{ color: 'var(--accent-amber)' }} />
            <span>Phase RMS Current</span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {iRmsNominal.toFixed(1)} A
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Ia: {iaRms.toFixed(1)}A | Ib: {ibRms.toFixed(1)}A | Ic: {icRms.toFixed(1)}A
          </div>
        </div>

        {/* Voltage Deviation */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <TrendingDown size={14} style={{ color: vSagPct > 5 ? '#ef4444' : '#10b981' }} />
            <span>Voltage Sag Deviation</span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: vSagPct > 5 ? '#f87171' : '#34d399', margin: '4px 0' }}>
            {vSagPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {vSagPct > 10.0 ? 'Severe Voltage Depression' : 'Nominal Potential Margin'}
          </div>
        </div>

        {/* Current Deviation */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <TrendingUp size={14} style={{ color: iSurgeRatio > 1.2 ? '#ef4444' : '#10b981' }} />
            <span>Current Surge Ratio</span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: iSurgeRatio > 1.2 ? '#f87171' : '#34d399', margin: '4px 0' }}>
            {iSurgeRatio.toFixed(2)}x
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {iSurgeRatio > 1.35 ? 'Overcurrent Relay Trip Level' : 'Normal Conduction Current'}
          </div>
        </div>
      </div>

      {/* Symmetrical & Imbalance Diagnostic Table */}
      <div
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '8px' }}>
          <Scale size={14} /> Sequence & Imbalance Signatures
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Negative Sequence (V₂ / I₂)</div>
            <div className="mono-val" style={{ fontSize: '0.95rem', fontWeight: 700, color: v2Mag > 50 ? '#f87171' : '#f1f5f9' }}>
              V₂: {v2Mag.toFixed(1)} V | I₂: {i2Mag.toFixed(1)} A
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Phase Unbalance / Asymmetry Indicator</div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Zero Sequence (V₀ / I₀)</div>
            <div className="mono-val" style={{ fontSize: '0.95rem', fontWeight: 700, color: v0Mag > 50 ? '#f87171' : '#f1f5f9' }}>
              V₀: {v0Mag.toFixed(1)} V | I₀: {i0Mag.toFixed(1)} A
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Ground Return / Earth Loop Indicator</div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Phase Current Imbalance</div>
            <div className="mono-val" style={{ fontSize: '0.95rem', fontWeight: 700, color: phaseImbalance > 0.2 ? '#f87171' : '#f1f5f9' }}>
              {(phaseImbalance * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>IEEE 1159 Balance Compliance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
