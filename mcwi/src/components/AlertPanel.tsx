import type { Alert, AlertSeverity } from '../types';
import './AlertPanel.css';

interface AlertPanelProps {
  alerts: Alert[];
}

export function AlertPanel({ alerts }: AlertPanelProps) {
  const getSeverityClass = (severity: AlertSeverity): string => {
    switch (severity) {
      case 2: return 'critical';
      case 1: return 'warning';
      default: return 'info';
    }
  };

  const getSeverityLabel = (severity: AlertSeverity): string => {
    switch (severity) {
      case 2: return 'CRITICAL';
      case 1: return 'WARNING';
      default: return 'INFO';
    }
  };

  const formatTime = (timestampMs: number): string => {
    const date = new Date(timestampMs);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  // Sort alerts: unacknowledged first, then by severity, then by time
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    if (a.severity !== b.severity) return b.severity - a.severity;
    return b.timestampMs - a.timestampMs;
  });

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="alert-panel panel">
      <div className="panel-header">
        <h3>
          Alerts
          {unacknowledgedCount > 0 && (
            <span className="alert-badge">{unacknowledgedCount}</span>
          )}
        </h3>
        <button className="btn btn-ghost btn-sm">
          Clear All
        </button>
      </div>

      <div className="alert-list">
        {sortedAlerts.length === 0 ? (
          <div className="alert-empty">
            <span className="alert-empty-icon">✓</span>
            <p>No active alerts</p>
          </div>
        ) : (
          sortedAlerts.slice(0, 20).map((alert) => (
            <div 
              key={alert.alertId} 
              className={`alert-item ${getSeverityClass(alert.severity)} ${alert.acknowledged ? 'acknowledged' : ''}`}
            >
              <div className="alert-header">
                <span className={`alert-severity ${getSeverityClass(alert.severity)}`}>
                  {getSeverityLabel(alert.severity)}
                </span>
                <span className="alert-time">{formatTime(alert.timestampMs)}</span>
              </div>
              <p className="alert-message">{alert.message}</p>
              <div className="alert-meta">
                <span className="alert-ship">{alert.shipId}</span>
                {alert.subsystem && (
                  <span className="alert-subsystem">{alert.subsystem}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
