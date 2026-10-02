import React, { useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

/**
 * EventTimeline Component
 * Chronological SCADA protection and switching event audit log.
 * Consumes real event arrays from backend (protection_events and switching_events).
 *
 * Example backend sequence:
 * - t = 0.000 s: Normal steady-state baseline
 * - t = t_start: Fault inception detected
 * - t = t_trip: Protection relay trip signal
 * - t = t_end: Breaker contacts opened / Fault section isolated
 * - t = t_flisr: Healthy feeders restored
 */
export default function EventTimeline({ simulationData }) {
  // Combine and sort events chronologically from backend data
  const events = useMemo(() => {
    const combined = [];

    // Add protection events from backend
    if (simulationData?.protection_events && Array.isArray(simulationData.protection_events)) {
      simulationData.protection_events.forEach((e, idx) => {
        combined.push({
          id: `prot-${idx}`,
          timestamp_s: e.timestamp_s,
          timestamp_ms: e.timestamp_ms ?? e.timestamp_s * 1000,
          eventType: e.event_type || 'PROTECTION',
          description: e.description,
          status: e.status || 'LOGGED',
          isSwitching: false,
        });
      });
    }

    // Add switching/FLISR events from backend
    if (simulationData?.switching_events && Array.isArray(simulationData.switching_events)) {
      simulationData.switching_events.forEach((s, idx) => {
        combined.push({
          id: `switch-${idx}`,
          timestamp_s: s.timestamp_s,
          timestamp_ms: s.timestamp_ms ?? s.timestamp_s * 1000,
          eventType: `SWITCH: ${s.switch_id || 'CB'} (${s.action})`,
          description: s.description,
          status: s.grid_status || 'RECONFIGURED',
          isSwitching: true,
        });
      });
    }

    // Sort chronologically by timestamp
    return combined.sort((a, b) => a.timestamp_s - b.timestamp_s);
  }, [simulationData]);

  const getEventBadgeClass = (status = '') => {
    const s = status.toUpperCase();
    if (s.includes('CLOSED') || s.includes('HEALTHY') || s.includes('RESTORED') || s.includes('NORMAL')) {
      return 'badge-normal';
    }
    if (s.includes('OPEN') || s.includes('ISOLATED') || s.includes('TRIP')) {
      return 'badge-fault';
    }
    if (s.includes('RECONFIG') || s.includes('ARMED') || s.includes('PICKUP')) {
      return 'badge-warning';
    }
    return 'badge-info';
  };

  const getEventIcon = (eventType = '', status = '') => {
    const combined = (eventType + ' ' + status).toUpperCase();
    if (combined.includes('TRIP') || combined.includes('FAULT')) {
      return <AlertTriangle size={15} style={{ color: '#ef4444' }} />;
    }
    if (combined.includes('OPEN') || combined.includes('ISOLAT')) {
      return <ShieldAlert size={15} style={{ color: '#f59e0b' }} />;
    }
    if (combined.includes('RESTORE') || combined.includes('HEALTHY') || combined.includes('CLOSED')) {
      return <ShieldCheck size={15} style={{ color: '#10b981' }} />;
    }
    return <Clock size={15} style={{ color: 'var(--accent-blue)' }} />;
  };

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Clock size={18} />
          <span>Protection & Switching Event Timeline</span>
        </div>
        <span className="scada-badge badge-info">
          {events.length} {events.length === 1 ? 'Milestone' : 'Milestones'}
        </span>
      </div>

      {events.length === 0 ? (
        <div
          style={{
            padding: '30px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
          }}
        >
          <Clock size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <div>No protection events recorded.</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Configure and run a simulation to generate time-domain protection milestones.
          </div>
        </div>
      ) : (
        <div className="timeline-list">
          {events.map((evt) => (
            <div key={evt.id} className="timeline-item">
              {/* Timestamp */}
              <div className="timeline-time">
                <span style={{ color: 'var(--accent-cyan)' }}>t = {evt.timestamp_s.toFixed(3)}s</span>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
                  {evt.timestamp_ms.toFixed(1)} ms
                </div>
              </div>

              {/* Event Content */}
              <div className="timeline-details">
                <div className="timeline-event-name">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getEventIcon(evt.eventType, evt.status)}
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                      {evt.eventType}
                    </span>
                  </div>
                  <span className={`scada-badge ${getEventBadgeClass(evt.status)}`}>
                    {evt.status}
                  </span>
                </div>
                <div className="timeline-desc">{evt.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
