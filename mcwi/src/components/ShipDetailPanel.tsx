import { useEffect, useState } from 'react';
import type { ShipStatus } from '../types';
import './ShipDetailPanel.css';

interface ShipDetailPanelProps {
  shipId: string;
  onClose: () => void;
}

export function ShipDetailPanel({ shipId, onClose }: ShipDetailPanelProps) {
  const [ship, setShip] = useState<ShipStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'decisions'>('overview');

  // Mock data loading
  useEffect(() => {
    // Simulate fetching ship details
    const mockShip: ShipStatus = {
      shipId,
      shipName: `Artemis ${shipId.split('-')[1]}`,
      phase: 4,
      overallHealth: 1,
      lastTelemetryMs: Date.now() - 5000,
      currentObjective: 'Execute trans-lunar injection burn',
      aiConfidence: 0.94,
      position: { x: 150000, y: 5000, z: 2000 },
      alerts: [],
    };
    setShip(mockShip);
  }, [shipId]);

  if (!ship) {
    return (
      <div className="ship-detail-panel panel">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="ship-detail-panel panel">
      <div className="panel-header">
        <div className="ship-identity">
          <span className={`status-indicator ${getHealthClass(ship.overallHealth)}`} />
          <div>
            <h3>{ship.shipName}</h3>
            <span className="ship-id">{ship.shipId}</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onClose}>✕</button>
      </div>

      <div className="tab-bar">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'telemetry' ? 'active' : ''}`}
          onClick={() => setActiveTab('telemetry')}
        >
          Telemetry
        </button>
        <button 
          className={`tab ${activeTab === 'decisions' ? 'active' : ''}`}
          onClick={() => setActiveTab('decisions')}
        >
          AI Decisions
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Mission Phase</span>
                <span className="info-value">{getPhaseName(ship.phase)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Health Status</span>
                <span className={`info-value ${getHealthClass(ship.overallHealth)}`}>
                  {getHealthName(ship.overallHealth)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">AI Confidence</span>
                <span className="info-value">{(ship.aiConfidence * 100).toFixed(1)}%</span>
              </div>
              <div className="info-item">
                <span className="info-label">Last Telemetry</span>
                <span className="info-value">
                  {Math.round((Date.now() - ship.lastTelemetryMs) / 1000)}s ago
                </span>
              </div>
            </div>

            <div className="objective-section">
              <span className="section-label">Current Objective</span>
              <p className="objective-text">{ship.currentObjective}</p>
            </div>

            {ship.position && (
              <div className="position-section">
                <span className="section-label">Position (km)</span>
                <div className="position-grid">
                  <span>X: {ship.position.x.toLocaleString()}</span>
                  <span>Y: {ship.position.y.toLocaleString()}</span>
                  <span>Z: {ship.position.z.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="telemetry-tab">
            <p className="placeholder-text">
              Real-time telemetry graphs will appear here.
              <br />
              <small>Propellant, temperature, power, etc.</small>
            </p>
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="decisions-tab">
            <p className="placeholder-text">
              AI decision log with explanations will appear here.
              <br />
              <small>"Why did the AI do X?"</small>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getHealthClass(health: number): string {
  switch (health) {
    case 1: return 'nominal';
    case 2: return 'warning';
    case 3: return 'critical';
    default: return '';
  }
}

function getHealthName(health: number): string {
  switch (health) {
    case 1: return 'Nominal';
    case 2: return 'Degraded';
    case 3: return 'Critical';
    default: return 'Unknown';
  }
}

function getPhaseName(phase: number): string {
  const phases: Record<number, string> = {
    1: 'Pre-Launch',
    2: 'Ascent',
    3: 'Earth Orbit',
    4: 'Transit to Moon',
    5: 'Lunar Orbit',
    6: 'Descent',
    7: 'Surface Ops',
    8: 'Return Transit',
    9: 'Mission Complete',
  };
  return phases[phase] || 'Unknown';
}
