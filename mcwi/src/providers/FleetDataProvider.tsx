/**
 * Fleet Data Provider
 * 
 * Provides fleet data from either Supabase (when configured) or mock data.
 * Automatically detects which source to use based on environment variables.
 * 
 * @module providers/FleetDataProvider
 */

import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react';
import { useAppDispatch } from '../hooks/useRedux';
import { setFleetStatus, setLoading, setError } from '../features/fleetSlice';
import { setAlerts } from '../features/alertSlice';
import { useFleetRealtime, useAlertsRealtime, useSupabaseConnection } from '../hooks/useSupabaseRealtime';
import type { Ship } from '../lib/database.types';
import { 
  MissionPhase, 
  HealthStatus, 
  AlertSeverity, 
  type FleetStatus, 
  type ShipStatus, 
  type Alert 
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes('your-') && !key.includes('your-'));
};

const useMockData = (): boolean => {
  const envMock = import.meta.env.VITE_USE_MOCK_DATA;
  if (envMock === 'true') return true;
  if (envMock === 'false') return false;
  return !isSupabaseConfigured();
};

const useRealtime = (): boolean => {
  const envRealtime = import.meta.env.VITE_ENABLE_REALTIME;
  return envRealtime !== 'false';
};

// ============================================================================
// Helper Functions
// ============================================================================

/** Map Supabase phase number to MissionPhase enum */
function mapPhase(phase: number): MissionPhase {
  const mapping: Record<number, MissionPhase> = {
    0: MissionPhase.PHASE_UNKNOWN,
    1: MissionPhase.PHASE_PRELAUNCH,
    2: MissionPhase.PHASE_ASCENT,
    3: MissionPhase.PHASE_EARTH_ORBIT,
    4: MissionPhase.PHASE_TRANSIT,
    5: MissionPhase.PHASE_LUNAR_ORBIT,
    6: MissionPhase.PHASE_DESCENT,
    7: MissionPhase.PHASE_SURFACE,
    8: MissionPhase.PHASE_RETURN_TRANSIT,
    9: MissionPhase.PHASE_COMPLETE,
  };
  return mapping[phase] ?? MissionPhase.PHASE_UNKNOWN;
}

/** Map Supabase health number to HealthStatus enum */
function mapHealth(health: number): HealthStatus {
  const mapping: Record<number, HealthStatus> = {
    0: HealthStatus.HEALTH_UNKNOWN,
    1: HealthStatus.HEALTH_NOMINAL,
    2: HealthStatus.HEALTH_DEGRADED,
    3: HealthStatus.HEALTH_CRITICAL,
    4: HealthStatus.HEALTH_OFFLINE,
  };
  return mapping[health] ?? HealthStatus.HEALTH_UNKNOWN;
}

/** Map Supabase severity to AlertSeverity enum */
function mapSeverity(severity: number): AlertSeverity {
  const mapping: Record<number, AlertSeverity> = {
    1: AlertSeverity.SEVERITY_INFO,
    2: AlertSeverity.SEVERITY_WARNING,
    3: AlertSeverity.SEVERITY_CRITICAL,
  };
  return mapping[severity] ?? AlertSeverity.SEVERITY_INFO;
}

/** Convert Supabase ship to Redux ShipStatus */
function shipToShipStatus(ship: Ship): ShipStatus {
  return {
    shipId: ship.id,
    shipName: ship.ship_name,
    phase: mapPhase(ship.phase),
    overallHealth: mapHealth(ship.overall_health),
    lastTelemetryMs: ship.last_telemetry_ms,
    currentObjective: ship.current_objective,
    aiConfidence: Number(ship.ai_confidence),
    position: ship.position_x !== null ? {
      x: Number(ship.position_x),
      y: Number(ship.position_y ?? 0),
      z: Number(ship.position_z ?? 0),
    } : undefined,
    alerts: [],
  };
}

// ============================================================================
// Context Types
// ============================================================================

interface FleetDataContextValue {
  /** Data source being used */
  dataSource: 'supabase' | 'mock';
  /** Whether connected to real-time updates */
  isRealtimeConnected: boolean;
  /** Connection latency in ms (Supabase only) */
  latency: number | null;
  /** Refresh fleet data manually */
  refreshFleet: () => void;
  /** Refresh alerts manually */
  refreshAlerts: () => void;
}

const FleetDataContext = createContext<FleetDataContextValue | null>(null);

// ============================================================================
// Hook to use context
// ============================================================================

export function useFleetData(): FleetDataContextValue {
  const context = useContext(FleetDataContext);
  if (!context) {
    throw new Error('useFleetData must be used within a FleetDataProvider');
  }
  return context;
}

// ============================================================================
// Mock Data (fallback when Supabase not configured)
// ============================================================================

const createMockShips = (): Ship[] => [
  {
    id: '1',
    ship_name: 'Artemis-1',
    phase: 4,
    overall_health: 1,
    last_telemetry_ms: Date.now(),
    current_objective: 'Trans-lunar injection burn complete',
    ai_confidence: 0.96,
    position_x: 192200,
    position_y: 5000,
    position_z: 2000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    ship_name: 'Artemis-2',
    phase: 3,
    overall_health: 1,
    last_telemetry_ms: Date.now(),
    current_objective: 'Parking orbit established',
    ai_confidence: 0.98,
    position_x: 6771,
    position_y: 500,
    position_z: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    ship_name: 'Artemis-3',
    phase: 4,
    overall_health: 2,
    last_telemetry_ms: Date.now(),
    current_objective: 'Trajectory correction maneuver scheduled',
    ai_confidence: 0.89,
    position_x: 280000,
    position_y: -8000,
    position_z: 3000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    ship_name: 'Luna Cargo-1',
    phase: 5,
    overall_health: 1,
    last_telemetry_ms: Date.now(),
    current_objective: 'Lunar orbit insertion complete',
    ai_confidence: 0.94,
    position_x: 384400,
    position_y: 1837,
    position_z: 500,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    ship_name: 'Luna Cargo-2',
    phase: 7,
    overall_health: 1,
    last_telemetry_ms: Date.now(),
    current_objective: 'Surface operations nominal',
    ai_confidence: 0.97,
    position_x: 384500,
    position_y: 0,
    position_z: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    ship_name: 'Starship-7',
    phase: 2,
    overall_health: 1,
    last_telemetry_ms: Date.now(),
    current_objective: 'Ascent profile nominal',
    ai_confidence: 0.99,
    position_x: 6400,
    position_y: 100,
    position_z: 50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '7',
    ship_name: 'Starship-8',
    phase: 1,
    overall_health: 1,
    last_telemetry_ms: Date.now(),
    current_objective: 'Pre-launch checks in progress',
    ai_confidence: 0.95,
    position_x: 6371,
    position_y: 0,
    position_z: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '8',
    ship_name: 'Pioneer-2',
    phase: 4,
    overall_health: 3,
    last_telemetry_ms: Date.now(),
    current_objective: 'Engine anomaly detected - investigating',
    ai_confidence: 0.72,
    position_x: 150000,
    position_y: -3000,
    position_z: 1500,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const createMockAlerts = (): Alert[] => [
  {
    alertId: 'alert-1',
    shipId: '8',
    severity: AlertSeverity.SEVERITY_CRITICAL,
    message: 'Engine Underperformance: Raptor engine 2 showing 8% thrust deficit',
    timestampMs: Date.now() - 300000,
    acknowledged: false,
    subsystem: 'propulsion',
  },
  {
    alertId: 'alert-2',
    shipId: '3',
    severity: AlertSeverity.SEVERITY_WARNING,
    message: 'Trajectory Deviation: Current trajectory 0.5km off nominal - correction planned',
    timestampMs: Date.now() - 600000,
    acknowledged: false,
    subsystem: 'navigation',
  },
  {
    alertId: 'alert-3',
    shipId: '4',
    severity: AlertSeverity.SEVERITY_INFO,
    message: 'Signal Latency Warning: Earth uplink latency increased to 22 minutes',
    timestampMs: Date.now() - 900000,
    acknowledged: true,
    subsystem: 'communication',
  },
];

/** Convert ships to FleetStatus */
function createFleetStatus(ships: Ship[], alerts: Alert[]): FleetStatus {
  const shipStatuses = ships.map(shipToShipStatus);
  
  // Calculate phase breakdown
  const phaseBreakdown = {
    prelaunch: ships.filter(s => s.phase === 1).length,
    ascent: ships.filter(s => s.phase === 2).length,
    transit: ships.filter(s => s.phase === 4 || s.phase === 8).length,
    orbit: ships.filter(s => s.phase === 3 || s.phase === 5).length,
    descent: ships.filter(s => s.phase === 6).length,
    surface: ships.filter(s => s.phase === 7).length,
  };

  return {
    totalShips: ships.length,
    timestamp: new Date().toISOString(),
    ships: shipStatuses,
    alerts,
    activeNegotiations: [],
    phaseBreakdown,
  };
}

// ============================================================================
// Supabase Data Provider Component
// ============================================================================

function SupabaseDataSync({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  
  const fleetState = useFleetRealtime({ realtime: useRealtime() });
  const alertsState = useAlertsRealtime({ unacknowledgedOnly: false, realtime: useRealtime() });
  const connectionState = useSupabaseConnection();
  
  // Sync fleet data to Redux
  useEffect(() => {
    dispatch(setLoading(fleetState.loading));
    
    if (fleetState.error) {
      dispatch(setError(fleetState.error.message));
      return;
    }
    
    if (fleetState.ships.length > 0) {
      // Convert Supabase alerts to contract alerts
      const contractAlerts: Alert[] = alertsState.alerts.map(a => ({
        alertId: a.id,
        shipId: a.ship_id,
        severity: mapSeverity(a.severity),
        message: `${a.title}: ${a.description}`,
        timestampMs: new Date(a.created_at).getTime(),
        acknowledged: a.acknowledged,
        subsystem: a.category,
      }));
      
      // Create FleetStatus and dispatch
      const fleetStatus = createFleetStatus(fleetState.ships, contractAlerts);
      dispatch(setFleetStatus(fleetStatus));
      dispatch(setAlerts(contractAlerts));
    }
  }, [fleetState, alertsState.alerts, dispatch]);

  const contextValue = useMemo<FleetDataContextValue>(() => ({
    dataSource: 'supabase',
    isRealtimeConnected: fleetState.connected,
    latency: connectionState.latency,
    refreshFleet: () => { /* Handled by realtime */ },
    refreshAlerts: () => { /* Handled by realtime */ },
  }), [fleetState.connected, connectionState.latency]);

  return (
    <FleetDataContext.Provider value={contextValue}>
      {children}
    </FleetDataContext.Provider>
  );
}

// ============================================================================
// Mock Data Provider Component
// ============================================================================

function MockDataSync({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const [initialized, setInitialized] = useState(false);
  const [mockShips] = useState<Ship[]>(createMockShips);
  
  // Initialize mock data
  useEffect(() => {
    if (initialized) return;
    
    dispatch(setLoading(true));
    
    // Simulate network delay
    setTimeout(() => {
      const mockAlerts = createMockAlerts();
      const fleetStatus = createFleetStatus(mockShips, mockAlerts);
      
      dispatch(setFleetStatus(fleetStatus));
      dispatch(setAlerts(mockAlerts));
      dispatch(setLoading(false));
      setInitialized(true);
    }, 500);
  }, [dispatch, initialized, mockShips]);

  const refreshData = useCallback(() => {
    setInitialized(false);
  }, []);

  const contextValue = useMemo<FleetDataContextValue>(() => ({
    dataSource: 'mock',
    isRealtimeConnected: true,
    latency: null,
    refreshFleet: refreshData,
    refreshAlerts: refreshData,
  }), [refreshData]);

  return (
    <FleetDataContext.Provider value={contextValue}>
      {children}
    </FleetDataContext.Provider>
  );
}

// ============================================================================
// Main Provider Component
// ============================================================================

interface FleetDataProviderProps {
  children: React.ReactNode;
}

/**
 * Fleet Data Provider
 * 
 * Automatically selects between Supabase and mock data based on configuration.
 * Syncs data to Redux store and provides context for data source info.
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <Provider store={store}>
 *       <FleetDataProvider>
 *         <Dashboard />
 *       </FleetDataProvider>
 *     </Provider>
 *   );
 * }
 * ```
 */
export function FleetDataProvider({ children }: FleetDataProviderProps) {
  const shouldUseMock = useMockData();
  
  // Log which data source is being used
  useEffect(() => {
    const logLevel = import.meta.env.VITE_LOG_LEVEL || 'info';
    if (logLevel === 'debug' || logLevel === 'info') {
      console.log(`[MCWI] Data source: ${shouldUseMock ? 'mock' : 'supabase'}`);
      if (!shouldUseMock) {
        console.log(`[MCWI] Realtime: ${useRealtime() ? 'enabled' : 'disabled'}`);
      }
    }
  }, [shouldUseMock]);

  if (shouldUseMock) {
    return <MockDataSync>{children}</MockDataSync>;
  }

  return <SupabaseDataSync>{children}</SupabaseDataSync>;
}

export default FleetDataProvider;
