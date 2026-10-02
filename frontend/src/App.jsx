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
import { checkBackendHealth, runSimulation } from './services/api';

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
  total_time: 0.16,
};

export default function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [simulationData, setSimulationData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ connected: false });
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

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
      } else {
        setErrorMessage(result.error);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Simulation network error');
    } finally {
      setIsSimulating(false);
    }
  }, []);

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
  }, [params]);

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
      />

      <div className="scada-layout">
        {/* SCADA Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="scada-content" style={{ maxHeight: 'none', overflowY: 'visible' }}>
          {/* Error notification if backend communication failed */}
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
              </div>

              {/* Right Column: Visualizers, SLD, Diagnostics, Timelines, & Charts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Transmission Line Single-Line Diagram */}
                <TransmissionLine simulationData={simulationData} />

                {/* Multi-Tabbed Fault Waveform Analyzer (Voltage, Current, Dual Y-Axis) */}
                <FaultWaveformChart simulationData={simulationData} height={380} />

                {/* Diagnostic Subgrid: Fault Detection & Fault Classification */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  <FaultDetection simulationData={simulationData} />
                  <FaultClassification simulationData={simulationData} />
                </div>

                {/* Diagnostic Subgrid: Fault Localization & Symmetrical Components */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  <FaultLocalization simulationData={simulationData} />
                  <SymmetricalComponents simulationData={simulationData} />
                </div>

                {/* Diagnostic Subgrid: Protection Panel & Event Timeline */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  <ProtectionPanel simulationData={simulationData} />
                  <EventTimeline simulationData={simulationData} />
                </div>

                {/* Individual Three-Phase Voltage & Current Waveforms */}
                <VoltageChart simulationData={simulationData} height={300} />
                <CurrentChart simulationData={simulationData} height={300} />
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

          {/* TAB 7: SYSTEM INFORMATION */}
          {activeTab === 'info' && (
            <div className="scada-card">
              <div className="scada-card-header">
                <div className="scada-card-title">
                  <span>SmartGridFaultAI — System Architecture & IEEE Specifications</span>
                </div>
                <span className="scada-badge badge-normal">EEE Final-Year Capstone 2026</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '14px' }}>
                  <strong>Project Title:</strong> AI-Based Smart Grid Fault Detection, Classification, Localization & Automatic Switching System
                </p>
                <p style={{ marginBottom: '14px' }}>
                  <strong>Simulation Engine:</strong> Python FastAPI physics-based three-phase time-domain solver with subtransient DC offset, line reactance impedance drop, and Fortescue symmetrical components.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginTop: '16px' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>Phase 1 & 2: Physics Engine</div>
                    <div>Complete three-phase physical AC simulation, symmetrical sequence decomposition, and reactance-based localization.</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '4px' }}>Step 1: Core SCADA UI</div>
                    <div>StatusCards, ParameterPanel, VoltageChart, CurrentChart, and FaultWaveformChart.</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>Step 2: Diagnostics & Visualizers</div>
                    <div>FaultDetection, FaultClassification, FaultLocalization, TransmissionLine SLD, ProtectionPanel, EventTimeline, SymmetricalComponents, and Alerts.</div>
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
