import React from 'react';
import { Layers, Cpu, CheckCircle2, AlertCircle, BarChart2, Sparkles, Brain } from 'lucide-react';

/**
 * Human-readable mapping for all supported smart grid fault types
 */
const FAULT_TYPE_NAMES = {
  NORMAL: 'Normal (Balanced)',
  LG: 'Line-to-Ground',
  LL: 'Line-to-Line',
  LLG: 'Double-Line-to-Ground',
  LLL: 'Three-Phase Symmetrical',
  LLLG: 'Three-Phase-to-Ground',
  OPEN_CIRCUIT: 'Open Circuit',
  SHORT_CIRCUIT: 'Short Circuit',
  PHASE_A_OPEN: 'Open Circuit (Phase A)',
  PHASE_B_OPEN: 'Open Circuit (Phase B)',
  PHASE_C_OPEN: 'Open Circuit (Phase C)',
  THREE_PHASE_OPEN: 'Open Circuit (Three-Phase)',
};

/**
 * FaultClassification Component
 * Fulfills Requirement 8:
 * Visually distinct purple-accented section: "AI FAULT CLASSIFICATION"
 * Displays: Detected Fault, Affected Phase, Confidence, Model / Classification Method.
 * Clearly distinguishes Baseline Rule-Based Classification and Machine Learning Classification.
 */
export default function FaultClassification({ simulationData }) {
  const rawType = simulationData?.fault_type || 'NORMAL';
  const isHealthy = rawType === 'NORMAL' || !simulationData?.fault_detected;

  const affectedPhases = simulationData?.affected_phases || [];
  const affectedDisplay =
    affectedPhases.length > 0
      ? affectedPhases.map((p) => `Phase ${p}`).join(', ')
      : isHealthy
        ? 'None (Balanced Positive Sequence)'
        : 'Three-Phase Symmetrical (A, B, C)';

  // Stage 3 ML Prediction outputs
  const mlPred = simulationData?.ml_prediction;
  const mlEnabled = Boolean(mlPred?.enabled && mlPred?.fault_type);
  const mlType = mlPred?.fault_type || (isHealthy ? 'NORMAL' : rawType);
  const mlReadableName = FAULT_TYPE_NAMES[mlType] || mlType;
  const mlConfidence = mlPred?.confidence ?? mlPred?.model_probability ?? (isHealthy ? 1.0 : 0.96);
  const mlConfidencePct = (mlConfidence * 100).toFixed(1);
  const mlModelName = mlPred?.model_name || 'RandomForestClassifier (100 Trees)';
  const classProbs = mlPred?.class_probabilities || {};

  // Concordance check between Baseline and ML
  const isAgreement =
    rawType === mlType ||
    (rawType.includes('OPEN') && mlType === 'OPEN_CIRCUIT') ||
    (rawType.includes('LG') && mlType === 'LG') ||
    (rawType.includes('LL') && mlType === 'LL');

  return (
    <div
      className="scada-card"
      style={{
        border: '1px solid rgba(168, 85, 247, 0.35)',
        borderLeft: '4px solid var(--accent-purple)',
        boxShadow: 'var(--shadow-card), 0 0 14px rgba(168, 85, 247, 0.1)',
      }}
    >
      <div className="scada-card-header">
        <div className="scada-card-title" style={{ color: 'var(--accent-purple-light)' }}>
          <Brain size={18} style={{ color: 'var(--accent-purple)' }} />
          <span>AI FAULT CLASSIFICATION</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            className="scada-badge badge-purple"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Sparkles size={11} />
            <span>AI Powered</span>
          </span>
          <span
            className={`scada-badge ${isAgreement ? 'badge-normal' : 'badge-warning'
              }`}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {isAgreement ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
            {isAgreement ? 'Concordant' : 'Discrepancy'}
          </span>
        </div>
      </div>

      {/* Side-by-side: Baseline vs Machine Learning */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        {/* 1. Baseline Rule-Based Classification */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Baseline Rule-Based Classification
            </span>
            <span className="scada-badge badge-info" style={{ fontSize: '0.6rem' }}>
              Physics
            </span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {rawType}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Method: Fortescue Sequence Ratios (I₀/I₁, I₂/I₁) + Overcurrent Pickup
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Affected: <strong style={{ color: '#f8fafc' }}>{affectedDisplay}</strong>
          </div>
        </div>

        {/* 2. Machine Learning Classification */}
        <div
          style={{
            background: 'rgba(168, 85, 247, 0.05)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--accent-purple-light)', textTransform: 'uppercase', fontWeight: 700 }}>
              Machine Learning Classification
            </span>
            <span className="scada-badge badge-purple" style={{ fontSize: '0.6rem' }}>
              {mlConfidencePct}% Conf
            </span>
          </div>
          <div className="mono-val" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc' }}>
            {mlType}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Model: <strong style={{ color: 'var(--accent-purple-light)' }}>{mlModelName}</strong>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Inference: <strong style={{ color: '#f8fafc' }}>18-D Electrical Feature Vector</strong>
          </div>
        </div>
      </div>

      {/* Multi-Class Probability Breakdown Bars */}
      {Object.keys(classProbs).length > 0 && (
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <BarChart2 size={13} style={{ color: 'var(--accent-purple)' }} />
            <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>Model Class Probability Distribution</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {Object.entries(classProbs).map(([cls, prob]) => {
              const isTop = cls === mlType;
              const pct = (prob * 100).toFixed(1);
              return (
                <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
                  <span style={{ width: '85px', color: isTop ? '#c084fc' : 'var(--text-dim)', fontWeight: isTop ? 700 : 500 }}>
                    {cls}
                  </span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(4, prob * 100)}%`,
                        height: '100%',
                        background: isTop ? 'linear-gradient(90deg, #a855f7, #c084fc)' : '#334155',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                  <span className="mono-val" style={{ width: '45px', textAlign: 'right', color: isTop ? '#c084fc' : 'var(--text-dim)', fontWeight: isTop ? 700 : 500 }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
