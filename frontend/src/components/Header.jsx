import React from 'react';
import { Zap, RefreshCw, FileSpreadsheet, FileText, Activity } from 'lucide-react';
import { BENCHMARK_PRESETS } from '../services/api';

export default function Header({
  backendStatus,
  onRetryConnection,
  onResetSimulation,
  onSelectPreset,
  isSimulating,
  onExportCSV,
  onExportJSON,
  hasSimulationData,
}) {
  return (
    <header className="scada-header">
      <div className="header-brand">
        <div className="brand-icon" title="Power Grid Transmission Monitor">
          <Zap size={24} />
        </div>
        <div className="header-title-box">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>SmartGridFaultAI</span>
            <span
              style={{
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}
            >
              SCADA v2.4
            </span>
          </h1>
          <p>AI-Based Smart Grid Fault Detection, Classification, Localization &amp; Automatic Switching System</p>
        </div>
      </div>

      <div className="header-status-group">
        {/* Preset benchmark selector */}
        <select
          className="scada-select"
          style={{ width: '210px', padding: '5px 8px', fontSize: '0.78rem' }}
          onChange={(e) => {
            const preset = BENCHMARK_PRESETS.find((p) => p.id === e.target.value);
            if (preset) onSelectPreset(preset.params);
          }}
          defaultValue=""
          title="Select standard IEEE standard benchmark test condition"
        >
          <option value="" disabled>
            ⚡ Select IEEE Preset...
          </option>
          {BENCHMARK_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* 1. System Online Badge */}
        <div className="status-pill">
          <span className="pill-dot online" />
          <span>System Online</span>
        </div>

        {/* 2. Backend Connectivity Status */}
        <div className="status-pill">
          {backendStatus?.connected ? (
            <>
              <span className="pill-dot online" />
              <span>Backend Connected</span>
            </>
          ) : (
            <>
              <span className="pill-dot offline" />
              <span style={{ color: '#f87171' }}>Backend Offline</span>
              <button
                type="button"
                onClick={onRetryConnection}
                className="btn-secondary"
                style={{ padding: '2px 6px', fontSize: '0.7rem', marginLeft: '4px' }}
                title="Retry connecting to FastAPI backend"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </>
          )}
        </div>

        {/* 3. Simulation Execution State */}
        <div className="status-pill">
          <span className={`pill-dot ${isSimulating ? 'simulating' : 'online'}`} />
          <span>{isSimulating ? 'Simulating...' : 'Simulation Ready'}</span>
        </div>

        {/* Reset Simulation Button */}
        <button
          type="button"
          onClick={onResetSimulation}
          className="btn-secondary"
          title="Reset to default healthy parameters"
        >
          <RefreshCw size={13} /> Reset
        </button>

        {/* Telemetry & SCADA Export Actions */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={onExportCSV}
            disabled={!hasSimulationData}
            className="btn-secondary"
            style={{
              padding: '6px 10px',
              fontSize: '0.74rem',
              opacity: hasSimulationData ? 1 : 0.4,
              cursor: hasSimulationData ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Export instantaneous voltage/current waveform samples as CSV"
          >
            <FileSpreadsheet size={13} style={{ color: '#10b981' }} />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportJSON}
            disabled={!hasSimulationData}
            className="btn-secondary"
            style={{
              padding: '6px 10px',
              fontSize: '0.74rem',
              opacity: hasSimulationData ? 1 : 0.4,
              cursor: hasSimulationData ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Export complete SCADA incident report with telemetry, AI classification, & switching history as JSON"
          >
            <FileText size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span>JSON</span>
          </button>
        </div>
      </div>
    </header>
  );
}
