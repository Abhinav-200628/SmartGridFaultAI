import React from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Compass,
  MapPin,
  Zap,
  Radio,
  Clock,
  CheckCircle,
} from 'lucide-react';

/**
 * StatusCards Component
 * Renders professional SCADA monitoring cards reflecting live backend simulation metrics:
 * 1. GRID STATUS
 * 2. FAULT STATUS
 * 3. BREAKER STATE
 * 4. FAULT TYPE
 * 5. FAULT DISTANCE
 * 6. PROTECTION STATUS
 * 7. RMS VOLTAGE
 * 8. RMS CURRENT
 */
export default function StatusCards({ simulationData }) {
  const isFault = Boolean(simulationData?.fault_detected && simulationData?.fault_type !== 'NORMAL');

  const isHealthy =
    simulationData?.grid_status === 'HEALTHY' ||
    (!isFault && simulationData?.grid_status !== 'OPEN_CIRCUIT');

  const isIsolated =
    simulationData?.grid_status === 'FAULT_ISOLATED' ||
    simulationData?.grid_status === 'ISOLATED' ||
    simulationData?.grid_status === 'POWER_RESTORED' ||
    simulationData?.grid_status === 'SERVICE_RESTORED' ||
    simulationData?.grid_status === 'RESTORED';

  const isRestored = simulationData?.grid_status === 'SYSTEM_RESTORED' || simulationData?.switching_state === 'SYSTEM_RESTORED';

  const isBreakerClosed =
    simulationData?.breaker_state === 'CLOSED' ||
    simulationData?.breaker_state === 'RECLOSED' ||
    (!simulationData?.breaker_state && !isFault);

  // Format Voltage to kV or V
  const vRms =
    simulationData?.metrics?.v_rms_normal_v ??
    simulationData?.simulation_parameters?.voltage_rms ??
    11000.0;
  const vDisplay = vRms >= 1000 ? `${(vRms / 1000).toFixed(2)}` : `${vRms.toFixed(1)}`;
  const vUnit = vRms >= 1000 ? 'kV' : 'V';

  // Format Steady-State RMS Current
  const iRms =
    simulationData?.metrics?.i_rms_normal_a ??
    (simulationData?.simulation_parameters?.load_kw
      ? (
          (simulationData.simulation_parameters.load_kw * 1000) /
          (Math.sqrt(3) * vRms * (simulationData.simulation_parameters.power_factor || 0.85))
        ).toFixed(1)
      : '26.8');
  const iDisplay = typeof iRms === 'number' ? iRms.toFixed(1) : iRms;

  // Actual Fault Distance
  const actualDist =
    simulationData?.fault_distance_km ??
    simulationData?.simulation_parameters?.fault_distance_km ??
    25.0;

  // Estimated Fault Distance
  const estDist = simulationData?.estimated_fault_distance_km;

  // Fault Type
  const faultType = isFault ? (simulationData?.fault_type || 'FAULT') : 'NORMAL';

  // Protection trip time
  const tripTimeMs = simulationData?.protection_trip_time
    ? (simulationData.protection_trip_time * 1000).toFixed(1)
    : simulationData?.simulation_parameters?.protection_delay_ms
    ? simulationData.simulation_parameters.protection_delay_ms.toFixed(1)
    : '40.0';

  return (
    <div className="grid-cols-auto" style={{ marginBottom: '22px' }}>
      {/* 1. GRID STATUS */}
      <div
        className="status-card"
        style={{
          borderLeft: isHealthy
            ? '4px solid #10b981'
            : isRestored
            ? '4px solid #10b981'
            : isIsolated
            ? '4px solid #38bdf8'
            : '4px solid #ef4444',
        }}
      >
        <div
          className={`status-card-icon ${
            isHealthy || isRestored ? 'icon-green' : isIsolated ? 'icon-blue' : 'icon-red'
          }`}
        >
          <Activity size={20} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Grid Status</div>
          <div className="status-card-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isHealthy || isRestored ? '#10b981' : isIsolated ? '#38bdf8' : '#ef4444',
                boxShadow: isHealthy || isRestored ? '0 0 8px #10b981' : isIsolated ? '0 0 8px #38bdf8' : '0 0 8px #ef4444',
              }}
            />
            <span
              style={{
                color: isHealthy || isRestored ? '#34d399' : isIsolated ? '#38bdf8' : '#f87171',
                fontSize: '1.05rem',
                fontWeight: 800,
              }}
            >
              {isRestored
                ? 'SYSTEM RESTORED'
                : isIsolated
                ? 'FAULT ISOLATED'
                : isHealthy
                ? 'HEALTHY'
                : 'DISTURBANCE'}
            </span>
          </div>
          <div className="status-card-sub">
            {isRestored
              ? 'FLISR Reconfigured • Unfaulted Load Fed'
              : isIsolated
              ? 'Sectionalizer Lockout Active'
              : isHealthy
              ? 'Nominal Balanced AC Power Flow'
              : 'Active Grid Perturbation'}
          </div>
        </div>
      </div>

      {/* 2. FAULT STATUS */}
      <div
        className="status-card"
        style={{
          borderLeft: isFault ? '4px solid #ef4444' : '4px solid #10b981',
        }}
      >
        <div className={`status-card-icon ${isFault ? 'icon-red' : 'icon-green'}`}>
          <Radio size={20} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Fault Status</div>
          <div className="status-card-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isFault ? '#ef4444' : '#10b981',
                boxShadow: isFault ? '0 0 8px #ef4444' : '0 0 8px #10b981',
              }}
            />
            <span
              style={{
                color: isFault ? '#f87171' : '#34d399',
                fontSize: '1.05rem',
                fontWeight: 800,
              }}
            >
              {isFault ? 'FAULT DETECTED' : 'NO FAULT DETECTED'}
            </span>
          </div>
          <div className="status-card-sub">
            {isFault
              ? `Abnormal disturbance on ${simulationData?.affected_phases?.join(', ') || 'feeder'}`
              : 'Zero Sequence & Negative Sequence Below Pickup'}
          </div>
        </div>
      </div>

      {/* 3. BREAKER STATE */}
      <div
        className="status-card"
        style={{
          borderLeft: isBreakerClosed ? '4px solid #10b981' : '4px solid #ef4444',
        }}
      >
        <div className={`status-card-icon ${isBreakerClosed ? 'icon-green' : 'icon-red'}`}>
          {isBreakerClosed ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Breaker State</div>
          <div className="status-card-value mono-val" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isBreakerClosed ? '#10b981' : '#ef4444',
                boxShadow: isBreakerClosed ? '0 0 8px #10b981' : '0 0 8px #ef4444',
              }}
            />
            <span
              style={{
                color: isBreakerClosed ? '#34d399' : '#f87171',
                fontSize: '1.05rem',
                fontWeight: 800,
              }}
            >
              {simulationData?.breaker_state || (isBreakerClosed ? 'CLOSED' : 'OPEN')}
            </span>
          </div>
          <div className="status-card-sub">
            {isBreakerClosed ? 'Contacts Closed • Line Energized' : 'Main Breaker CB1 Tripped (Open)'}
          </div>
        </div>
      </div>

      {/* 4. FAULT TYPE */}
      <div
        className="status-card"
        style={{
          borderLeft: isFault ? '4px solid #f59e0b' : '4px solid #38bdf8',
        }}
      >
        <div className={`status-card-icon ${isFault ? 'icon-amber' : 'icon-blue'}`}>
          <AlertTriangle size={20} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Fault Type</div>
          <div className="status-card-value mono-val" style={{ fontSize: '1.1rem', color: isFault ? '#fbbf24' : 'var(--text-main)' }}>
            {faultType}
          </div>
          <div className="status-card-sub">
            {isFault
              ? simulationData?.affected_phases?.length
                ? `Phase: ${simulationData.affected_phases.join(', ')}`
                : 'Disturbed Conductor'
              : 'Balanced 3-Phase Symmetric'}
          </div>
        </div>
      </div>

      {/* 5. FAULT DISTANCE */}
      <div className="status-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
        <div className="status-card-icon icon-blue">
          <MapPin size={20} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Fault Distance</div>
          <div className="status-card-value mono-val">
            {isFault ? (
              <>
                <span>{actualDist.toFixed(1)}</span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 500 }}>km</span>
              </>
            ) : (
              <span style={{ fontSize: '0.95rem', color: 'var(--text-dim)' }}>N/A (Healthy)</span>
            )}
          </div>
          <div className="status-card-sub">
            {isFault
              ? `Est: ${(estDist ?? actualDist).toFixed(1)} km (Line: ${(simulationData?.simulation_parameters?.line_length_km || 50).toFixed(0)} km)`
              : `Total Line Span: ${(simulationData?.simulation_parameters?.line_length_km || 50).toFixed(0)} km`}
          </div>
        </div>
      </div>

      {/* 6. PROTECTION STATUS */}
      <div
        className="status-card"
        style={{
          borderLeft: isFault ? '4px solid #f59e0b' : '4px solid #10b981',
        }}
      >
        <div className={`status-card-icon ${isFault ? 'icon-amber' : 'icon-green'}`}>
          <Clock size={20} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Protection Status</div>
          <div className="status-card-value mono-val" style={{ fontSize: '1.05rem', color: isFault ? '#fbbf24' : '#34d399' }}>
            {isFault ? (isRestored ? 'RESTORED' : isIsolated ? 'ISOLATED' : 'TRIPPED') : 'HOLDING (NORMAL)'}
          </div>
          <div className="status-card-sub">
            {isFault
              ? `Clearance Time: ${tripTimeMs} ms`
              : 'Relay Monitoring Nominal Frequency'}
          </div>
        </div>
      </div>

      {/* 7. RMS VOLTAGE */}
      <div className="status-card" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
        <div className="status-card-icon icon-blue">
          <Zap size={20} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">System Voltage (RMS)</div>
          <div className="status-card-value mono-val">
            <span>{vDisplay}</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{vUnit}</span>
          </div>
          <div className="status-card-sub">Nominal Line-to-Line Potential</div>
        </div>
      </div>

      {/* 8. RMS CURRENT */}
      <div
        className="status-card"
        style={{
          borderLeft: isFault ? '4px solid #ef4444' : '4px solid var(--accent-blue)',
        }}
      >
        <div className={`status-card-icon ${isFault ? 'icon-amber' : 'icon-blue'}`}>
          <Activity size={20} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Operating Current (RMS)</div>
          <div className="status-card-value mono-val">
            <span style={{ color: isFault ? '#f87171' : '#f8fafc' }}>{iDisplay}</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>A</span>
          </div>
          <div className="status-card-sub">
            {isFault && simulationData?.fault_summary?.max_fault_current_a
              ? `Peak Inrush: ${Number(simulationData.fault_summary.max_fault_current_a).toFixed(1)} A`
              : 'Steady-State Feeder Load'}
          </div>
        </div>
      </div>
    </div>
  );
}
