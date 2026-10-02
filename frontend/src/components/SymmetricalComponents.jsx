import React from 'react';
import {
  Scale,
  Zap,
  Activity,
  Layers,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

/**
 * SymmetricalComponents Component
 * Fortescue Symmetrical Sequence Component Analysis:
 * - Positive Sequence: V1, I1 (Normal balanced component)
 * - Negative Sequence: V2, I2 (Phase unbalance / interphase fault indication)
 * - Zero Sequence: V0, I0 (Ground-related earth fault indication)
 * - Ratios: I0/I1 (Zero-to-positive ratio) & I2/I1 (Negative-to-positive ratio)
 */
export default function SymmetricalComponents({ simulationData }) {
  const seq = simulationData?.sequence_components;

  const v1 = seq?.v1_mag ?? (simulationData?.positive_sequence?.magnitude_v ?? 0.0);
  const i1 = seq?.i1_mag ?? (simulationData?.positive_sequence?.magnitude_a ?? 0.0);

  const v2 = seq?.v2_mag ?? (simulationData?.negative_sequence?.magnitude_v ?? 0.0);
  const i2 = seq?.i2_mag ?? (simulationData?.negative_sequence?.magnitude_a ?? 0.0);

  const v0 = seq?.v0_mag ?? (simulationData?.zero_sequence?.magnitude_v ?? 0.0);
  const i0 = seq?.i0_mag ?? (simulationData?.zero_sequence?.magnitude_a ?? 0.0);

  const i0i1Ratio = seq?.i0_i1_ratio ?? (i1 > 0.01 ? i0 / i1 : 0.0);
  const i2i1Ratio = seq?.i2_i1_ratio ?? (i1 > 0.01 ? i2 / i1 : 0.0);

  const isGroundFault = i0 > 5.0 || i0i1Ratio > 0.15;
  const isUnbalanced = i2 > 5.0 || i2i1Ratio > 0.15;

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Scale size={18} />
          <span>Fortescue Symmetrical Sequence Components</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem' }}>
          <span className={`scada-badge ${isGroundFault ? 'badge-fault' : 'badge-normal'}`}>
            I₀/I₁: {(i0i1Ratio * 100).toFixed(1)}%
          </span>
          <span className={`scada-badge ${isUnbalanced ? 'badge-warning' : 'badge-normal'}`}>
            I₂/I₁: {(i2i1Ratio * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Symmetrical Components 3-Card Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '18px',
        }}
      >
        {/* 1. Positive Sequence (V1, I1) */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              Positive Sequence (1)
            </span>
            <span className="scada-badge badge-info">Balanced</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Voltage (V₁)</div>
              <div className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {v1 >= 1000 ? `${(v1 / 1000).toFixed(2)} kV` : `${v1.toFixed(1)} V`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Current (I₁)</div>
              <div className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {i1.toFixed(1)} A
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', marginTop: '6px' }}>
            → Normal balanced power flow component (equal magnitude, 120° phase displacement)
          </div>
        </div>

        {/* 2. Negative Sequence (V2, I2) */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: `1px solid ${isUnbalanced ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fbbf24' }}>
              Negative Sequence (2)
            </span>
            <span className={`scada-badge ${isUnbalanced ? 'badge-warning' : 'badge-normal'}`}>
              {isUnbalanced ? 'Unbalance Active' : 'Negligible'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Voltage (V₂)</div>
              <div className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {v2 >= 1000 ? `${(v2 / 1000).toFixed(2)} kV` : `${v2.toFixed(1)} V`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Current (I₂)</div>
              <div className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {i2.toFixed(1)} A
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', marginTop: '6px' }}>
            → Phase imbalance & unsymmetrical fault indication (reverse phase rotation a-c-b)
          </div>
        </div>

        {/* 3. Zero Sequence (V0, I0) */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: `1px solid ${isGroundFault ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f87171' }}>
              Zero Sequence (0)
            </span>
            <span className={`scada-badge ${isGroundFault ? 'badge-fault' : 'badge-normal'}`}>
              {isGroundFault ? 'Earth Fault Active' : 'Zero Return'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Voltage (V₀)</div>
              <div className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {v0 >= 1000 ? `${(v0 / 1000).toFixed(2)} kV` : `${v0.toFixed(1)} V`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Current (I₀)</div>
              <div className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                {i0.toFixed(1)} A
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', marginTop: '6px' }}>
            → Ground-related earth loop indication (in-phase components returning through neutral/ground)
          </div>
        </div>
      </div>

      {/* Sequence Ratios Table */}
      <div
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
        }}
      >
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Sequence Ratio Diagnostic Thresholds
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Zero-to-Positive Current Ratio (I₀ / I₁)</div>
            <div className="mono-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: isGroundFault ? '#f87171' : '#34d399' }}>
              {i0i1Ratio.toFixed(3)} ({(i0i1Ratio * 100).toFixed(1)}%)
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              {i0i1Ratio > 0.15 ? 'Indicates Ground Path Involvement (LG / LLG)' : 'Earth Fault Threshold Not Exceeded'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Negative-to-Positive Current Ratio (I₂ / I₁)</div>
            <div className="mono-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: isUnbalanced ? '#fbbf24' : '#34d399' }}>
              {i2i1Ratio.toFixed(3)} ({(i2i1Ratio * 100).toFixed(1)}%)
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              {i2i1Ratio > 0.15 ? 'Significant Asymmetry / Conductor Interruption' : 'Balanced Symmetrical System'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
