import React, { useState } from 'react';
import {
  Sliders,
  Zap,
  AlertTriangle,
  Shield,
  Play,
  RotateCcw,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/**
 * ParameterPanel Component
 * Interactive SCADA control console providing sliders, numeric readouts, and selections
 * for 3-phase grid parameters, transmission line characteristics, short-circuit & open-circuit
 * fault injections, and circuit breaker protection delay.
 *
 * Supported parameters:
 * - RMS voltage (voltage_rms)
 * - Frequency (frequency)
 * - Load power (load_kw)
 * - Power factor (power_factor)
 * - Line length (line_length_km)
 * - Fault type (NORMAL, LG, LL, LLG, LLL, OPEN_CIRCUIT, SHORT_CIRCUIT)
 * - Fault phase (fault_phase) & phase pair (fault_phase_pair)
 * - Fault distance (fault_distance_km)
 * - Fault resistance (fault_resistance_ohm)
 * - Fault start time (fault_start_time)
 * - Fault duration (fault_duration)
 * - Protection delay (protection_delay_ms)
 */
export default function ParameterPanel({
  params,
  onChange,
  onRunSimulation,
  isSimulating = false,
  onReset,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field, value) => {
    const updated = {
      ...params,
      [field]: value,
    };

    // Keep fault distance within line length
    if (field === 'line_length_km' && updated.fault_distance_km > value) {
      updated.fault_distance_km = value * 0.5;
    }

    onChange(updated);
  };

  const handleFaultTypeChange = (e) => {
    const newType = e.target.value;
    const updates = { fault_type: newType };

    if (newType === 'NORMAL') {
      updates.fault_category = 'NORMAL';
    } else if (
      newType === 'PHASE_A_OPEN' ||
      newType === 'PHASE_B_OPEN' ||
      newType === 'PHASE_C_OPEN' ||
      newType === 'THREE_PHASE_OPEN' ||
      newType === 'OPEN_CIRCUIT'
    ) {
      updates.fault_category = 'OPEN_CIRCUIT';
      if (newType === 'PHASE_A_OPEN') updates.fault_phase = 'A';
      else if (newType === 'PHASE_B_OPEN') updates.fault_phase = 'B';
      else if (newType === 'PHASE_C_OPEN') updates.fault_phase = 'C';
      else if (newType === 'THREE_PHASE_OPEN') updates.fault_phase = 'ABC';
      else if (!params.fault_phase) updates.fault_phase = 'A';
    } else {
      updates.fault_category = 'SHORT_CIRCUIT';
      if (newType === 'LG' && !params.fault_phase) updates.fault_phase = 'A';
      if ((newType === 'LL' || newType === 'LLG') && !params.fault_phase_pair) {
        updates.fault_phase_pair = 'A-B';
      }
    }

    onChange({ ...params, ...updates });
  };

  // Determine available phase options contextually
  const getPhaseOptions = () => {
    switch (params.fault_type) {
      case 'LG':
        return [
          { label: 'Phase A to Ground (A-G)', value: 'A', field: 'fault_phase' },
          { label: 'Phase B to Ground (B-G)', value: 'B', field: 'fault_phase' },
          { label: 'Phase C to Ground (C-G)', value: 'C', field: 'fault_phase' },
        ];
      case 'LL':
        return [
          { label: 'Phases A & B (A-B)', value: 'A-B', field: 'fault_phase_pair' },
          { label: 'Phases B & C (B-C)', value: 'B-C', field: 'fault_phase_pair' },
          { label: 'Phases C & A (C-A)', value: 'C-A', field: 'fault_phase_pair' },
        ];
      case 'LLG':
        return [
          { label: 'Phases A & B to Ground (A-B-G)', value: 'A-B', field: 'fault_phase_pair' },
          { label: 'Phases B & C to Ground (B-C-G)', value: 'B-C', field: 'fault_phase_pair' },
          { label: 'Phases C & A to Ground (C-A-G)', value: 'C-A', field: 'fault_phase_pair' },
        ];
      case 'OPEN_CIRCUIT':
        return [
          { label: 'Phase A Open Conductor', value: 'A', field: 'fault_phase' },
          { label: 'Phase B Open Conductor', value: 'B', field: 'fault_phase' },
          { label: 'Phase C Open Conductor', value: 'C', field: 'fault_phase' },
          { label: 'Three-Phase Complete Open', value: 'ABC', field: 'fault_phase' },
        ];
      case 'SHORT_CIRCUIT':
        return [
          { label: 'Single Line-to-Ground (A-G)', value: 'A', field: 'fault_phase' },
          { label: 'Line-to-Line (A-B)', value: 'A-B', field: 'fault_phase_pair' },
          { label: 'Double Line-to-Ground (A-B-G)', value: 'A-B', field: 'fault_phase_pair' },
          { label: 'Three-Phase Bolted (A-B-C)', value: 'A-B-C', field: 'fault_phase_pair' },
        ];
      default:
        return [];
    }
  };

  const phaseOptions = getPhaseOptions();
  const isFaultSelected = params.fault_type !== 'NORMAL';
  const isOpenCircuit =
    params.fault_type?.includes('OPEN') || params.fault_category === 'OPEN_CIRCUIT';

  return (
    <div className="scada-card" style={{ height: 'fit-content' }}>
      <div className="scada-card-header">
        <div className="scada-card-title">
          <Sliders size={18} />
          <span>Simulation Parameters</span>
        </div>
        {onReset && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onReset}
            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
            title="Reset to default IEEE 11kV balanced parameters"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* SECTION 1: THREE-PHASE GRID BASE */}
      <div className="param-section">
        <div className="param-section-title">
          <Zap size={14} />
          <span>Three-Phase Grid Source</span>
        </div>

        {/* RMS Line-to-Line Voltage */}
        <div className="form-group">
          <label>
            <span>RMS Voltage (Line-to-Line)</span>
            <span className="val-badge">
              {params.voltage_rms >= 1000
                ? `${(params.voltage_rms / 1000).toFixed(1)} kV`
                : `${params.voltage_rms} V`}
            </span>
          </label>
          <input
            type="range"
            className="scada-slider"
            min="400"
            max="33000"
            step="100"
            value={params.voltage_rms || 11000}
            onChange={(e) => handleChange('voltage_rms', parseFloat(e.target.value))}
          />
        </div>

        {/* Grid Frequency */}
        <div className="form-group">
          <label>
            <span>System Frequency</span>
            <span className="val-badge">{(params.frequency || 50.0).toFixed(1)} Hz</span>
          </label>
          <input
            type="range"
            className="scada-slider"
            min="45"
            max="65"
            step="0.5"
            value={params.frequency || 50.0}
            onChange={(e) => handleChange('frequency', parseFloat(e.target.value))}
          />
        </div>

        {/* Active Load Power */}
        <div className="form-group">
          <label>
            <span>Active Load Demand</span>
            <span className="val-badge">{(params.load_kw || 500).toFixed(0)} kW</span>
          </label>
          <input
            type="range"
            className="scada-slider"
            min="50"
            max="5000"
            step="50"
            value={params.load_kw || 500}
            onChange={(e) => handleChange('load_kw', parseFloat(e.target.value))}
          />
        </div>

        {/* Operating Power Factor */}
        <div className="form-group">
          <label>
            <span>Power Factor (Lagging)</span>
            <span className="val-badge">{(params.power_factor || 0.85).toFixed(2)}</span>
          </label>
          <input
            type="range"
            className="scada-slider"
            min="0.50"
            max="1.00"
            step="0.01"
            value={params.power_factor || 0.85}
            onChange={(e) => handleChange('power_factor', parseFloat(e.target.value))}
          />
        </div>

        {/* Transmission Line Length */}
        <div className="form-group">
          <label>
            <span>Transmission Line Length</span>
            <span className="val-badge">{(params.line_length_km || 50).toFixed(0)} km</span>
          </label>
          <input
            type="range"
            className="scada-slider"
            min="10"
            max="200"
            step="5"
            value={params.line_length_km || 50}
            onChange={(e) => handleChange('line_length_km', parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* SECTION 2: FAULT INJECTION & SCENARIOS */}
      <div className="param-section">
        <div className="param-section-title">
          <AlertTriangle size={14} />
          <span>Fault Injection Configuration</span>
        </div>

        {/* Fault Type Selection */}
        <div className="form-group">
          <label>
            <span>Fault Category & Type</span>
          </label>
          <select
            className="scada-select"
            value={params.fault_type || 'NORMAL'}
            onChange={handleFaultTypeChange}
          >
            <option value="NORMAL">● NORMAL (Balanced Steady-State)</option>
            <option value="LG">⚡ LG (Single Line-to-Ground)</option>
            <option value="LL">⚡ LL (Line-to-Line Short Circuit)</option>
            <option value="LLG">⚡ LLG (Double Line-to-Ground)</option>
            <option value="LLL">⚡ LLL (Three-Phase Symmetrical Bolted)</option>
            <option value="OPEN_CIRCUIT">✂ OPEN_CIRCUIT (Conductor Break)</option>
            <option value="SHORT_CIRCUIT">⚡ SHORT_CIRCUIT (General Inception)</option>
            <option value="PHASE_A_OPEN">✂ Phase A Conductor Open</option>
            <option value="PHASE_B_OPEN">✂ Phase B Conductor Open</option>
            <option value="PHASE_C_OPEN">✂ Phase C Conductor Open</option>
            <option value="THREE_PHASE_OPEN">✂ Three-Phase Complete Open</option>
          </select>
        </div>

        {/* Contextual Phase Selection */}
        {phaseOptions.length > 0 && (
          <div className="form-group">
            <label>
              <span>Affected Phase Selection</span>
            </label>
            <select
              className="scada-select"
              value={params.fault_phase_pair || params.fault_phase || phaseOptions[0].value}
              onChange={(e) => {
                const opt = phaseOptions.find((o) => o.value === e.target.value) || phaseOptions[0];
                handleChange(opt.field, opt.value);
              }}
            >
              {phaseOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fault Distances & Timing (Visible when a fault is selected) */}
        {isFaultSelected && (
          <>
            {/* Fault Distance */}
            <div className="form-group">
              <label>
                <span>Fault Location (Distance)</span>
                <span className="val-badge">{(params.fault_distance_km || 25).toFixed(1)} km</span>
              </label>
              <input
                type="range"
                className="scada-slider"
                min="1.0"
                max={params.line_length_km || 50}
                step="0.5"
                value={Math.min(params.fault_distance_km || 25, params.line_length_km || 50)}
                onChange={(e) => handleChange('fault_distance_km', parseFloat(e.target.value))}
              />
            </div>

            {/* Fault Resistance (Only for short circuits) */}
            {!isOpenCircuit && (
              <div className="form-group">
                <label>
                  <span>Fault Resistance (Rf)</span>
                  <span className="val-badge">
                    {(params.fault_resistance_ohm || 1.0).toFixed(2)} Ω
                  </span>
                </label>
                <input
                  type="range"
                  className="scada-slider"
                  min="0.05"
                  max="50.0"
                  step="0.05"
                  value={params.fault_resistance_ohm || 1.0}
                  onChange={(e) => handleChange('fault_resistance_ohm', parseFloat(e.target.value))}
                />
              </div>
            )}

            {/* Fault Start Time */}
            <div className="form-group">
              <label>
                <span>Fault Inception (Start Time)</span>
                <span className="val-badge">
                  {(params.fault_start_time || 0.04).toFixed(3)} s
                </span>
              </label>
              <input
                type="range"
                className="scada-slider"
                min="0.01"
                max="0.10"
                step="0.005"
                value={params.fault_start_time || 0.04}
                onChange={(e) => handleChange('fault_start_time', parseFloat(e.target.value))}
              />
            </div>

            {/* Fault Duration */}
            <div className="form-group">
              <label>
                <span>Fault Duration</span>
                <span className="val-badge">{(params.fault_duration || 0.06).toFixed(3)} s</span>
              </label>
              <input
                type="range"
                className="scada-slider"
                min="0.01"
                max="0.10"
                step="0.005"
                value={params.fault_duration || 0.06}
                onChange={(e) => handleChange('fault_duration', parseFloat(e.target.value))}
              />
            </div>
          </>
        )}
      </div>

      {/* SECTION 3: PROTECTION RELAY TIMING */}
      <div className="param-section">
        <div className="param-section-title">
          <Shield size={14} />
          <span>Protection & Circuit Breaker</span>
        </div>

        <div className="form-group">
          <label>
            <span>Breaker Clearing Delay</span>
            <span className="val-badge">
              {(params.protection_delay_ms || 40).toFixed(0)} ms
            </span>
          </label>
          <input
            type="range"
            className="scada-slider"
            min="10"
            max="120"
            step="5"
            value={params.protection_delay_ms || 40}
            onChange={(e) => handleChange('protection_delay_ms', parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* ADVANCED LINE PARAMETERS ACCORDION */}
      <div className="param-section" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim)',
            fontSize: '0.74rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '4px 0',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Settings2 size={13} /> Line Impedance & Time Window
          </span>
          {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showAdvanced && (
          <div style={{ marginTop: '10px' }}>
            <div className="form-group">
              <label>
                <span>Line Resistance (r₁)</span>
                <span className="val-badge">
                  {(params.line_resistance_per_km || 0.125).toFixed(3)} Ω/km
                </span>
              </label>
              <input
                type="range"
                className="scada-slider"
                min="0.01"
                max="1.0"
                step="0.005"
                value={params.line_resistance_per_km || 0.125}
                onChange={(e) =>
                  handleChange('line_resistance_per_km', parseFloat(e.target.value))
                }
              />
            </div>

            <div className="form-group">
              <label>
                <span>Line Reactance (x₁)</span>
                <span className="val-badge">
                  {(params.line_reactance_per_km || 0.393).toFixed(3)} Ω/km
                </span>
              </label>
              <input
                type="range"
                className="scada-slider"
                min="0.05"
                max="1.5"
                step="0.005"
                value={params.line_reactance_per_km || 0.393}
                onChange={(e) =>
                  handleChange('line_reactance_per_km', parseFloat(e.target.value))
                }
              />
            </div>

            <div className="form-group">
              <label>
                <span>Simulation Window (T_total)</span>
                <span className="val-badge">{(params.total_time || 0.16).toFixed(2)} s</span>
              </label>
              <input
                type="range"
                className="scada-slider"
                min="0.08"
                max="0.40"
                step="0.02"
                value={params.total_time || 0.16}
                onChange={(e) => handleChange('total_time', parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}
      </div>

      {/* RUN SIMULATION PRIMARY CTA */}
      <button
        type="button"
        className="btn-primary"
        onClick={onRunSimulation}
        disabled={isSimulating}
      >
        {isSimulating ? (
          <>
            <span className="pill-dot simulating" />
            <span>Calculating ODE Physics...</span>
          </>
        ) : (
          <>
            <Play size={16} fill="currentColor" />
            <span>Run Simulation</span>
          </>
        )}
      </button>
    </div>
  );
}
