import React from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { BENCHMARK_PRESETS } from '../services/api';

export default function Header({
  backendStatus,
  onRetryConnection,
  onResetSimulation,
  onSelectPreset,
  isSimulating,
}) {
  return (
    <header className="scada-header">
      <div className="header-brand">
        <div className="brand-icon">
          <Zap size={24} />
        </div>
        <div className="header-title-box">
          <h1>AI-BASED SMART GRID FAULT DETECTION</h1>
          <p>Classification | Localization | Automatic Switching & Restoration</p>
        </div>
      </div>

      <div className="header-status-group">
        {/* Preset benchmark selector */}
        <select
          className="scada-select"
          style={{ width: '220px', padding: '5px 8px', fontSize: '0.78rem' }}
          onChange={(e) => {
            const preset = BENCHMARK_PRESETS.find((p) => p.id === e.target.value);
            if (preset) onSelectPreset(preset.params);
          }}
          defaultValue=""
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

        {/* System Online Badge */}
        <div className="status-pill">
          <span className="pill-dot online" />
          <span>System: ONLINE</span>
        </div>

        {/* Backend Connectivity Status */}
        <div className="status-pill">
          {backendStatus?.connected ? (
            <>
              <span className="pill-dot online" />
              <span>Backend: CONNECTED</span>
            </>
          ) : (
            <>
              <span className="pill-dot offline" />
              <span style={{ color: '#f87171' }}>Backend: OFFLINE</span>
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

        {/* Simulation Execution State */}
        <div className="status-pill">
          <span className={`pill-dot ${isSimulating ? 'simulating' : 'online'}`} />
          <span>{isSimulating ? 'SIMULATING...' : 'Engine: READY'}</span>
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
      </div>
    </header>
  );
}
