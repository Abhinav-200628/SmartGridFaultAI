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
} from 'lucide-react';

/**
 * StatusCards Component
 * Renders 8 industrial SCADA monitoring cards reflecting live backend simulation metrics:
 * 1. Grid Status
 * 2. Fault Status
 * 3. Fault Type
 * 4. Breaker State
 * 5. Fault Distance (Actual physical inception distance)
 * 6. Estimated Fault Distance (Algorithm calculated distance)
 * 7. RMS Voltage
 * 8. RMS Current
 */
export default function StatusCards({ simulationData }) {
  const isHealthy =
    simulationData?.grid_status === 'HEALTHY' ||
    (!simulationData?.fault_detected && simulationData?.grid_status !== 'OPEN_CIRCUIT');

  const isIsolated =
    simulationData?.grid_status === 'FAULT_ISOLATED' ||
    simulationData?.grid_status === 'ISOLATED' ||
    simulationData?.grid_status === 'POWER_RESTORED' ||
    simulationData?.grid_status === 'SERVICE_RESTORED' ||
    simulationData?.grid_status === 'RESTORED';

  const isBreakerClosed =
    simulationData?.breaker_state === 'CLOSED' ||
    simulationData?.breaker_state === 'RECLOSED' ||
    (!simulationData?.breaker_state && isHealthy);

  // Format Voltage to kV or V
  const vRms =
    simulationData?.metrics?.v_rms_normal_v ??
    simulationData?.simulation_parameters?.voltage_rms ??
    11000.0;
  const vDisplay = vRms >= 1000 ? `${(vRms / 1000).toFixed(2)} kV` : `${vRms.toFixed(1)} V`;

  // Format Steady-State RMS Current
  const iRms =
    simulationData?.metrics?.i_rms_normal_a ??
    (simulationData?.simulation_parameters?.load_kw
      ? (
          (simulationData.simulation_parameters.load_kw * 1000) /
          (Math.sqrt(3) * vRms * (simulationData.simulation_parameters.power_factor || 0.85))
        ).toFixed(1)
      : '--');
  const iDisplay = typeof iRms === 'number' ? `${iRms.toFixed(1)} A` : `${iRms} A`;

  // Actual Fault Distance
  const actualDist =
    simulationData?.fault_distance_km ??
    simulationData?.simulation_parameters?.fault_distance_km ??
    25.0;
  const actualDistDisplay = simulationData?.fault_detected
    ? `${actualDist.toFixed(2)} km`
    : 'N/A (Healthy)';

  // Estimated Fault Distance (Apparent Reactance Method)
  const estDist = simulationData?.estimated_fault_distance_km;
  const estDistDisplay = simulationData?.fault_detected
    ? `${(estDist != null ? estDist : actualDist).toFixed(2)} km`
    : 'N/A (No Fault)';

  // Fault Type and Category
  const faultType =
    simulationData?.fault_type ??
    (simulationData?.fault_detected ? 'SHORT_CIRCUIT' : 'NORMAL');

  // Peak Fault Current
  const maxFaultCurrent =
    simulationData?.fault_summary?.max_fault_current_a ??
    simulationData?.metrics?.i_peak_fault_a;

  // Grid Status Badge Styling
  const getGridBadgeClass = () => {
    if (isHealthy) return 'badge-normal';
    if (isIsolated) return 'badge-info';
    if (
      simulationData?.grid_status === 'RECONFIGURING' ||
      simulationData?.grid_status === 'ISOLATING'
    )
      return 'badge-warning';
    return 'badge-fault';
  };

  const getGridStatusDescription = () => {
    if (isHealthy) return 'Nominal Balanced Power Flow';
    if (isIsolated) return 'Fault Isolated • Healthy Loads Fed';
    if (simulationData?.grid_status === 'OPEN_CIRCUIT') return 'Conductor Break • Current Interrupted';
    if (simulationData?.grid_status === 'RECONFIGURING') return 'FLISR Tie-Switch Reconfiguration';
    return 'System Disturbance Active';
  };

  return (
    <div className="grid-cols-auto" style={{ marginBottom: '24px' }}>
      {/* 1. Grid Status */}
      <div className="status-card">
        <div
          className={`status-card-icon ${
            isHealthy ? 'icon-green' : isIsolated ? 'icon-blue' : 'icon-red'
          }`}
        >
          <Activity size={22} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Grid Status</div>
          <div className="status-card-value">
            <span className={`scada-badge ${getGridBadgeClass()}`}>
              {simulationData?.grid_status || 'READY'}
            </span>
          </div>
          <div className="status-card-sub">{getGridStatusDescription()}</div>
        </div>
      </div>

      {/* 2. Fault Status */}
      <div className="status-card">
        <div
          className={`status-card-icon ${
            simulationData?.fault_detected ? 'icon-red' : 'icon-green'
          }`}
        >
          <Radio size={22} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Fault Status</div>
          <div className="status-card-value">
            <span
              className={`scada-badge ${
                simulationData?.fault_detected ? 'badge-fault' : 'badge-normal'
              }`}
            >
              {simulationData?.fault_detected ? 'FAULT DETECTED' : 'HEALTHY'}
            </span>
          </div>
          <div className="status-card-sub">
            {simulationData?.fault_detected
              ? 'Protection Relay Triggered'
              : 'Nominal Operating Margin'}
          </div>
        </div>
      </div>

      {/* 3. Fault Type */}
      <div className="status-card">
        <div className={`status-card-icon ${isHealthy ? 'icon-blue' : 'icon-amber'}`}>
          <AlertTriangle size={22} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Fault Type</div>
          <div className="status-card-value" style={{ fontSize: '1.05rem' }}>
            {faultType}
          </div>
          <div className="status-card-sub">
            {simulationData?.affected_phases && simulationData.affected_phases.length > 0
              ? `Affected: Phase ${simulationData.affected_phases.join(', ')}`
              : 'All 3 Phases Balanced'}
          </div>
        </div>
      </div>

      {/* 4. Breaker State */}
      <div className="status-card">
        <div className={`status-card-icon ${isBreakerClosed ? 'icon-green' : 'icon-red'}`}>
          {isBreakerClosed ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Breaker State</div>
          <div className="status-card-value mono-val">
            <span className={`scada-badge ${isBreakerClosed ? 'badge-normal' : 'badge-fault'}`}>
              {simulationData?.breaker_state || 'CLOSED'}
            </span>
          </div>
          <div className="status-card-sub">
            {isBreakerClosed ? 'CB1 & CB2 Closed (Energized)' : 'CB1 Tripped • Line Isolated'}
          </div>
        </div>
      </div>

      {/* 5. Fault Distance */}
      <div className="status-card">
        <div className="status-card-icon icon-blue">
          <MapPin size={22} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Fault Distance</div>
          <div className="status-card-value mono-val">{actualDistDisplay}</div>
          <div className="status-card-sub">
            Line Span: {(simulationData?.simulation_parameters?.line_length_km || 50.0).toFixed(0)} km
          </div>
        </div>
      </div>

      {/* 6. Estimated Fault Distance */}
      <div className="status-card">
        <div className="status-card-icon icon-blue">
          <Compass size={22} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">Estimated Fault Distance</div>
          <div className="status-card-value mono-val">{estDistDisplay}</div>
          <div className="status-card-sub">
            {simulationData?.fault_detected && simulationData?.distance_error_km != null
              ? `Error: ${simulationData.distance_error_km.toFixed(2)} km (${(
                  simulationData.distance_error_percent || 0
                ).toFixed(1)}%)`
              : 'Impedance Reactance Method'}
          </div>
        </div>
      </div>

      {/* 7. RMS Voltage */}
      <div className="status-card">
        <div className="status-card-icon icon-blue">
          <Zap size={22} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">RMS Voltage</div>
          <div className="status-card-value mono-val">{vDisplay}</div>
          <div className="status-card-sub">Nominal Line-to-Line Potential</div>
        </div>
      </div>

      {/* 8. RMS Current */}
      <div className="status-card">
        <div
          className={`status-card-icon ${
            simulationData?.fault_detected ? 'icon-amber' : 'icon-blue'
          }`}
        >
          <Activity size={22} />
        </div>
        <div className="status-card-content">
          <div className="status-card-label">RMS Current</div>
          <div className="status-card-value mono-val">{iDisplay}</div>
          <div className="status-card-sub">
            {simulationData?.fault_detected && maxFaultCurrent != null
              ? `Peak Inrush: ${Number(maxFaultCurrent).toFixed(1)} A`
              : 'Balanced 3-Phase Conduction'}
          </div>
        </div>
      </div>
    </div>
  );
}
