import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Viewer,
  Entity,
  Globe,
  Scene,
  SkyAtmosphere,
} from 'resium';
import {
  Ion,
  Cartesian3,
  Cartesian2,
  Color,
  Viewer as CesiumViewer,
  Entity as CesiumEntity,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  LabelStyle,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
} from 'cesium';
import type { ShipStatus, MissionPhase } from '../types';
import './CesiumViewer.css';

// Set Cesium Ion token from environment
const CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZWZhdWx0LXRva2VuIiwiaWQiOjEsImlhdCI6MTYwMDAwMDAwMH0.demo-token';
Ion.defaultAccessToken = CESIUM_ION_TOKEN;

// Constants
const EARTH_RADIUS_KM = 6371;
const MOON_RADIUS_KM = 1737;
const EARTH_MOON_DISTANCE_KM = 384400;

// Convert our coordinate system to Cesium Cartesian3
// Our mock data uses km with Moon at ~384400 km on X axis
function positionToCartesian(position: { x: number; y: number; z: number }, frame: 'EARTH' | 'MOON' | 'TRANSIT'): Cartesian3 {
  // Scale factor for visualization (real scale makes Moon invisible)
  const SCALE = 1; // 1:1 for now, can adjust for visibility
  
  if (frame === 'EARTH') {
    // Near Earth - use lat/lon/alt
    const altitude = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2) - EARTH_RADIUS_KM;
    const lat = Math.atan2(position.z, Math.sqrt(position.x ** 2 + position.y ** 2)) * (180 / Math.PI);
    const lon = Math.atan2(position.y, position.x) * (180 / Math.PI);
    return Cartesian3.fromDegrees(lon, lat, altitude * 1000); // Convert km to meters
  } else if (frame === 'MOON') {
    // Near Moon - offset from Moon position
    const moonCenter = Cartesian3.fromDegrees(0, 0, EARTH_MOON_DISTANCE_KM * 1000);
    const offset = new Cartesian3(
      (position.x - EARTH_MOON_DISTANCE_KM) * 1000 * SCALE,
      position.y * 1000 * SCALE,
      position.z * 1000 * SCALE
    );
    return Cartesian3.add(moonCenter, offset, new Cartesian3());
  } else {
    // Transit - interpolate between Earth and Moon
    const progress = position.x / EARTH_MOON_DISTANCE_KM;
    const lon = progress * 180 - 90; // Spread along longitude for visibility
    const lat = (position.y / 10000) * 10; // Small latitude variation
    const alt = EARTH_RADIUS_KM * 10 * 1000; // High altitude for visibility
    return Cartesian3.fromDegrees(lon, lat, alt);
  }
}

// Determine which reference frame based on ship position
function getShipFrame(position: { x: number; y: number; z: number }): 'EARTH' | 'MOON' | 'TRANSIT' {
  const distFromEarth = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
  const distFromMoon = Math.sqrt(
    (position.x - EARTH_MOON_DISTANCE_KM) ** 2 + position.y ** 2 + position.z ** 2
  );
  
  if (distFromEarth < EARTH_RADIUS_KM + 50000) return 'EARTH'; // Within 50,000 km of Earth
  if (distFromMoon < MOON_RADIUS_KM + 10000) return 'MOON';    // Within 10,000 km of Moon
  return 'TRANSIT';
}

// Get color based on health status
function getHealthColor(health: number): Color {
  switch (health) {
    case 1: return Color.fromCssColorString('#10b981'); // Nominal - green
    case 2: return Color.fromCssColorString('#f59e0b'); // Warning - amber
    case 3: return Color.fromCssColorString('#ef4444'); // Critical - red
    default: return Color.fromCssColorString('#6b7280'); // Unknown - gray
  }
}

// Get phase name for display
function getPhaseName(phase: MissionPhase): string {
  const phases: Record<number, string> = {
    1: 'Pre-Launch',
    2: 'Ascent',
    3: 'Earth Orbit',
    4: 'Transit',
    5: 'Lunar Orbit',
    6: 'Descent',
    7: 'Surface',
    8: 'Return Transit',
    9: 'Complete',
  };
  return phases[phase] || 'Unknown';
}

interface CesiumViewerProps {
  ships: ShipStatus[];
  selectedShipId: string | null;
  onShipSelect: (shipId: string | null) => void;
  isLoading: boolean;
}

type ViewPreset = 'earth' | 'moon' | 'fleet' | 'selected';

export function CesiumGlobeViewer({
  ships,
  selectedShipId,
  onShipSelect,
  isLoading,
}: CesiumViewerProps) {
  const viewerRef = useRef<CesiumViewer | null>(null);
  const [currentView, setCurrentView] = useState<ViewPreset>('earth');
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Camera presets
  const flyToEarth = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.camera.flyTo({
        destination: Cartesian3.fromDegrees(-95, 30, 25000000),
        duration: 2,
      });
      setCurrentView('earth');
    }
  }, []);

  const flyToMoon = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.camera.flyTo({
        destination: Cartesian3.fromDegrees(0, 0, EARTH_MOON_DISTANCE_KM * 1000 + 10000000),
        duration: 2,
      });
      setCurrentView('moon');
    }
  }, []);

  const flyToFleetOverview = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.camera.flyTo({
        destination: Cartesian3.fromDegrees(-45, 45, 500000000),
        duration: 2,
      });
      setCurrentView('fleet');
    }
  }, []);

  const flyToShip = useCallback((shipId: string) => {
    const ship = ships.find(s => s.shipId === shipId);
    if (ship?.position && viewerRef.current) {
      const frame = getShipFrame(ship.position);
      const cartesian = positionToCartesian(ship.position, frame);
      viewerRef.current.camera.flyTo({
        destination: Cartesian3.add(
          cartesian,
          new Cartesian3(0, 0, 5000000), // Offset camera above ship
          new Cartesian3()
        ),
        duration: 1.5,
      });
      setCurrentView('selected');
    }
  }, [ships]);

  // Handle ship selection
  const handleEntityClick = useCallback((entity: CesiumEntity | undefined) => {
    if (entity && entity.id && entity.id.startsWith('ship-')) {
      const shipId = entity.id.replace('ship-', '');
      onShipSelect(shipId);
      flyToShip(shipId);
    } else {
      onShipSelect(null);
    }
  }, [onShipSelect, flyToShip]);

  // Set up click handler
  useEffect(() => {
    if (viewerRef.current) {
      const handler = new ScreenSpaceEventHandler(viewerRef.current.scene.canvas);
      
      handler.setInputAction((movement: { position: Cartesian2 }) => {
        const picked = viewerRef.current?.scene.pick(movement.position);
        if (defined(picked) && picked.id) {
          handleEntityClick(picked.id);
        } else {
          onShipSelect(null);
        }
      }, ScreenSpaceEventType.LEFT_CLICK);

      return () => handler.destroy();
    }
  }, [handleEntityClick, onShipSelect]);

  // Fly to selected ship when selection changes
  useEffect(() => {
    if (selectedShipId) {
      flyToShip(selectedShipId);
    }
  }, [selectedShipId, flyToShip]);

  if (isLoading) {
    return (
      <div className="cesium-viewer-container loading">
        <div className="loading-spinner" />
        <span>Initializing 3D Globe...</span>
      </div>
    );
  }

  return (
    <div className="cesium-viewer-container">
      <Viewer
        ref={(ref) => {
          if (ref?.cesiumElement) {
            viewerRef.current = ref.cesiumElement;
          }
        }}
        full
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        selectionIndicator={true}
        infoBox={false}
        className="cesium-viewer"
      >
        <Scene />
        <Globe enableLighting={true} />
        <SkyAtmosphere />

        {/* Render ships as point entities */}
        {ships.map((ship) => {
          if (!ship.position) return null;
          
          const frame = getShipFrame(ship.position);
          const cartesian = positionToCartesian(ship.position, frame);
          const color = getHealthColor(ship.overallHealth);
          const isSelected = ship.shipId === selectedShipId;
          
          return (
            <Entity
              key={ship.shipId}
              id={`ship-${ship.shipId}`}
              name={ship.shipName}
              position={cartesian}
              point={{
                pixelSize: isSelected ? 16 : 12,
                color: color,
                outlineColor: isSelected ? Color.WHITE : Color.BLACK,
                outlineWidth: isSelected ? 3 : 1,
                scaleByDistance: new NearFarScalar(1e6, 1.5, 1e9, 0.5),
              }}
              label={showLabels ? {
                text: ship.shipName,
                font: '12px sans-serif',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 2,
                style: LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: VerticalOrigin.BOTTOM,
                horizontalOrigin: HorizontalOrigin.CENTER,
                pixelOffset: new Cartesian3(0, -20, 0) as any,
                scaleByDistance: new NearFarScalar(1e6, 1, 1e9, 0.3),
                distanceDisplayCondition: new DistanceDisplayCondition(0, 5e8),
              } : undefined}
              description={`
                <div style="font-family: sans-serif; padding: 8px;">
                  <h3 style="margin: 0 0 8px 0;">${ship.shipName}</h3>
                  <p><strong>ID:</strong> ${ship.shipId}</p>
                  <p><strong>Phase:</strong> ${getPhaseName(ship.phase)}</p>
                  <p><strong>AI Confidence:</strong> ${(ship.aiConfidence * 100).toFixed(1)}%</p>
                  <p><strong>Objective:</strong> ${ship.currentObjective}</p>
                </div>
              `}
            />
          );
        })}

        {/* Moon marker (simplified - actual Moon would need 3D tiles) */}
        <Entity
          id="moon-marker"
          name="Moon"
          position={Cartesian3.fromDegrees(0, 0, EARTH_MOON_DISTANCE_KM * 1000)}
          point={{
            pixelSize: 20,
            color: Color.LIGHTGRAY,
            outlineColor: Color.WHITE,
            outlineWidth: 2,
          }}
          label={{
            text: '🌙 Moon',
            font: '14px sans-serif',
            fillColor: Color.WHITE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian3(0, -25, 0) as any,
          }}
        />
      </Viewer>

      {/* View Controls Overlay */}
      <div className="view-controls">
        <div className="view-controls-header">Camera</div>
        <button
          className={`view-btn ${currentView === 'earth' ? 'active' : ''}`}
          onClick={flyToEarth}
          title="View Earth"
        >
          🌍 Earth
        </button>
        <button
          className={`view-btn ${currentView === 'moon' ? 'active' : ''}`}
          onClick={flyToMoon}
          title="View Moon"
        >
          🌙 Moon
        </button>
        <button
          className={`view-btn ${currentView === 'fleet' ? 'active' : ''}`}
          onClick={flyToFleetOverview}
          title="Fleet Overview"
        >
          🚀 Fleet
        </button>
        
        <div className="view-controls-divider" />
        
        <label className="view-toggle">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          <span>Labels</span>
        </label>
        <label className="view-toggle">
          <input
            type="checkbox"
            checked={showTrajectories}
            onChange={(e) => setShowTrajectories(e.target.checked)}
          />
          <span>Trajectories</span>
        </label>
      </div>

      {/* Ship count overlay */}
      <div className="ship-count-overlay">
        <span className="ship-count">{ships.length}</span>
        <span className="ship-label">Ships Active</span>
      </div>

      {/* Selected ship indicator */}
      {selectedShipId && (
        <div className="selected-ship-overlay">
          <span>Selected: {ships.find(s => s.shipId === selectedShipId)?.shipName || selectedShipId}</span>
          <button onClick={() => onShipSelect(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
