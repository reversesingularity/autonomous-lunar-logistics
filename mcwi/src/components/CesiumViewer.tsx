import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Ion,
  Cartesian3,
  Cartesian2,
  Color,
  Viewer,
  Entity,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  LabelStyle,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { ShipStatus, MissionPhase } from '../types';
import './CesiumViewer.css';

// Starship image path - use resized icon for performance
const STARSHIP_IMAGE = '/starship-icon.png';

// Set Cesium Ion token from environment
const CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN || '';
if (CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = CESIUM_ION_TOKEN;
}

// Constants
const EARTH_RADIUS_KM = 6371;
const MOON_RADIUS_KM = 1737;
const EARTH_MOON_DISTANCE_KM = 384400;

// Convert our coordinate system to Cesium Cartesian3
function positionToCartesian(position: { x: number; y: number; z: number }, frame: 'EARTH' | 'MOON' | 'TRANSIT'): Cartesian3 {
  if (frame === 'EARTH') {
    // Near Earth - use lat/lon/alt
    const altitude = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2) - EARTH_RADIUS_KM;
    const lat = Math.atan2(position.z, Math.sqrt(position.x ** 2 + position.y ** 2)) * (180 / Math.PI);
    const lon = Math.atan2(position.y, position.x) * (180 / Math.PI);
    return Cartesian3.fromDegrees(lon, lat, altitude * 1000);
  } else if (frame === 'MOON') {
    // Near Moon - offset from Moon position
    const moonCenter = Cartesian3.fromDegrees(0, 0, EARTH_MOON_DISTANCE_KM * 1000);
    const offset = new Cartesian3(
      (position.x - EARTH_MOON_DISTANCE_KM) * 1000,
      position.y * 1000,
      position.z * 1000
    );
    return Cartesian3.add(moonCenter, offset, new Cartesian3());
  } else {
    // Transit - interpolate between Earth and Moon
    const progress = position.x / EARTH_MOON_DISTANCE_KM;
    const lon = progress * 180 - 90;
    const lat = (position.y / 10000) * 10;
    const alt = EARTH_RADIUS_KM * 10 * 1000;
    return Cartesian3.fromDegrees(lon, lat, alt);
  }
}

// Determine which reference frame based on ship position
function getShipFrame(position: { x: number; y: number; z: number }): 'EARTH' | 'MOON' | 'TRANSIT' {
  const distFromEarth = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
  const distFromMoon = Math.sqrt(
    (position.x - EARTH_MOON_DISTANCE_KM) ** 2 + position.y ** 2 + position.z ** 2
  );
  
  if (distFromEarth < EARTH_RADIUS_KM + 50000) return 'EARTH';
  if (distFromMoon < MOON_RADIUS_KM + 10000) return 'MOON';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const entitiesRef = useRef<Map<string, Entity>>(new Map());
  const [currentView, setCurrentView] = useState<ViewPreset>('earth');
  const [showLabels, setShowLabels] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    try {
      const viewer = new Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        selectionIndicator: true,
        infoBox: false,
        creditContainer: document.createElement('div'), // Hide credits
      });

      // Enable lighting for realistic Earth appearance
      viewer.scene.globe.enableLighting = true;

      viewerRef.current = viewer;
      setIsInitialized(true);

      // Set initial camera position
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(-95, 30, 25000000),
        duration: 0,
      });

      // Click handler for ship selection
      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((movement: { position: Cartesian2 }) => {
        const picked = viewer.scene.pick(movement.position);
        if (defined(picked) && picked.id && picked.id.id) {
          const entityId = picked.id.id as string;
          if (entityId.startsWith('ship-')) {
            const shipId = entityId.replace('ship-', '');
            onShipSelect(shipId);
          }
        } else {
          onShipSelect(null);
        }
      }, ScreenSpaceEventType.LEFT_CLICK);

      // Cleanup
      return () => {
        handler.destroy();
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
          viewerRef.current.destroy();
        }
        viewerRef.current = null;
        setIsInitialized(false);
      };
    } catch (error) {
      console.error('Failed to initialize Cesium viewer:', error);
    }
  }, [onShipSelect]);

  // Update ship entities when ships data changes
  useEffect(() => {
    if (!viewerRef.current || !isInitialized) return;

    const viewer = viewerRef.current;
    const currentEntities = entitiesRef.current;

    // Track which ships we've seen this update
    const seenShips = new Set<string>();

    ships.forEach((ship) => {
      if (!ship.position) return;

      const entityId = `ship-${ship.shipId}`;
      seenShips.add(entityId);

      const frame = getShipFrame(ship.position);
      const cartesian = positionToCartesian(ship.position, frame);
      const color = getHealthColor(ship.overallHealth);
      const isSelected = ship.shipId === selectedShipId;

      let entity = currentEntities.get(entityId);

      if (entity) {
        // Update existing entity - remove and re-add for simplicity
        // (Cesium's property system is complex for dynamic updates)
        viewer.entities.remove(entity);
        currentEntities.delete(entityId);
        entity = undefined;
      }
      
      // Create new entity (or recreate updated one)
      if (!entity) {
        try {
          entity = viewer.entities.add({
            id: entityId,
            name: ship.shipName,
            position: cartesian,
            // Use billboard with Starship image - NO color tinting to preserve original look
            billboard: {
              image: STARSHIP_IMAGE,
              width: isSelected ? 64 : 48,
              height: isSelected ? 64 : 48,
              // Keep original image colors - don't tint
              color: Color.WHITE,
              verticalOrigin: VerticalOrigin.CENTER,
              horizontalOrigin: HorizontalOrigin.CENTER,
              scaleByDistance: new NearFarScalar(1e6, 1.5, 1e9, 0.3),
            },
            // Add a colored status indicator point below/beside the ship
            point: {
              pixelSize: isSelected ? 14 : 10,
              color: color,
              outlineColor: isSelected ? Color.WHITE : Color.BLACK,
              outlineWidth: isSelected ? 2 : 1,
              scaleByDistance: new NearFarScalar(1e6, 1.5, 1e9, 0.5),
            },
            label: showLabels ? {
              text: ship.shipName,
              font: '12px sans-serif',
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 2,
              style: LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: VerticalOrigin.TOP,
              horizontalOrigin: HorizontalOrigin.CENTER,
              pixelOffset: new Cartesian2(0, isSelected ? 40 : 30),
              scaleByDistance: new NearFarScalar(1e6, 1, 1e9, 0.3),
              distanceDisplayCondition: new DistanceDisplayCondition(0, 5e8),
              // Show health status color as background
              backgroundColor: color.withAlpha(0.7),
              backgroundPadding: new Cartesian2(6, 4),
              showBackground: true,
            } : undefined,
            description: `
              <div style="font-family: sans-serif; padding: 8px;">
                <h3 style="margin: 0 0 8px 0;">${ship.shipName}</h3>
                <p><strong>ID:</strong> ${ship.shipId}</p>
                <p><strong>Phase:</strong> ${getPhaseName(ship.phase)}</p>
                <p><strong>AI Confidence:</strong> ${(ship.aiConfidence * 100).toFixed(1)}%</p>
                <p><strong>Objective:</strong> ${ship.currentObjective}</p>
              </div>
            `,
          });
          currentEntities.set(entityId, entity);
        } catch (err) {
          console.warn(`Failed to create entity for ship ${ship.shipId}:`, err);
        }
      }
    });

    // Remove entities for ships that no longer exist
    currentEntities.forEach((entity, entityId) => {
      if (!seenShips.has(entityId) && !entityId.startsWith('marker-')) {
        viewer.entities.remove(entity);
        currentEntities.delete(entityId);
      }
    });

    // Add Moon marker if not exists
    if (!currentEntities.has('marker-moon')) {
      const moonEntity = viewer.entities.add({
        id: 'marker-moon',
        name: 'Moon',
        position: Cartesian3.fromDegrees(0, 0, EARTH_MOON_DISTANCE_KM * 1000),
        point: {
          pixelSize: 20,
          color: Color.LIGHTGRAY,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: '🌙 Moon',
          font: '14px sans-serif',
          fillColor: Color.WHITE,
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: new Cartesian2(0, -25),
        },
      });
      currentEntities.set('marker-moon', moonEntity);
    }
  }, [ships, selectedShipId, showLabels, isInitialized]);

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
          new Cartesian3(0, 0, 5000000),
          new Cartesian3()
        ),
        duration: 1.5,
      });
      setCurrentView('selected');
    }
  }, [ships]);

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
      <div ref={containerRef} className="cesium-viewer-element" />

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
