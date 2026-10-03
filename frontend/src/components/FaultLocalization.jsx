import React from 'react';
import { Compass, Cpu, Zap, Activity, Crosshair } from 'lucide-react';

/**
 * FaultLocalization Component
 * Fulfills Requirement 10:
 * "FAULT LOCALIZATION"
 * Displays:
 * - Actual Fault Distance
 * - Estimated Fault Distance
 * - Distance Error (km and %)
 * - Line Percentage
 * - Horizontal transmission-line visualization with a moving fault pin based on backend location:
 *   SOURCE ●━━━━━━━━━━━━━━━━━━━━━━● LOAD
 *                     ⚡ FAULT (24.5 km)
 */
export default function FaultLocalization({ simulationData }) {
  const isDetected = Boolean(simulationData?.fault_detected && simulationData?.fault_type !== 'NORMAL');

  // Line & Physical Ground Truth Parameters
  const lineLength = simulationData?.simulation_parameters?.line_length_km ?? 50.0;
  const actualDist = simulationData?.fault_distance_km ?? 25.0;

  // 1. Physics Reactance Method Estimates
  const physicsEstDist = simulationData?.estimated_fault_distance_km ?? (isDetected ? actualDist : 0.0);
  const physicsErrorKm = simulationData?.distance_error_km ?? Math.abs(physicsEstDist - actualDist);
  const physicsErrorPct =
    simulationData?.distance_error_percent ??
    (lineLength > 0 ? (physicsErrorKm / lineLength) * 100.0 : 0.0);

  // 2. Machine Learning Regressor Estimates (Stage 3)
  const mlLoc = simulationData?.ml_localization;
  const mlEnabled = Boolean(mlLoc?.enabled && mlLoc?.estimated_fault_distance_km !== null && mlLoc?.estimated_fault_distance_km !== undefined);
  const mlEstDist = mlEnabled ? mlLoc.estimated_fault_distance_km : physicsEstDist;
  const mlErrorKm = Math.abs(mlEstDist - actualDist);
  const mlErrorPct = lineLength > 0 ? (mlErrorKm / lineLength) * 100.0 : 0.0;
  const mlModelName = mlLoc?.model_name || 'RandomForestRegressor';

  // Position percentages (clamped to 0-100%)
  const actualPosPct = Math.max(0, Math.min(100, (actualDist / lineLength) * 100));
  const physicsPosPct = Math.max(0, Math.min(100, (physicsEstDist / lineLength) * 100));
  const mlPosPct = Math.max(0, Math.min(100, (mlEstDist / lineLength) * 100));

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Compass size={18} />
          <span>FAULT LOCALIZATION</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="scada-badge badge-info">
            Line: {lineLength.toFixed(0)} km
          </span>
          <span className={`scada-badge ${isDetected ? 'badge-fault' : 'badge-normal'}`}>
            {isDetected ? `Pin: ${actualPosPct.toFixed(1)}%` : 'Line Intact'}
          </span>
        </div>
      </div>

      {/* 4 Metrics Readout Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* 1. Actual Fault Distance */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
            Actual Fault Distance
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {isDetected ? `${actualDist.toFixed(2)} km` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            Physical Ground Truth
          </div>
        </div>

        {/* 2. Estimated Fault Distance (Physics) */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderTop: '2px solid var(--accent-cyan)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
            Estimated Distance (Physics)
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '4px 0' }}>
            {isDetected ? `${physicsEstDist.toFixed(2)} km` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            Reactance Method: Im(Z_app)/x₁
          </div>
        </div>

        {/* 3. Distance Error */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
            Distance Error
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: physicsErrorKm < 2.0 ? '#34d399' : '#f59e0b', margin: '4px 0' }}>
            {isDetected ? `±${physicsErrorKm.toFixed(2)} km` : '0.00 km'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            {isDetected ? `Relative: ${physicsErrorPct.toFixed(1)}%` : 'No deviation'}
          </div>
        </div>

        {/* 4. Line Percentage */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
            Line Percentage
          </div>
          <div className="mono-val" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
            {isDetected ? `${actualPosPct.toFixed(1)}%` : '0.0%'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            Span position (0–{lineLength.toFixed(0)} km)
          </div>
        </div>
      </div>

      {/* Horizontal Transmission-Line Visualization with Moving Fault Pin (Requirement 10) */}
      <div
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '24px 20px 16px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
            <span>SOURCE (0.0 km)</span>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
            Midpoint: {(lineLength * 0.5).toFixed(1)} km
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>LOAD ({lineLength.toFixed(1)} km)</span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          </div>
        </div>

        {/* Horizontal Line Track */}
        <div
          style={{
            position: 'relative',
            height: '10px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '5px',
            margin: '36px 0 24px 0',
          }}
        >
          {/* Energized Section Fill */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${isDetected ? actualPosPct : 100}%`,
              background: isDetected
                ? 'linear-gradient(90deg, #38bdf8, #ef4444)'
                : 'linear-gradient(90deg, #10b981, #38bdf8)',
              borderRadius: '5px',
              transition: 'width 0.4s ease',
            }}
          />

          {/* Source Terminal Node */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#38bdf8',
              border: '2px solid #080d1a',
              boxShadow: '0 0 8px #38bdf8',
              zIndex: 2,
            }}
          />

          {/* Load Terminal Node */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translate(50%, -50%)',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#10b981',
              border: '2px solid #080d1a',
              boxShadow: '0 0 8px #10b981',
              zIndex: 2,
            }}
          />

          {/* Moving Fault Marker (Dynamically positioned at actualPosPct) */}
          {isDetected && (
            <div
              style={{
                position: 'absolute',
                left: `${actualPosPct}%`,
                top: '-34px',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 10,
                transition: 'left 0.4s ease',
              }}
            >
              {/* Lightning Pin Icon */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                  boxShadow: '0 0 14px rgba(239, 68, 68, 0.9)',
                  animation: 'pulse-glow-red 1.5s infinite',
                }}
              >
                <Zap size={14} fill="#fff" />
              </div>

              {/* Dynamic Location Label */}
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#f87171',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginTop: '4px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                ⚡ FAULT: {actualDist.toFixed(1)} km ({actualPosPct.toFixed(0)}%)
              </div>

              {/* Vertical Guide Line */}
              <div
                style={{
                  width: '2px',
                  height: '14px',
                  background: '#ef4444',
                }}
              />
            </div>
          )}
        </div>

        {/* Legend / Dual Engine Diagnostics Note */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span>Reactance Estimate: <strong style={{ color: 'var(--accent-cyan)' }}>{isDetected ? `${physicsEstDist.toFixed(1)} km` : '—'}</strong></span>
          <span>ML Regressor Estimate: <strong style={{ color: '#10b981' }}>{isDetected ? `${mlEstDist.toFixed(1)} km` : '—'}</strong></span>
          <span>Variance Δ: <strong style={{ color: '#38bdf8' }}>{isDetected ? `${Math.abs(physicsEstDist - mlEstDist).toFixed(2)} km` : '0.00 km'}</strong></span>
        </div>
      </div>
    </div>
  );
}
