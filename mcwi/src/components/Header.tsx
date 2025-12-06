import type { FleetStatus } from '../types';
import './Header.css';

interface HeaderProps {
  fleetStatus: FleetStatus | null;
}

export function Header({ fleetStatus }: HeaderProps) {
  const criticalCount = fleetStatus?.ships.filter(s => s.overallHealth === 3).length || 0;
  const warningCount = fleetStatus?.ships.filter(s => s.overallHealth === 2).length || 0;
  const nominalCount = fleetStatus?.ships.filter(s => s.overallHealth === 1).length || 0;

  return (
    <header className="header">
      <div className="header-brand">
        <svg className="header-logo" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2"/>
          <circle cx="16" cy="16" r="4" fill="currentColor"/>
          <path d="M16 2v6M16 24v6M2 16h6M24 16h6" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <div className="header-title">
          <h1>ALLS Mission Control</h1>
          <span className="header-subtitle">Autonomous Lunar Logistics System</span>
        </div>
      </div>

      <div className="header-stats">
        <div className="stat-group">
          <span className="stat-label">Fleet</span>
          <span className="stat-value">{fleetStatus?.totalShips || '--'}</span>
        </div>

        <div className="stat-divider" />

        <div className="stat-group">
          <span className="stat-label">Status</span>
          <div className="status-counts">
            <span className="status-badge nominal" title="Nominal">
              <span className="status-indicator nominal" /> {nominalCount}
            </span>
            <span className="status-badge warning" title="Warning">
              <span className="status-indicator warning" /> {warningCount}
            </span>
            <span className="status-badge critical" title="Critical">
              <span className="status-indicator critical" /> {criticalCount}
            </span>
          </div>
        </div>

        <div className="stat-divider" />

        <div className="stat-group">
          <span className="stat-label">Alerts</span>
          <span className="stat-value">
            {fleetStatus?.alerts.filter(a => !a.acknowledged).length || 0}
          </span>
        </div>
      </div>

      <div className="header-time">
        <span className="time-label">Mission Time</span>
        <span className="time-value">
          {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
        </span>
      </div>
    </header>
  );
}
