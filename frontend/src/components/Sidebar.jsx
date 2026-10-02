import React from 'react';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Compass,
  ShieldCheck,
  Sliders,
  Info,
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Activity },
    { id: 'fault', label: 'Fault Analysis', icon: AlertTriangle },
    { id: 'localization', label: 'Fault Localization', icon: Compass },
    { id: 'protection', label: 'Protection & Switching', icon: ShieldCheck },
    { id: 'simulation', label: 'Simulation Controls', icon: Sliders },
    { id: 'info', label: 'System Information', icon: Info },
  ];

  return (
    <aside className="scada-sidebar">
      <div className="nav-section-title">Navigation Hub</div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          IEEE Final-Year Project
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
          EEE Capstone 2026
        </div>
      </div>
    </aside>
  );
}
