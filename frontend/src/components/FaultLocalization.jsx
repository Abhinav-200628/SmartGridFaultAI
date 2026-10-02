import React from 'react';
import { Compass } from 'lucide-react';

/**
 * FaultLocalization Component
 * Displays transmission line fault location estimation metrics:
 * - Actual/simulated fault distance
 * - Estimated fault distance (Reactance method calculated by backend)
 * - Distance percentage along the line
 * - Absolute distance error (km) & relative percentage error (%)
 * - Total line length
 * - Fault resistance (Rf)
 * Includes an interactive transmission line position track diagram.
 */
export default function FaultLocalization({ simulationData }) {
  const isDetected = Boolean(simulationData?.fault_detected);

  // Line & Distance Parameters
  const lineLength = simulationData?.simulation_parameters?.line_length_km ?? 50.0;
  const actualDist = simulationData?.fault_distance_km ?? 25.0;
  const estDist = simulationData?.estimated_fault_distance_km ?? (isDetected ? actualDist : 0.0);
  const distErrorKm = simulationData?.distance_error_km ?? Math.abs(estDist - actualDist);
  const distErrorPct =
    simulationData?.distance_error_percent ??
    (lineLength > 0 ? (distErrorKm / lineLength) * 100.0 : 0.0);
  const distPct =
    simulationData?.distance_percentage ??
    (lineLength > 0 ? (estDist / lineLength) * 100.0 : 50.0);

  const faultResistance =
    simulationData?.fault_summary?.fault_resistance_ohm ??
    simulationData?.simulation_parameters?.fault_resistance_ohm ??
    1.0;

  // Track position (clamped to 0-100%)
  const estPosPct = Math.max(0, Math.min(100, (estDist / lineLength) * 100));

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Compass size={18} />
          <span>Fault Distance Localization (Reactance Method)</span>
        </div>
        <span className={`scada-badge ${isDetected ? 'badge-fault' : 'badge-normal'}`}>
          {isDetected ? `d_est = ${estDist.toFixed(2)} km` : 'No Active Fault'}
        </span>
      </div>

      {/* Primary Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Estimated Fault Distance */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Estimated Distance
          </div>
          <div className="mono-val" style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '4px 0' }}>
            {isDetected ? `${estDist.toFixed(2)} km` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Apparent Impedance Im(Z_app)/x₁
          </div>
        </div>

        {/* Actual Fault Distance */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Actual Physical Distance
          </div>
          <div className="mono-val" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {isDetected ? `${actualDist.toFixed(2)} km` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Physical Inception Point
          </div>
        </div>

        {/* Distance Error */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Localization Error
          </div>
          <div className="mono-val" style={{ fontSize: '1.3rem', fontWeight: 800, color: distErrorKm > 2.0 ? '#fbbf24' : '#34d399', margin: '4px 0' }}>
            {isDetected ? `${distErrorKm.toFixed(2)} km` : '0.00 km'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Error: {isDetected ? `${distErrorPct.toFixed(1)}% of span` : '0.0%'}
          </div>
        </div>

        {/* Distance Percentage */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Span Percentage
          </div>
          <div className="mono-val" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {isDetected ? `${distPct.toFixed(1)}%` : '0.0%'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Of Total {lineLength.toFixed(0)} km Line
          </div>
        </div>

        {/* Fault Resistance */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Fault Arc Resistance (Rf)
          </div>
          <div className="mono-val" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {isDetected ? `${faultResistance.toFixed(2)} Ω` : 'N/A'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Contact & Ground Arc
          </div>
        </div>
      </div>

      {/* Visual Transmission Line Track with Distance Markers */}
      <div
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '24px 20px 16px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
              Substation A (Sending End)
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>0.0 km (Bus 1)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
              Substation B (Receiving End)
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{lineLength.toFixed(1)} km (Bus 2)</div>
          </div>
        </div>

        {/* Track Bar */}
        <div
          style={{
            height: '10px',
            background: '#1e293b',
            borderRadius: '5px',
            position: 'relative',
            margin: '20px 0',
          }}
        >
          {/* Healthy power flow section */}
          <div
            style={{
              height: '100%',
              width: isDetected ? `${estPosPct}%` : '100%',
              background: isDetected
                ? 'linear-gradient(90deg, #38bdf8, #ef4444)'
                : 'linear-gradient(90deg, #10b981, #38bdf8)',
              borderRadius: '5px',
            }}
          />

          {/* Fault Pin Marker */}
          {isDetected && (
            <div
              style={{
                position: 'absolute',
                left: `${estPosPct}%`,
                top: '-32px',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 5,
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  boxShadow: '0 0 12px rgba(239, 68, 68, 0.8)',
                  border: '2px solid #fff',
                }}
              >
                ⚡
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#f87171',
                  background: 'rgba(15, 23, 42, 0.95)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  whiteSpace: 'nowrap',
                  marginTop: '4px',
                }}
              >
                Est: {estDist.toFixed(1)} km
              </div>
            </div>
          )}
        </div>

        {/* Footnote */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '8px' }}>
          <span>Sending Substation CT/PT Measurement Point</span>
          <span>Line Reactance x₁ = 0.393 Ω/km</span>
        </div>
      </div>
    </div>
  );
}
