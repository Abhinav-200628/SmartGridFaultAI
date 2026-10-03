import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StatusCards from './components/StatusCards';
import ParameterPanel from './components/ParameterPanel';
import VoltageChart from './components/VoltageChart';
import CurrentChart from './components/CurrentChart';
import FaultWaveformChart from './components/FaultWaveformChart';
import FaultDetection from './components/FaultDetection';
import FaultClassification from './components/FaultClassification';
import FaultLocalization from './components/FaultLocalization';
import TransmissionLine from './components/TransmissionLine';
import ProtectionPanel from './components/ProtectionPanel';
import EventTimeline from './components/EventTimeline';
import SymmetricalComponents from './components/SymmetricalComponents';
import Alerts from './components/Alerts';
import ComparisonView from './components/ComparisonView';
import SimulationHistory from './components/SimulationHistory';
import { checkBackendHealth, runSimulation } from './services/api';
import { exportWaveformCSV, exportIncidentReportJSON } from './services/exportService';
import { Zap, AlertTriangle, RefreshCw, Activity } from 'lucide-react';

const DEFAULT_PARAMS = {
  voltage_rms: 11000.0,
  frequency: 50.0,
  load_kw: 500.0,
  power_factor: 0.85,
  line_length_km: 50.0,
  fault_category: 'NORMAL',
  fault_type: 'NORMAL',
  fault_phase: 'A',
  fault_phase_pair: 'A-B',
  fault_distance_km: 25.0,
  fault_resistance_ohm: 1.0,
  fault_start_time: 0.04,
  fault_duration: 0.06,
  protection_delay_ms: 40.0,
  line_resistance_per_km: 0.125,
  line_reactance_per_km: 0.393,
  auto_reconfigure: false,
  total_time: 0.16,
};

export default function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [simulationData, setSimulationData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ connected: false });
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [history, setHistory] = useState([]);

  // Record a simulation run into session audit history
  const recordHistory = useCallback((data, simParams) => {
    if (!data) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const entry = {
      id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: timeStr,
      faultType: data.fault_type || (data.fault_detected ? 'SHORT_CIRCUIT' : 'NORMAL'),
      phase: data.affected_phases && data.affected_phases.length ? data.affected_phases.join(', ') : 'All',
      distance: data.fault_distance_km ?? simParams?.fault_distance_km ?? 25.0,
      estimatedDistance: data.estimated_fault_distance_km,
      breakerState: data.breaker_state || 'CLOSED',
      gridStatus: data.grid_status || 'HEALTHY',
      faultDetected: Boolean(data.fault_detected),
      params: { ...simParams },
    };
    setHistory((prev) => [entry, ...prev.slice(0, 19)]);
  }, []);

  // Check backend health on initial mount
  const checkHealth = useCallback(async () => {
    try {
      const health = await checkBackendHealth();
      setBackendStatus(health);
    } catch {
      setBackendStatus({ connected: false });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const health = await checkBackendHealth();
        if (isMounted) setBackendStatus(health);
      } catch {
        if (isMounted) setBackendStatus({ connected: false });
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Execute simulation with given parameters
  const executeSimulation = useCallback(async (simParams) => {
    setIsSimulating(true);
    setErrorMessage(null);
    try {
      const result = await runSimulation(simParams);
      if (result.success) {
        setSimulationData(result.data);
        setBackendStatus({ connected: true });
        recordHistory(result.data, simParams);
      } else {
        setErrorMessage(result.error);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Simulation network error');
    } finally {
      setIsSimulating(false);
    }
  }, [recordHistory]);

  // Changing any parameter causes a dynamic API request to update simulation results
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsSimulating(true);
      setErrorMessage(null);
      try {
        const result = await runSimulation(params);
        if (isMounted) {
          if (result.success) {
            setSimulationData(result.data);
            setBackendStatus({ connected: true });
            recordHistory(result.data, params);
          } else {
            setErrorMessage(result.error);
          }
        }
      } catch (err) {
        if (isMounted) setErrorMessage(err.message || 'Simulation network error');
      } finally {
        if (isMounted) setIsSimulating(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [params, recordHistory]);

  const handleRunSimulation = () => {
    executeSimulation(params);
  };

  const handleReset = () => {
    setParams(DEFAULT_PARAMS);
    executeSimulation(DEFAULT_PARAMS);
  };

  const handleSelectPreset = (presetParams) => {
    const merged = { ...DEFAULT_PARAMS, ...presetParams };
    setParams(merged);
    executeSimulation(merged);
  };

  return (
    <div className="scada-app">
      {/* SCADA Global Header */}
      <Header
        backendStatus={backendStatus}
        onRetryConnection={checkHealth}
        onResetSimulation={handleReset}
        onSelectPreset={handleSelectPreset}
        isSimulating={isSimulating}
        onExportCSV={() => exportWaveformCSV(simulationData)}
        onExportJSON={() => exportIncidentReportJSON(simulationData, params)}
        hasSimulationData={Boolean(simulationData)}
      />

      <div className="scada-layout">
        {/* SCADA Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="scada-content" style={{ maxHeight: 'none', overflowY: 'visible' }}>
          {/* Requirement 19: Backend Connection Error State */}
          {!backendStatus.connected && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                borderRadius: '8px',
                padding: '12px 18px',
                color: '#f87171',
                fontSize: '0.84rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                <span>
                  <strong>Backend Connection Error:</strong> Please verify that the FastAPI server is running on <code>http://127.0.0.1:8000</code>.
                </span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={checkHealth}
                style={{ padding: '3px 10px', fontSize: '0.72rem' }}
              >
                <RefreshCw size={11} /> Recheck
              </button>
            </div>
          )}

          {/* Requirement 19: Running Simulation Loading Banner */}
          {isSimulating && (
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '8px',
                padding: '10px 18px',
                color: 'var(--accent-cyan)',
                fontSize: '0.82rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span className="pill-dot simulating" />
              <span>
                <strong>Running Electrical Simulation...</strong> Calculating three-phase time-domain differential equations &amp; sequence components.
              </span>
            </div>
          )}

          {/* Simulation Error Alert (Dismissible) */}
          {errorMessage && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                padding: '12px 18px',
                color: '#f87171',
                fontSize: '0.82rem',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                <strong>Simulation Error:</strong> {errorMessage}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setErrorMessage(null)}
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 1. SCADA Status Cards (Real API metrics) */}
          <StatusCards simulationData={simulationData} />

          {/* TAB 1: DASHBOARD (Comprehensive Overview) */}
          {activeTab === 'dashboard' && (
            <div className="grid-main-2col">
              {/* Left Column: Interactive Parameter Console & System Alerts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <ParameterPanel
                  params={params}
                  onChange={setParams}
                  onRunSimulation={handleRunSimulation}
                  isSimulating={isSimulating}
                  onReset={handleReset}
                />
                <Alerts
                  simulationData={simulationData}
                  backendStatus={backendStatus}
                  errorMessage={errorMessage}
                />
                <SimulationHistory
                  history={history}
                  onSelectRun={handleSelectPreset}
                  onClearHistory={() => setHistory([])}
                />
              </div>

              {/* Right Column: Visualizers, SLD, Diagnostics, Timelines, & Charts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Transmission Line Single-Line Diagram */}
                <TransmissionLine simulationData={simulationData} />

                {/* Multi-Tabbed Fault Waveform Analyzer (Voltage, Current, Dual Y-Axis) */}
                <FaultWaveformChart simulationData={simulationData} height={380} />

                {/* Individual Three-Phase Voltage & Current Waveforms */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                  <VoltageChart simulationData={simulationData} height={280} />
                  <CurrentChart simulationData={simulationData} height={280} />
                </div>

                {/* Diagnostic Subgrid: Fault Analysis & AI Fault Classification */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                  <FaultDetection simulationData={simulationData} />
                  <FaultClassification simulationData={simulationData} />
                </div>

                {/* Diagnostic Subgrid: Fault Localization & Symmetrical Components */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                  <FaultLocalization simulationData={simulationData} />
                  <SymmetricalComponents simulationData={simulationData} />
                </div>

                {/* Diagnostic Subgrid: Protection & Automatic Switching + Event Timeline */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                  <ProtectionPanel simulationData={simulationData} />
                  <EventTimeline simulationData={simulationData} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE MONITORING */}
          {activeTab === 'live' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <TransmissionLine simulationData={simulationData} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                <VoltageChart simulationData={simulationData} height={320} />
                <CurrentChart simulationData={simulationData} height={320} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                <FaultDetection simulationData={simulationData} />
                <SymmetricalComponents simulationData={simulationData} />
              </div>
            </div>
          )}

          {/* TAB 3: FAULT ANALYSIS */}
          {activeTab === 'fault' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                <FaultClassification simulationData={simulationData} />
                <FaultDetection simulationData={simulationData} />
              </div>
              <FaultWaveformChart simulationData={simulationData} height={420} />
              <Alerts simulationData={simulationData} backendStatus={backendStatus} errorMessage={errorMessage} />
            </div>
          )}

          {/* TAB 4: FAULT LOCALIZATION */}
          {activeTab === 'localization' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <FaultLocalization simulationData={simulationData} />
              <TransmissionLine simulationData={simulationData} />
              <FaultWaveformChart simulationData={simulationData} height={360} />
            </div>
          )}

          {/* TAB: AI VS PHYSICS COMPARATIVE EVALUATION */}
          {activeTab === 'compare' && (
            <ComparisonView simulationData={simulationData} params={params} />
          )}

          {/* TAB 5: PROTECTION & SWITCHING */}
          {activeTab === 'protection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                <ProtectionPanel simulationData={simulationData} />
                <EventTimeline simulationData={simulationData} />
              </div>
              <TransmissionLine simulationData={simulationData} />
              <Alerts simulationData={simulationData} backendStatus={backendStatus} errorMessage={errorMessage} />
            </div>
          )}

          {/* TAB 6: SIMULATION CONTROLS */}
          {activeTab === 'simulation' && (
            <div className="grid-main-2col">
              <div>
                <ParameterPanel
                  params={params}
                  onChange={setParams}
                  onRunSimulation={handleRunSimulation}
                  isSimulating={isSimulating}
                  onReset={handleReset}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <FaultWaveformChart simulationData={simulationData} height={380} />
                <VoltageChart simulationData={simulationData} height={300} />
                <CurrentChart simulationData={simulationData} height={300} />
              </div>
            </div>
          )}

          {/* TAB 7: SIMULATION HISTORY */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <SimulationHistory
                history={history}
                onSelectRun={handleSelectPreset}
                onClearHistory={() => setHistory([])}
              />
            </div>
          )}

          {/* TAB 8: SYSTEM INFORMATION */}
          {activeTab === 'info' && (
            <div className="scada-card">
              <div className="scada-card-header">
                <div className="scada-card-title">
                  <span>SmartGridFaultAI — System Architecture &amp; IEEE Specifications</span>
                </div>
                <span className="scada-badge badge-normal">EEE Final-Year Capstone 2026</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '14px' }}>
                  <strong>Project Title:</strong> AI-Based Smart Grid Fault Detection, Classification, Localization &amp; Automatic Switching System
                </p>
                <p style={{ marginBottom: '14px' }}>
                  <strong>Simulation Engine:</strong> Python FastAPI physics-based three-phase time-domain solver with subtransient DC offset, line reactance impedance drop, Fortescue symmetrical components, and machine learning ensemble pipeline.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginTop: '16px' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>Phase 1 &amp; 2: Physics Engine</div>
                    <div>Complete three-phase physical AC simulation, symmetrical sequence decomposition, and reactance-based localization.</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '4px' }}>Stage 3: AI &amp; ML Models</div>
                    <div>Trained Random Forest Multi-Class Classifier and Random Forest Distance Regressor with 18 physical input features.</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>Stage 4: FLISR Automatic Switching</div>
                    <div>Sectionalizer isolation (S1/S2), breaker trip coordination (CB1), and tie-switch (TS1) service restoration.</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-purple-light)', marginBottom: '4px' }}>Stage 5: Full System Integration</div>
                    <div>SCADA Control-Room telemetry, side-by-side AI vs Physics comparison, and CSV/JSON telemetry export.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
