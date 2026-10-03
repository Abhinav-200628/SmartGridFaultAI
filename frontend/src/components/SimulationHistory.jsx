import React from 'react';
import { History, Clock, ArrowRight, RotateCcw, CheckCircle, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

/**
 * SimulationHistory Component
 * Displays a professional SCADA audit log of recent simulation runs in the current session.
 * Columns: TIME, FAULT TYPE, PHASE, DISTANCE, ESTIMATED DISTANCE, BREAKER, GRID STATUS
 */
export default function SimulationHistory({ history = [], onSelectRun, onClearHistory }) {
  if (!history || history.length === 0) {
    return (
      <div className="scada-card">
        <div className="scada-card-header">
          <div className="scada-card-title">
            <History size={18} style={{ color: 'var(--accent-blue)' }} />
            <span>Simulation History & SCADA Audit Log</span>
          </div>
          <span className="scada-badge badge-info">0 Recorded Runs</span>
        </div>
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          No simulation runs recorded yet. Execute a simulation to build session telemetry history.
        </div>
      </div>
    );
  }

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <History size={18} style={{ color: 'var(--accent-blue)' }} />
          <span>Simulation History &amp; SCADA Audit Log</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="scada-badge badge-info">{history.length} Runs Recorded</span>
          {onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              className="btn-secondary"
              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
              title="Clear session history"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="scada-table" style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-dim)' }}>
              <th style={{ padding: '10px 12px' }}>Time</th>
              <th style={{ padding: '10px 12px' }}>Fault Type</th>
              <th style={{ padding: '10px 12px' }}>Phase</th>
              <th style={{ padding: '10px 12px' }}>Actual Dist</th>
              <th style={{ padding: '10px 12px' }}>Est. Dist</th>
              <th style={{ padding: '10px 12px' }}>Breaker</th>
              <th style={{ padding: '10px 12px' }}>Grid Status</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {history.map((run, idx) => {
              const isNormal = run.faultType === 'NORMAL' || !run.faultDetected;
              const isBreakerClosed = run.breakerState === 'CLOSED' || run.breakerState === 'RECLOSED';

              return (
                <tr
                  key={run.id || idx}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    transition: 'background 0.2s',
                  }}
                  className="table-row-hover"
                >
                  {/* Time */}
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={12} style={{ color: 'var(--accent-cyan)' }} />
                      <span>{run.timestamp}</span>
                    </div>
                  </td>

                  {/* Fault Type */}
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                    <span
                      style={{
                        color: isNormal ? '#10b981' : run.faultType.includes('OPEN') ? '#f59e0b' : '#f87171',
                      }}
                    >
                      {run.faultType}
                    </span>
                  </td>

                  {/* Phase */}
                  <td style={{ padding: '10px 12px', color: 'var(--text-main)', fontWeight: 600 }}>
                    {run.phase || 'N/A'}
                  </td>

                  {/* Actual Distance */}
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {isNormal ? '—' : `${Number(run.distance).toFixed(1)} km`}
                  </td>

                  {/* Estimated Distance */}
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                    {isNormal ? (
                      '—'
                    ) : (
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {run.estimatedDistance != null ? `${Number(run.estimatedDistance).toFixed(1)} km` : '—'}
                      </span>
                    )}
                  </td>

                  {/* Breaker State */}
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      className={`scada-badge ${isBreakerClosed ? 'badge-normal' : 'badge-fault'}`}
                      style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      {isBreakerClosed ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
                      {run.breakerState || 'CLOSED'}
                    </span>
                  </td>

                  {/* Grid Status */}
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      className={`scada-badge ${
                        run.gridStatus === 'HEALTHY'
                          ? 'badge-normal'
                          : run.gridStatus === 'SYSTEM_RESTORED'
                          ? 'badge-normal'
                          : run.gridStatus === 'FAULT_ISOLATED'
                          ? 'badge-info'
                          : 'badge-fault'
                      }`}
                      style={{ fontSize: '0.68rem' }}
                    >
                      {run.gridStatus || 'HEALTHY'}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {onSelectRun && (
                      <button
                        type="button"
                        onClick={() => onSelectRun(run.params)}
                        className="btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        title="Reload this simulation configuration"
                      >
                        <RotateCcw size={11} /> Load
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
