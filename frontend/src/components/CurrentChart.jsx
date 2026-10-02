import React, { useMemo } from 'react';
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
import { Activity } from 'lucide-react';

/**
 * Custom SCADA Dark Tooltip for Current Waveforms
 */
function CurrentTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(9, 18, 36, 0.95)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '0.78rem',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{ color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
          Timestamp: {label} s
        </div>
        {payload.map((item, index) => (
          <div
            key={index}
            style={{
              color: item.color,
              fontWeight: 700,
              margin: '2px 0',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span>{item.name}:</span>
            <span className="mono-val">
              {Math.abs(item.value) >= 1000
                ? `${(item.value / 1000).toFixed(2)} kA`
                : `${item.value?.toFixed(1)} A`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

/**
 * CurrentChart Component
 * Renders three-phase instantaneous currents (Ia, Ib, Ic) using real backend data.
 *
 * Props:
 * - simulationData: API response object from POST /api/simulation/run
 * - height: Chart container height in pixels (default: 320)
 * - title: Custom card title (optional)
 */
export default function CurrentChart({
  simulationData,
  height = 320,
  title = 'Three-Phase Current Waveforms (Ia, Ib, Ic)',
}) {
  const chartData = useMemo(() => {
    if (!simulationData?.time || simulationData.time.length === 0) return [];

    const time = simulationData.time;
    const ia = simulationData.ia;
    const ib = simulationData.ib;
    const ic = simulationData.ic;
    const step = Math.max(1, Math.floor(time.length / 260));

    const points = [];
    for (let i = 0; i < time.length; i += step) {
      points.push({
        time: parseFloat(time[i].toFixed(4)),
        Ia: ia[i],
        Ib: ib[i],
        Ic: ic[i],
      });
    }

    const lastIdx = time.length - 1;
    if (points.length > 0 && points[points.length - 1].time !== parseFloat(time[lastIdx].toFixed(4))) {
      points.push({
        time: parseFloat(time[lastIdx].toFixed(4)),
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

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Activity size={18} />
          <span>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', fontWeight: 600 }}>
          <span style={{ color: 'var(--phase-a)' }}>● Phase A</span>
          <span style={{ color: 'var(--phase-b)' }}>● Phase B</span>
          <span style={{ color: 'var(--phase-c)' }}>● Phase C</span>
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
          <Activity size={32} style={{ opacity: 0.3 }} />
          <span>Awaiting dynamic simulation data from backend...</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Click &ldquo;Run Simulation&rdquo; to observe 3-phase instantaneous currents.
          </span>
        </div>
      ) : (
        <div style={{ width: '100%', height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v) => `${v}s`}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                domain={['auto', 'auto']}
                tickFormatter={(v) =>
                  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)} kA` : `${v.toFixed(0)} A`
                }
              />
              <Tooltip content={CurrentTooltip} />
              <Legend
                wrapperStyle={{ fontSize: '0.78rem', paddingTop: '6px' }}
                iconType="plainline"
              />

              {/* Shaded Fault Inception Window */}
              {isFault && (
                <ReferenceArea
                  x1={fStart}
                  x2={fEnd}
                  strokeOpacity={0.3}
                  fill="#ef4444"
                  fillOpacity={0.08}
                />
              )}

              {/* Inception Marker Line */}
              {isFault && (
                <ReferenceLine
                  x={fStart}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Fault Inception',
                    position: 'top',
                    fill: '#ef4444',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              {/* Phase A Current */}
              <Line
                type="monotone"
                dataKey="Ia"
                name="Phase A (Ia)"
                stroke="var(--phase-a)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              {/* Phase B Current */}
              <Line
                type="monotone"
                dataKey="Ib"
                name="Phase B (Ib)"
                stroke="var(--phase-b)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              {/* Phase C Current */}
              <Line
                type="monotone"
                dataKey="Ic"
                name="Phase C (Ic)"
                stroke="var(--phase-c)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
