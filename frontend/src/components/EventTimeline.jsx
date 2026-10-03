import React, { useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Zap,
  Power,
  Cpu,
  Brain,
  CheckCircle,
  Play,
} from 'lucide-react';

/**
 * EventTimeline Component
 * Fulfills Requirement 13:
 * "EVENT TIMELINE"
 * Displays chronological SCADA event sequence with dedicated vector icons for:
 * - simulation (Play/Activity)
 * - fault (AlertTriangle/Zap)
 * - AI detection (Brain/Cpu)
 * - protection (Shield)
 * - breaker (Power)
 * - isolation (ShieldAlert/CheckCircle)
 * Uses actual backend protection and switching events.
 */
export default function EventTimeline({ simulationData }) {
  // Combine, standardize, and sort events chronologically
  const events = useMemo(() => {
    const combined = [];

    // 1. Simulation baseline initiation
    combined.push({
      id: 'sim-init',
      timestamp_s: 0.0,
      timestamp_ms: 0.0,
      category: 'simulation',
      eventType: 'Simulation Started',
      description: 'Physical AC time-domain ODE solver initialized; steady-state 50 Hz power flow established',
      status: 'NORMAL',
    });

    // 2. Add protection events from backend
    if (simulationData?.protection_events && Array.isArray(simulationData.protection_events)) {
      simulationData.protection_events.forEach((e, idx) => {
        const timeSec = e.time ?? e.timestamp_s ?? e.timestamp ?? 0.0;
        const name = (e.event || e.device || e.event_type || 'PROTECTION').toUpperCase();
        let cat = 'protection';
        if (name.includes('FAULT') || name.includes('INCEPTION')) cat = 'fault';
        else if (name.includes('BREAKER') || name.includes('CB')) cat = 'breaker';
        else if (name.includes('ISOLAT')) cat = 'isolation';

        combined.push({
          id: `prot-${idx}`,
          timestamp_s: timeSec,
          timestamp_ms: timeSec * 1000,
          category: cat,
          eventType: e.event || e.event_type || 'Protection Action',
          description: e.description,
          status: e.status || (cat === 'fault' ? 'FAULT' : 'LOGGED'),
        });
      });
    }

    // 3. Add AI / ML detection event if fault detected
    if (simulationData?.fault_detected && simulationData?.ml_prediction) {
      const fStart = simulationData?.fault_start_time ?? 0.04;
      combined.push({
        id: 'ai-detection',
        timestamp_s: fStart + 0.002, // 2ms sub-cycle AI inference latency
        timestamp_ms: (fStart + 0.002) * 1000,
        category: 'ai',
        eventType: `${simulationData.ml_prediction.fault_type} Fault Classified (AI)`,
        description: `RandomForestClassifier predicted ${simulationData.ml_prediction.fault_type} with ${(
          (simulationData.ml_prediction.confidence ?? 0.96) * 100
        ).toFixed(1)}% confidence`,
        status: 'AI_CLASSIFIED',
      });
    }

    // 4. Add switching/FLISR events from backend
    if (simulationData?.switching_events && Array.isArray(simulationData.switching_events)) {
      simulationData.switching_events.forEach((s, idx) => {
        const timeSec = s.timestamp_s ?? s.time ?? 0.0;
        const action = (s.action || s.event || '').toUpperCase();
        let cat = 'isolation';
        if (action.includes('BREAKER') || action.includes('CB')) cat = 'breaker';
        else if (action.includes('TIE') || action.includes('RESTORE')) cat = 'restoration';

        combined.push({
          id: `switch-${idx}`,
          timestamp_s: timeSec,
          timestamp_ms: timeSec * 1000,
          category: cat,
          eventType: `Switch ${s.switch_id || 'CB1'}: ${s.action || s.event}`,
          description: s.description,
          status: s.grid_status || 'RECONFIGURED',
        });
      });
    }

    // Sort chronologically
    return combined.sort((a, b) => a.timestamp_s - b.timestamp_s);
  }, [simulationData]);

  // Icon selector based on category (Requirement 13)
  const getEventIcon = (category) => {
    switch (category) {
      case 'simulation':
        return <Play size={14} style={{ color: 'var(--accent-blue)' }} />;
      case 'fault':
        return <AlertTriangle size={14} style={{ color: '#ef4444' }} />;
      case 'ai':
        return <Brain size={14} style={{ color: 'var(--accent-purple)' }} />;
      case 'protection':
        return <Shield size={14} style={{ color: '#f59e0b' }} />;
      case 'breaker':
        return <Power size={14} style={{ color: '#ef4444' }} />;
      case 'isolation':
        return <ShieldAlert size={14} style={{ color: '#38bdf8' }} />;
      case 'restoration':
        return <ShieldCheck size={14} style={{ color: '#10b981' }} />;
      default:
        return <Clock size={14} style={{ color: 'var(--text-dim)' }} />;
    }
  };

  const getEventBadgeClass = (status = '') => {
    const s = status.toUpperCase();
    if (s.includes('NORMAL') || s.includes('HEALTHY') || s.includes('RESTORE')) return 'badge-normal';
    if (s.includes('FAULT') || s.includes('TRIP') || s.includes('OPEN')) return 'badge-fault';
    if (s.includes('AI') || s.includes('CLASSIFIED')) return 'badge-purple';
    if (s.includes('RECONFIG') || s.includes('DELAY')) return 'badge-warning';
    return 'badge-info';
  };

  return (
    <div className="scada-card">
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Clock size={18} />
          <span>EVENT TIMELINE</span>
        </div>
        <span className="scada-badge badge-info">
          {events.length} SCADA Milestones
        </span>
      </div>

      <div className="timeline-list">
        {events.map((ev) => (
          <div key={ev.id} className="timeline-item">
            {/* Timestamp */}
            <div className="timeline-time">
              <span>{ev.timestamp_ms.toFixed(1)} ms</span>
            </div>

            {/* Category Icon */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getEventIcon(ev.category)}
            </div>

            {/* Event Name & Description */}
            <div className="timeline-details">
              <div className="timeline-event-name">
                <span>{ev.eventType}</span>
                <span className={`scada-badge ${getEventBadgeClass(ev.status)}`} style={{ fontSize: '0.62rem' }}>
                  {ev.status}
                </span>
              </div>
              <div className="timeline-desc">{ev.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
