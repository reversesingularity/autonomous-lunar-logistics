import { useEffect, useRef } from 'react';
import type { ShipStatus } from '../types';
import './FleetViewer.css';

interface FleetViewerProps {
  ships: ShipStatus[];
  selectedShipId: string | null;
  onShipSelect: (shipId: string | null) => void;
  isLoading: boolean;
}

/**
 * Fleet Visualization Component using CesiumJS
 * Shows 3D globe with ship positions and trajectories
 */
export function FleetViewer({ ships, selectedShipId, onShipSelect, isLoading }: FleetViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // CesiumJS will be initialized here once dependencies are installed
  // For now, showing a placeholder with ship list

  if (isLoading) {
    return (
      <div className="fleet-viewer loading">
        <div className="loading-spinner" />
        <span>Loading fleet data...</span>
      </div>
    );
  }

  return (
    <div className="fleet-viewer" ref={containerRef}>
      {/* Placeholder until Cesium is integrated */}
      <div className="cesium-placeholder">
        <div className="globe-visual">
          <div className="globe-earth" />
          <div className="globe-moon" />
          <div className="trajectory-line" />
        </div>
        
        <div className="placeholder-info">
          <h3>🌍 Fleet Visualization</h3>
          <p>CesiumJS 3D globe will render here</p>
          <p className="ship-count">{ships.length} ships in fleet</p>
        </div>

        {/* Mini ship list overlay */}
        <div className="ship-list-overlay">
          <h4>Active Ships</h4>
          <div className="ship-list">
            {ships.slice(0, 8).map((ship) => (
              <button
                key={ship.shipId}
                className={`ship-item ${selectedShipId === ship.shipId ? 'selected' : ''}`}
                onClick={() => onShipSelect(ship.shipId === selectedShipId ? null : ship.shipId)}
              >
                <span className={`status-indicator ${getHealthClass(ship.overallHealth)}`} />
                <span className="ship-name">{ship.shipName}</span>
                <span className="ship-phase">{getPhaseName(ship.phase)}</span>
              </button>
            ))}
            {ships.length > 8 && (
              <div className="ship-overflow">+{ships.length - 8} more</div>
            )}
          </div>
        </div>
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

function getPhaseName(phase: number): string {
  const phases: Record<number, string> = {
    1: 'Prelaunch',
    2: 'Ascent',
    3: 'Earth Orbit',
    4: 'Transit',
    5: 'Lunar Orbit',
    6: 'Descent',
    7: 'Surface',
    8: 'Return',
    9: 'Complete',
  };
  return phases[phase] || 'Unknown';
}
