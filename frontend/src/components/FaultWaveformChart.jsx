import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Layers } from 'lucide-react';

/**
 * Custom SCADA Dark Tooltip for Fault Waveform Analyzer
 */
function FaultTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(9, 18, 36, 0.95)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '0.78rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ color: '#94a3b8', marginBottom: '6px', fontWeight: 700 }}>
          Timestamp: {label} s
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: payload.length > 3 ? 'repeat(2, 1fr)' : '1fr',
            gap: '4px 14px',
          }}
        >
          {payload.map((item, index) => {
            const isVolt = item.name.includes('V') || item.name.includes('Voltage');
            const formattedVal = isVolt
              ? Math.abs(item.value) >= 1000
                ? `${(item.value / 1000).toFixed(2)} kV`
                : `${item.value?.toFixed(1)} V`
              : Math.abs(item.value) >= 1000
              ? `${(item.value / 1000).toFixed(2)} kA`
              : `${item.value?.toFixed(1)} A`;

            return (
              <div
                key={index}
                style={{
                  color: item.color,
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <span>{item.name}:</span>
                <span className="mono-val">{formattedVal}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

/**
 * FaultWaveformChart Component
 * Comprehensive multi-mode waveform analysis suite:
 * - Voltage Only (Va, Vb, Vc)
 * - Current Only (Ia, Ib, Ic)
 * - Voltage + Current Dual Y-Axis Overlay
 * Features interactive phase isolation (Phase A, B, C toggles) and precise
 * millisecond boundary markers for FAULT INCEPTION and FAULT CLEARANCE.
 *
 * Props:
 * - simulationData: API response object from POST /api/simulation/run
 * - height: Chart container height in pixels (default: 380)
 * - defaultMode: 'voltage' | 'current' | 'both' (default: 'both')
 */
export default function FaultWaveformChart({
  simulationData,
  height = 380,
  defaultMode = 'both',
}) {
  const [activeMode, setActiveMode] = useState(defaultMode);
  const [visiblePhases, setVisiblePhases] = useState({ A: true, B: true, C: true });

  const chartData = useMemo(() => {
    if (!simulationData?.time || simulationData.time.length === 0) return [];

    const time = simulationData.time;
    const va = simulationData.va;
    const vb = simulationData.vb;
    const vc = simulationData.vc;
    const ia = simulationData.ia;
    const ib = simulationData.ib;
    const ic = simulationData.ic;
    const step = Math.max(1, Math.floor(time.length / 280));

    const points = [];
    for (let i = 0; i < time.length; i += step) {
      points.push({
        time: parseFloat(time[i].toFixed(4)),
        Va: va[i],
        Vb: vb[i],
        Vc: vc[i],
        Ia: ia[i],
        Ib: ib[i],
        Ic: ic[i],
      });
    }

    const lastIdx = time.length - 1;
    if (points.length > 0 && points[points.length - 1].time !== parseFloat(time[lastIdx].toFixed(4))) {
      points.push({
        time: parseFloat(time[lastIdx].toFixed(4)),
        Va: va[lastIdx],
        Vb: vb[lastIdx],
        Vc: vc[lastIdx],
        Ia: ia[lastIdx],
        Ib: ib[lastIdx],
        Ic: ic[lastIdx],
      });
    }

    return points;
  }, [simulationData]);

  const fStart = simulationData?.fault_start_time;
  const fEnd = simulationData?.fault_end_time;
  const isFault =
    simulationData?.fault_detected &&
    fStart !== undefined &&
    fEnd !== undefined &&
    fEnd > fStart;

  const togglePhase = (p) => {
    setVisiblePhases((prev) => ({ ...prev, [p]: !prev[p] }));
  };

  return (
    <div className="scada-card">
      <div className="scada-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="scada-card-title">
          <Layers size={18} />
          <span>Fault Waveform Analysis</span>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="tab-group">
          <button
            type="button"
            className={`tab-btn ${activeMode === 'voltage' ? 'active' : ''}`}
            onClick={() => setActiveMode('voltage')}
          >
            Voltage (V)
          </button>
          <button
            type="button"
            className={`tab-btn ${activeMode === 'current' ? 'active' : ''}`}
            onClick={() => setActiveMode('current')}
          >
            Current (A)
          </button>
          <button
            type="button"
            className={`tab-btn ${activeMode === 'both' ? 'active' : ''}`}
            onClick={() => setActiveMode('both')}
          >
            Voltage + Current (Dual Y-Axis)
          </button>
        </div>

        {/* Phase Isolation Toggles */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Phases:</span>
          {['A', 'B', 'C'].map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => togglePhase(phase)}
              className="btn-secondary"
              style={{
                padding: '2px 8px',
                fontSize: '0.72rem',
                opacity: visiblePhases[phase] ? 1 : 0.4,
                borderColor: visiblePhases[phase]
                  ? phase === 'A'
                    ? 'var(--phase-a)'
                    : phase === 'B'
                    ? 'var(--phase-b)'
                    : 'var(--phase-c)'
                  : 'var(--border-color)',
              }}
            >
              Phase {phase}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div
          style={{
            height: height,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: '10px',
            fontSize: '0.85rem',
          }}
        >
          <Layers size={32} style={{ opacity: 0.3 }} />
          <span>Awaiting dynamic simulation data from backend...</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Select fault configuration and click &ldquo;Run Simulation&rdquo; to analyze waveforms.
          </span>
        </div>
      ) : (
        <div style={{ width: '100%', height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 24, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v) => `${v}s`}
              />

              {/* Left Y-Axis (Voltage) */}
              {(activeMode === 'voltage' || activeMode === 'both') && (
                <YAxis
                  yAxisId="voltage"
                  orientation="left"
                  stroke="#38bdf8"
                  fontSize={11}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}kV` : `${v.toFixed(0)}V`
                  }
                  domain={['auto', 'auto']}
                />
              )}

              {/* Right Y-Axis (Current) */}
              {(activeMode === 'current' || activeMode === 'both') && (
                <YAxis
                  yAxisId="current"
                  orientation={activeMode === 'current' ? 'left' : 'right'}
                  stroke="#f59e0b"
                  fontSize={11}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}kA` : `${v.toFixed(0)}A`
                  }
                  domain={['auto', 'auto']}
                />
              )}

              <Tooltip content={FaultTooltip} />
              <Legend wrapperStyle={{ fontSize: '0.76rem', paddingTop: '8px' }} />

              {/* Shaded Fault Inception Window */}
              {isFault && (
                <ReferenceArea
                  yAxisId={activeMode === 'current' ? 'current' : 'voltage'}
                  x1={fStart}
                  x2={fEnd}
                  strokeOpacity={0.4}
                  fill="#ef4444"
                  fillOpacity={0.09}
                />
              )}

              {/* FAULT START Reference Line */}
              {isFault && (
                <ReferenceLine
                  yAxisId={activeMode === 'current' ? 'current' : 'voltage'}
                  x={fStart}
                  stroke="#ef4444"
                  strokeWidth={2}
                  label={{
                    value: 'FAULT START',
                    position: 'top',
                    fill: '#ef4444',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              {/* FAULT END Reference Line */}
              {isFault && (
                <ReferenceLine
                  yAxisId={activeMode === 'current' ? 'current' : 'voltage'}
                  x={fEnd}
                  stroke="#10b981"
                  strokeWidth={2}
                  label={{
                    value: 'FAULT ISOLATED / CLEARED',
                    position: 'top',
                    fill: '#10b981',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              {/* Voltage Waveform Lines */}
              {(activeMode === 'voltage' || activeMode === 'both') && visiblePhases.A && (
                <Line
                  yAxisId="voltage"
                  type="monotone"
                  dataKey="Va"
                  name="Va (Phase A Voltage)"
                  stroke="var(--phase-a)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {(activeMode === 'voltage' || activeMode === 'both') && visiblePhases.B && (
                <Line
                  yAxisId="voltage"
                  type="monotone"
                  dataKey="Vb"
                  name="Vb (Phase B Voltage)"
                  stroke="var(--phase-b)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {(activeMode === 'voltage' || activeMode === 'both') && visiblePhases.C && (
                <Line
                  yAxisId="voltage"
                  type="monotone"
                  dataKey="Vc"
                  name="Vc (Phase C Voltage)"
                  stroke="var(--phase-c)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Current Waveform Lines */}
              {(activeMode === 'current' || activeMode === 'both') && visiblePhases.A && (
                <Line
                  yAxisId="current"
                  type="monotone"
                  dataKey="Ia"
                  name="Ia (Phase A Current)"
                  stroke="#f87171"
                  strokeWidth={2}
                  strokeDasharray={activeMode === 'both' ? '4 2' : undefined}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {(activeMode === 'current' || activeMode === 'both') && visiblePhases.B && (
                <Line
                  yAxisId="current"
                  type="monotone"
                  dataKey="Ib"
                  name="Ib (Phase B Current)"
                  stroke="#fde047"
                  strokeWidth={2}
                  strokeDasharray={activeMode === 'both' ? '4 2' : undefined}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {(activeMode === 'current' || activeMode === 'both') && visiblePhases.C && (
                <Line
                  yAxisId="current"
                  type="monotone"
                  dataKey="Ic"
                  name="Ic (Phase C Current)"
                  stroke="#67e8f9"
                  strokeWidth={2}
                  strokeDasharray={activeMode === 'both' ? '4 2' : undefined}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
