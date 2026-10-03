import React from 'react';
import { Scale, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * SymmetricalComponents Component
 * Fulfills Requirement 9:
 * "SYMMETRICAL COMPONENT ANALYSIS"
 * Displays:
 * Positive Sequence: V1, I1
 * Negative Sequence: V2, I2
 * Zero Sequence: V0, I0
 * Uses compact metric cards.
 * Highlights abnormal negative/zero sequence values when applicable.
 * Small explanatory label: "Fortescue Transformation".
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
          <span>SYMMETRICAL COMPONENT ANALYSIS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.68rem',
              color: 'var(--accent-cyan)',
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontWeight: 600,
            }}
          >
            Fortescue Transformation
          </span>
          <span className={`scada-badge ${isGroundFault ? 'badge-fault' : 'badge-normal'}`}>
            I₀/I₁: {(i0i1Ratio * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Symmetrical Components 3-Card Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        {/* 1. Positive Sequence (V1, I1) */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderTop: '3px solid var(--accent-cyan)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
              Positive Sequence (1)
            </span>
            <span className="scada-badge badge-info" style={{ fontSize: '0.62rem' }}>
              Balanced
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Voltage (V₁)</div>
              <div className="mono-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                {v1 >= 1000 ? `${(v1 / 1000).toFixed(2)} kV` : `${v1.toFixed(1)} V`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Current (I₁)</div>
              <div className="mono-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                {i1.toFixed(1)} A
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
            Normal balanced synchronous operating component
          </div>
        </div>

        {/* 2. Negative Sequence (V2, I2) */}
        <div
          style={{
            background: isUnbalanced ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-input)',
            border: `1px solid ${isUnbalanced ? 'rgba(245, 158, 11, 0.45)' : 'var(--border-color)'}`,
            borderTop: `3px solid ${isUnbalanced ? '#f59e0b' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isUnbalanced ? '#fbbf24' : 'var(--text-muted)', textTransform: 'uppercase' }}>
              Negative Sequence (2)
            </span>
            <span className={`scada-badge ${isUnbalanced ? 'badge-warning' : 'badge-normal'}`} style={{ fontSize: '0.62rem' }}>
              {isUnbalanced ? 'Unbalance' : 'Nominal'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Voltage (V₂)</div>
              <div className="mono-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: isUnbalanced ? '#fbbf24' : '#f8fafc' }}>
                {v2 >= 1000 ? `${(v2 / 1000).toFixed(2)} kV` : `${v2.toFixed(1)} V`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Current (I₂)</div>
              <div className="mono-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: isUnbalanced ? '#fbbf24' : '#f8fafc' }}>
                {i2.toFixed(1)} A
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.68rem', color: isUnbalanced ? '#fbbf24' : 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
            {isUnbalanced ? 'Phase unbalance / interphase fault' : 'Low unbalance margin (< 5%)'}
          </div>
        </div>

        {/* 3. Zero Sequence (V0, I0) */}
        <div
          style={{
            background: isGroundFault ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-input)',
            border: `1px solid ${isGroundFault ? 'rgba(239, 68, 68, 0.45)' : 'var(--border-color)'}`,
            borderTop: `3px solid ${isGroundFault ? '#ef4444' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isGroundFault ? '#f87171' : 'var(--text-muted)', textTransform: 'uppercase' }}>
              Zero Sequence (0)
            </span>
            <span className={`scada-badge ${isGroundFault ? 'badge-fault' : 'badge-normal'}`} style={{ fontSize: '0.62rem' }}>
              {isGroundFault ? 'Earth Fault' : 'Isolated Ground'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Voltage (V₀)</div>
              <div className="mono-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: isGroundFault ? '#f87171' : '#f8fafc' }}>
                {v0 >= 1000 ? `${(v0 / 1000).toFixed(2)} kV` : `${v0.toFixed(1)} V`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Current (I₀)</div>
              <div className="mono-val" style={{ fontSize: '1.1rem', fontWeight: 800, color: isGroundFault ? '#f87171' : '#f8fafc' }}>
                {i0.toFixed(1)} A
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.68rem', color: isGroundFault ? '#f87171' : 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
            {isGroundFault ? 'Ground involvement (LG or LLG short)' : 'Neutral current suppressed'}
          </div>
        </div>
      </div>
    </div>
  );
}
