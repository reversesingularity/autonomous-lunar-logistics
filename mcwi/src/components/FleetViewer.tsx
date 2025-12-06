import { useState, lazy, Suspense } from 'react';
import type { ShipStatus } from '../types';
import './FleetViewer.css';

// Lazy load CesiumViewer for better initial load performance
const CesiumGlobeViewer = lazy(() => 
  import('./CesiumViewer').then(module => ({ default: module.CesiumGlobeViewer }))
);

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
  const [cesiumError, setCesiumError] = useState<Error | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Fallback UI if Cesium fails to load
  const FallbackViewer = () => (
    <div className="cesium-placeholder">
      <div className="globe-visual">
        <div className="globe-earth" />
        <div className="globe-moon" />
        <div className="trajectory-line" />
      </div>
      
      <div className="placeholder-info">
        <h3>🌍 Fleet Visualization</h3>
        {cesiumError ? (
          <>
            <p className="error-msg">3D Globe unavailable</p>
            <p className="error-detail">{cesiumError.message}</p>
          </>
        ) : (
          <p>Loading 3D Earth-Moon visualization...</p>
        )}
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
  );

  if (isLoading) {
    return (
      <div className="fleet-viewer loading">
        <div className="loading-spinner" />
        <span>Loading fleet data...</span>
      </div>
    );
  }

  // Use fallback if Cesium failed or explicitly requested
  if (useFallback || cesiumError) {
    return (
      <div className="fleet-viewer">
        <FallbackViewer />
        {cesiumError && (
          <button 
            className="retry-cesium-btn"
            onClick={() => {
              setCesiumError(null);
              setUseFallback(false);
            }}
          >
            Retry 3D Globe
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fleet-viewer">
      <Suspense fallback={<FallbackViewer />}>
        <ErrorBoundary onError={(error) => setCesiumError(error)}>
          <CesiumGlobeViewer
            ships={ships}
            selectedShipId={selectedShipId}
            onShipSelect={onShipSelect}
            isLoading={isLoading}
          />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

// Simple Error Boundary component
import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onError: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Parent will show fallback
    }
    return this.props.children;
  }
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
